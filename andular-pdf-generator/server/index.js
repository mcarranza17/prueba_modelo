import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/gemini/executive-report", async (req, res) => {
  try {
    const { input } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
Eres un consultor. Genera un reporte ejecutivo en español (máx 1 página) con:
- Resumen
- KPIs clave (con interpretación)
- Riesgos principales
- Recomendaciones accionables (3 bullets)
Datos:
${JSON.stringify(input, null, 2)}
`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sin respuesta";
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(3001, () => console.log("Server on http://localhost:3001"));
