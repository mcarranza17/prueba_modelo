import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { PdfGeneratorComponent } from "./pdf-generator/pdf-generator.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, PdfGeneratorComponent],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  title = "angular-pdf-generator";
}
