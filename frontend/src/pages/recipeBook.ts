/* The INCAS recipe book: every dish cooked at an event, pinned to the country
   it came from. Seeded from the kept event records plus past editions; the
   shape (country -> dishes -> recipe) is ready to be fed by the CMS later. */

import { EDITION_RECORDS } from "./eventRecords";
import type { RecordDish } from "./eventRecords";

export type BookRecipe = {
  dish: string;
  note: string;
  recipe?: RecordDish["recipe"];
  /** Link to the event record it was cooked at, when one is kept. */
  recordId?: string;
  eventLabel: string;
};

export type BookCountry = {
  id: string;
  country: string;
  /** [longitude, latitude] for the map pin. */
  coordinates: [number, number];
  recipes: BookRecipe[];
};

function fromRecord(recordId: string, dishName: string): BookRecipe {
  const record = EDITION_RECORDS[recordId];
  const dish = record.dishes.find((entry) => entry.name === dishName)!;
  return {
    dish: dish.name,
    note: dish.note,
    recipe: dish.recipe,
    recordId,
    eventLabel: record.title,
  };
}

export const RECIPE_BOOK: BookCountry[] = [
  {
    id: "ecuador",
    country: "Ecuador",
    coordinates: [-78.47, -0.18],
    recipes: [
      fromRecord("ecuadorian-country-evening", "Llapingachos"),
      fromRecord("ecuadorian-country-evening", "Tres Leches"),
    ],
  },
  {
    id: "egypt",
    country: "Egypt",
    coordinates: [31.24, 30.05],
    recipes: [
      fromRecord("egyptian-breakfast", "Ful Medames"),
      fromRecord("egyptian-breakfast", "Ta'ameya"),
    ],
  },
  {
    id: "vietnam",
    country: "Vietnam",
    coordinates: [105.83, 21.03],
    recipes: [
      {
        dish: "Gỏi cuốn (fresh spring rolls)",
        note: "Made at the table by everyone, dipped in peanut sauce.",
        eventLabel: "Vietnamese Country Evening",
        recipe: {
          serves: "~20 rolls",
          ingredients: [
            "20 round rice paper sheets",
            "100 g rice vermicelli, cooked",
            "Cooked prawns or tofu strips",
            "Lettuce, mint, coriander, chives",
            "Peanut sauce: peanut butter, hoisin, lime, warm water",
          ],
          steps: [
            "Dip a rice paper sheet in warm water for a few seconds.",
            "Lay lettuce, noodles, herbs and prawns on the lower third.",
            "Fold the sides in and roll tightly away from you.",
            "Whisk the sauce ingredients smooth and dip generously.",
          ],
        },
      },
    ],
  },
  {
    id: "poland",
    country: "Poland",
    coordinates: [21.01, 52.23],
    recipes: [
      {
        dish: "Pierogi ruskie",
        note: "Folded by thirty people in the workshop before the presentation.",
        eventLabel: "Polish Country Evening",
        recipe: {
          serves: "~40 pierogi",
          ingredients: [
            "500 g flour, 250 ml warm water, 1 tbsp oil, pinch of salt",
            "Filling: 500 g potatoes, boiled and mashed",
            "250 g twaróg or ricotta",
            "2 onions, fried golden, plus more to serve",
          ],
          steps: [
            "Knead flour, water, oil and salt into a soft dough; rest 30 minutes.",
            "Mix the mash with the cheese and half the fried onion; season hard.",
            "Roll thin, cut circles, fill, and pinch the edges closed.",
            "Boil until they float, then serve with the rest of the onion.",
          ],
        },
      },
    ],
  },
  {
    id: "kenya",
    country: "Kenya",
    coordinates: [36.82, -1.29],
    recipes: [
      {
        dish: "Mandazi",
        note: "Lightly sweet fried dough, passed around during the photo tour.",
        eventLabel: "Kenyan Country Evening",
        recipe: {
          serves: "~24 pieces",
          ingredients: [
            "500 g flour, 80 g sugar, 2 tsp baking powder",
            "1 tsp ground cardamom",
            "200 ml coconut milk",
            "Oil for deep frying",
          ],
          steps: [
            "Mix the dry ingredients, then knead in the coconut milk to a soft dough.",
            "Rest 30 minutes, roll 1 cm thick, cut into triangles.",
            "Fry in medium-hot oil until puffed and golden on both sides.",
            "Best warm, with chai.",
          ],
        },
      },
    ],
  },
  {
    id: "turkey",
    country: "Turkey",
    coordinates: [32.85, 39.93],
    recipes: [
      {
        dish: "Menemen",
        note: "Cooked in three pans at once at the Turkish breakfast, çay on the side.",
        eventLabel: "Turkish Breakfast",
        recipe: {
          serves: "Serves 4",
          ingredients: [
            "4 tbsp olive oil, 2 green peppers, chopped",
            "4 ripe tomatoes, grated",
            "6 eggs",
            "Pul biber, salt, white cheese to finish",
          ],
          steps: [
            "Soften the peppers in the oil, add the tomatoes and cook down.",
            "Crack the eggs straight in and stir lazily off the boil.",
            "Stop while still soft; the pan keeps cooking.",
            "Finish with pul biber and crumbled cheese; eat with bread, from the pan.",
          ],
        },
      },
    ],
  },
  {
    id: "bosnia",
    country: "Bosnia & Herzegovina",
    coordinates: [18.41, 43.86],
    recipes: [
      {
        dish: "Burek",
        note: "Four countries brought four versions; the Bosnian coil won the vote.",
        eventLabel: "Balkan Breakfast",
        recipe: {
          serves: "One tray, ~8 pieces",
          ingredients: [
            "500 g yufka or filo sheets",
            "400 g minced beef or crumbled feta with spinach",
            "1 onion, grated; salt and pepper",
            "150 ml oil mixed with sparkling water for brushing",
          ],
          steps: [
            "Mix the filling and season it more than feels right.",
            "Lay filling along a sheet, roll into a rope, coil into the tray.",
            "Brush every layer with the oil and water mix.",
            "Bake at 200 °C until deep brown; rest 10 minutes under a cloth.",
          ],
        },
      },
    ],
  },
];

export const RECIPE_COUNT = RECIPE_BOOK.reduce((sum, country) => sum + country.recipes.length, 0);
