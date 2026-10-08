import type { Locale } from "../api/types";
import type { RecordDish } from "../pages/eventRecords";

/** Download a recipe as a small formatted HTML card, wiki-download style. */
export function downloadRecipeCard(
  dishName: string,
  origin: string,
  recipe: NonNullable<RecordDish["recipe"]>,
  locale: Locale = "en",
) {
  const de = locale === "de";
  const html =
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>${dishName} · ${de ? "INCAS-Rezeptkarte" : "INCAS recipe card"}</title>` +
    `<h1>${dishName}</h1><p><em>${recipe.serves} · ${de ? "gekocht bei" : "as cooked at"} ${origin}</em></p>` +
    `<h2>${de ? "Zutaten" : "Ingredients"}</h2><ul>${recipe.ingredients.map((item) => `<li>${item}</li>`).join("")}</ul>` +
    `<h2>${de ? "Schritte" : "Steps"}</h2><ol>${recipe.steps.map((step) => `<li>${step}</li>`).join("")}</ol>` +
    `<p>${de ? "Aufbewahrt vom INCAS-Team" : "Kept by the INCAS team"} · incas-aachen</p>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${dishName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-recipe.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
