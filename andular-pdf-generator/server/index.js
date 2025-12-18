import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/ping", (req, res) => res.json({ ok: true }));

function buildExecutiveInput(feed) {
  const ctx = feed?.report_context ?? {};
  const totals = ctx?.totals ?? {};
  const bySev = totals?.by_severity ?? {};

  const highlights = Array.isArray(feed?.highlights) ? feed.highlights : [];

  // Ordena por severidad (high>medium>low) y por fecha desc
  const sevRank = { high: 3, medium: 2, low: 1 };
  const topEvents = highlights
    .slice()
    .sort((a, b) => {
      const s = (sevRank[b?.severity] ?? 0) - (sevRank[a?.severity] ?? 0);
      if (s !== 0) return s;
      return new Date(b?.occurredAt ?? 0) - new Date(a?.occurredAt ?? 0);
    })
    .slice(0, 10)
    .map((h) => ({
      name: h?.name,
      severity: h?.severity,
      occurredAt: h?.occurredAt,
      category: h?.category,
      product: h?.product,
      user: h?.user,
      device: h?.device,
      os: h?.os,
      status: h?.status,
      mitre: h?.mitre,
      description: h?.description?.slice?.(0, 240) ?? h?.description,
    }));

  return {
    period: { from: ctx?.from, to: ctx?.to },
    totals: {
      total: totals?.total ?? highlights.length,
      by_severity: {
        high: bySev?.high ?? 0,
        medium: bySev?.medium ?? 0,
        low: bySev?.low ?? 0,
      },
    },
    top_groups: ctx?.top_groups ?? {},
    top_events: topEvents,
    notes:
      "Los datos están resumidos; si falta un campo, indícalo como 'No disponible'.",
  };
}

async function callGemini({ model, apiKey, prompt, signal }) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        // 🔧 Ajusta aquí si quieres aún más largo
        maxOutputTokens: 3072,
        temperature: 0.4,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { ok: false, status: response.status, data };
  }

  const finishReason = data?.candidates?.[0]?.finishReason ?? "UNKNOWN";
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      ?.filter(Boolean)
      ?.join("\n")
      ?.trim() ?? "";

  return { ok: true, finishReason, text, data };
}

app.post("/api/gemini/executive-report", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing GEMINI_API_KEY",
        hint: "Crea server/.env con GEMINI_API_KEY=... y reinicia el servidor",
      });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const feed = req.body;
    const executiveInput = buildExecutiveInput(feed);

    const basePrompt = `
Eres un analista senior de ciberseguridad. Redacta un **REPORTE EJECUTIVO** en español para Dirección.

REQUISITOS:
- Formato: Markdown.
- Longitud objetivo: 700 a 1200 palabras.
- Escribe de forma coherente y completa: **NO cortes frases**.
- Si algún dato no existe, escribe "No disponible" (no inventes).

ESTRUCTURA OBLIGATORIA:
1) Resumen Ejecutivo (5-7 bullets)
2) Panorama del período (fechas, total de alertas, distribución por severidad)
3) Hallazgos clave (mínimo 6; prioriza alta/media)
4) Eventos críticos destacados (máximo 3, bien explicados)
5) Riesgos principales (3-5 bullets)
6) Recomendaciones accionables (mínimo 8, con prioridad Alta/Media/Baja)
7) Próximos pasos (3-5 bullets)
8) Anexo: tabla con 10 eventos relevantes (Nombre | Severidad | Fecha | Usuario/Dispositivo | Categoría)

DATOS RESUMIDOS (JSON):
${JSON.stringify(executiveInput, null, 2)}
`.trim();

    // ⏱️ Un solo timeout para todo (incluye continuaciones)
    const controller = new AbortController();
    const totalTimeoutMs = 45000;
    const t = setTimeout(() => controller.abort(), totalTimeoutMs);

    let report = "";
    let finishReason = "UNKNOWN";
    let parts = 0;

    // 1) Primera parte
    const r1 = await callGemini({
      model,
      apiKey,
      prompt: basePrompt,
      signal: controller.signal,
    });

    if (!r1.ok) {
      clearTimeout(t);
      console.log("Gemini API error:", r1.data);
      return res.status(r1.status).json({
        error: "Gemini API error",
        status: r1.status,
        details: r1.data,
      });
    }

    report += r1.text;
    finishReason = r1.finishReason;
    parts += 1;

    console.log("[Gemini] finishReason(part 1):", finishReason);

    // 2) Continuaciones si se cortó por tokens
    const maxContinues = 2; // total 3 partes
    let i = 0;

    while (finishReason === "MAX_TOKENS" && i < maxContinues) {
      i++;

      const continuePrompt = `
Continúa EXACTAMENTE el reporte anterior donde se cortó.
- No repitas contenido ya escrito.
- Mantén el mismo estilo y formato Markdown.
- Termina frases y completa secciones pendientes.
Reporte hasta ahora:
${report}
`.trim();

      const rn = await callGemini({
        model,
        apiKey,
        prompt: continuePrompt,
        signal: controller.signal,
      });

      if (!rn.ok) {
        clearTimeout(t);
        console.log("Gemini API error (continue):", rn.data);
        return res.status(rn.status).json({
          error: "Gemini API error (continue)",
          status: rn.status,
          details: rn.data,
        });
      }

      report += "\n\n" + rn.text;
      finishReason = rn.finishReason;
      parts += 1;

      console.log(`[Gemini] finishReason(part ${parts}):`, finishReason);
    }

    clearTimeout(t);

    // Si aún se corta, igual devolvemos lo que hay, pero avisamos
    return res.json({
      report: report.trim(),
      finishReason,
      parts,
      truncated: finishReason === "MAX_TOKENS",
    });
  } catch (err) {
    const isAbort = String(err).includes("AbortError");
    console.error("Backend error:", err);

    return res.status(isAbort ? 504 : 500).json({
      error: isAbort ? "Gemini request timed out" : "Backend error",
      details: String(err),
    });
  }
});

app.listen(3001, () => {
  console.log("Gemini proxy running on http://localhost:3001");
  console.log("Try: http://localhost:3001/api/ping");
});
