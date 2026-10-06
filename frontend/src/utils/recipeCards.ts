import type { RecordDish } from "../pages/eventRecords";

/** Download a recipe as a small formatted HTML card, wiki-download style. */
export function downloadRecipeCard(
  dishName: string,
  origin: string,
  recipe: NonNullable<RecordDish["recipe"]>,
) {
  const html =
    `<!doctype html><meta charset="utf-8"><title>${dishName} · INCAS recipe card</title>` +
    `<h1>${dishName}</h1><p><em>${recipe.serves} · as cooked at ${origin}</em></p>` +
    `<h2>Ingredients</h2><ul>${recipe.ingredients.map((item) => `<li>${item}</li>`).join("")}</ul>` +
    `<h2>Steps</h2><ol>${recipe.steps.map((step) => `<li>${step}</li>`).join("")}</ol>` +
    `<p>Kept by the INCAS team · incas-aachen</p>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${dishName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-recipe.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
