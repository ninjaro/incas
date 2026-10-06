/* After-the-event records ("Protokoll"): what an edition was like, kept so people
   can come back to it — photos, the run of the evening, the food with recipes,
   and the slides or documents the team held on to.

   Demo content for now. The shape maps 1:1 onto a future CMS block on the event
   post (photos[], protocol[], dishes[], documents[]), so wiring it to the
   backend later is a data change, not a redesign. */

export type RecordPhoto = { src: string; caption: string };
export type RecordStep = { time: string; what: string };
export type RecordDish = {
  name: string;
  note: string;
  recipe?: { serves: string; ingredients: string[]; steps: string[] };
};
export type Slide = {
  kicker?: string;
  title: string;
  lines?: string[];
  image?: string;
  tone?: "olive" | "orange" | "cream";
};
export type RecordDoc = {
  title: string;
  type: "Slides" | "PDF" | "Playlist" | "List";
  info: string;
  /** When present, the document opens in the slide viewer. */
  slides?: Slide[];
};

export type EditionRecord = {
  id: string;
  formatKey: string;
  title: string;
  date: string;
  meta: string;
  intro: string;
  photos: RecordPhoto[];
  protocol: RecordStep[];
  dishes: RecordDish[];
  documents: RecordDoc[];
};

export const EDITION_RECORDS: Record<string, EditionRecord> = {
  "ecuadorian-country-evening": {
    id: "ecuadorian-country-evening",
    formatKey: "country-evening",
    title: "Ecuadorian Country Evening",
    date: "Tue · Jun 16, 2026",
    meta: "30 spots · full",
    intro:
      "Four students from Quito and Guayaquil cooked for thirty, walked us from the Andes to the Galápagos in pictures, and finished the night teaching everyone a bomba step.",
    photos: [
      { src: "/static/img/site/country-evening.jpg", caption: "the long table, second helping" },
      { src: "/static/img/site/international-tuesday.jpg", caption: "quiz round between courses" },
      { src: "/static/img/site/about-team.jpg", caption: "the cooking crew takes a bow" },
    ],
    protocol: [
      { time: "7:00 PM", what: "Doors open, Ecuadorian playlist on, map of Ecuador pinned to the board" },
      { time: "7:20 PM", what: "Presentation: from the Andes to the Pacific, 24 slides and two volcano stories" },
      { time: "8:00 PM", what: "Food is served: llapingachos, encebollado, and tres leches for dessert" },
      { time: "9:00 PM", what: "Country quiz, winning table gets the leftover tres leches" },
      { time: "9:30 PM", what: "Bomba dance crash course, everyone on their feet" },
    ],
    dishes: [
      {
        name: "Llapingachos",
        note: "Fried potato cakes with cheese, the evening's favourite.",
        recipe: {
          serves: "Serves 6",
          ingredients: [
            "1 kg floury potatoes, boiled and mashed",
            "1 small onion, finely chopped and softened in butter",
            "150 g grated cheese (queso fresco or mozzarella)",
            "Salt, achiote or paprika",
          ],
          steps: [
            "Mix the mash with the onion, season, and let it cool.",
            "Form palm-sized patties and press a spoon of cheese into the middle of each.",
            "Rest 30 minutes in the fridge so they hold together.",
            "Fry in a hot pan until both sides are deeply golden.",
          ],
        },
      },
      {
        name: "Encebollado",
        note: "Fish and yuca soup with pickled onion, the classic hangover cure.",
      },
      {
        name: "Tres Leches",
        note: "Sponge cake soaked in three kinds of milk.",
        recipe: {
          serves: "One tray, ~12 pieces",
          ingredients: [
            "1 sponge cake (baked or bought)",
            "1 can condensed milk",
            "1 can evaporated milk",
            "250 ml cream, plus whipped cream to top",
          ],
          steps: [
            "Whisk the three milks together.",
            "Poke the cooled sponge all over and pour the milk mix slowly on top.",
            "Chill at least 4 hours, ideally overnight.",
            "Top with whipped cream and cinnamon before serving.",
          ],
        },
      },
    ],
    documents: [
      {
        title: "Ecuador — from the Andes to the Pacific",
        type: "Slides",
        info: "5 of 24 slides kept as a taster",
        slides: [
          {
            tone: "olive",
            kicker: "Country Evening · Jun 16",
            title: "Ecuador",
            lines: ["From the Andes to the Pacific", "Presented by Camila, Diego, Valeria & Mateo"],
          },
          {
            kicker: "Where we are from",
            title: "Four regions, one country",
            lines: [
              "La Costa: beaches, banana ports, encebollado",
              "La Sierra: Quito at 2,850 m, volcano views",
              "La Amazonía: a third of the country is rainforest",
              "Galápagos: the islands Darwin made famous",
            ],
            image: "/static/img/site/international-weekend.jpg",
          },
          {
            kicker: "What you just ate",
            title: "Tonight's menu",
            lines: [
              "Llapingachos: potato cakes with cheese",
              "Encebollado: fish soup, the national cure",
              "Tres leches: cake soaked in three milks",
            ],
            image: "/static/img/site/country-evening.jpg",
          },
          {
            tone: "orange",
            kicker: "Listen",
            title: "Pasillo, bomba, cumbia",
            lines: ["The playlist is on the record page", "Bomba crash course after dessert"],
          },
          {
            tone: "olive",
            kicker: "Gracias",
            title: "Come find us at Café Lingua",
            lines: ["Spanish table, every month", "Ask us anything about Ecuador"],
          },
        ],
      },
      { title: "Evening playlist", type: "Playlist", info: "34 songs · cumbia to pasillo" },
    ],
  },
  "egyptian-breakfast": {
    id: "egyptian-breakfast",
    formatKey: "international-breakfast",
    title: "Egyptian Breakfast",
    date: "Sat · Jun 27, 2026",
    meta: "40 spots · 2 €",
    intro:
      "A Saturday-morning table full of ful, ta'ameya and sweet tea, with a short photo tour of Cairo between the first and second pot of coffee.",
    photos: [
      { src: "/static/img/site/international-breakfast.jpg", caption: "the buffet before the doors opened" },
      { src: "/static/img/site/cafe-lingua.jpg", caption: "slow morning, long conversations" },
    ],
    protocol: [
      { time: "9:00 AM", what: "Kitchen crew starts: ful on the stove, ta'ameya mix resting" },
      { time: "10:00 AM", what: "Doors open, mint tea and karkadeh poured" },
      { time: "10:45 AM", what: "Photo tour: Cairo, Alexandria, and the White Desert" },
      { time: "12:00 PM", what: "Recipe cards handed out, kitchen opens for questions" },
    ],
    dishes: [
      {
        name: "Ful Medames",
        note: "Slow-stewed fava beans with cumin, lemon and olive oil.",
        recipe: {
          serves: "Serves 8",
          ingredients: [
            "2 cans fava beans (or 400 g dried, soaked overnight)",
            "3 cloves garlic, crushed",
            "1 tsp ground cumin",
            "Juice of 2 lemons, good olive oil",
            "Tomato, parsley and onion to top",
          ],
          steps: [
            "Warm the beans in their liquid, then mash roughly.",
            "Stir in garlic, cumin and lemon juice; season well.",
            "Serve with a deep pool of olive oil and the chopped toppings.",
            "Eat with warm baladi or pita bread.",
          ],
        },
      },
      {
        name: "Ta'ameya",
        note: "Egyptian falafel, made from fava beans and lots of herbs.",
        recipe: {
          serves: "~25 pieces",
          ingredients: [
            "500 g dried split fava beans, soaked overnight",
            "1 bunch each parsley, coriander, dill",
            "1 onion, 4 cloves garlic",
            "1 tsp cumin, 1 tsp coriander seed, sesame to coat",
          ],
          steps: [
            "Blend the drained beans with the herbs, onion, garlic and spices to a coarse green paste.",
            "Rest 30 minutes, then form small patties and press sesame onto both sides.",
            "Fry in hot oil until dark brown and crisp.",
            "Serve in bread with tahina and salad.",
          ],
        },
      },
    ],
    documents: [
      {
        title: "Egypt in 40 photos",
        type: "Slides",
        info: "4 of 40 slides kept as a taster",
        slides: [
          {
            tone: "orange",
            kicker: "International Breakfast · Jun 27",
            title: "صباح الخير — Good morning, Egypt",
            lines: ["A photo tour between the first and second coffee"],
          },
          {
            kicker: "Cairo",
            title: "The city that never whispers",
            lines: ["22 million neighbours", "Breakfast of champions: ful from a street cart"],
            image: "/static/img/site/international-breakfast.jpg",
          },
          {
            kicker: "On the table",
            title: "What a breakfast table holds",
            lines: [
              "Ful medames, ta'ameya, baladi bread",
              "White cheese, tomatoes, mint tea, karkadeh",
              "Recipes on the record page, take them home",
            ],
            image: "/static/img/site/cafe-lingua.jpg",
          },
          {
            tone: "olive",
            kicker: "شكرا",
            title: "Shukran for coming",
            lines: ["Next breakfast: last Saturday of the month", "Bring a friend and an empty stomach"],
          },
        ],
      },
    ],
  },
  lille: {
    id: "lille",
    formatKey: "weekend-trip",
    title: "Day trip to Lille",
    date: "Sat · Jun 6, 2026",
    meta: "54 seats · 28 €",
    intro:
      "Sold out the evening registration opened. Old town walk in the morning, free afternoon in braderie weather, and one train almost missed on the way back.",
    photos: [
      { src: "/static/img/site/international-weekend.jpg", caption: "the group at Grand Place" },
      { src: "/static/img/site/language-tandem.jpg", caption: "coffee stop, Vieux-Lille" },
    ],
    protocol: [
      { time: "9:00 AM", what: "Meet at Aachen Hauptbahnhof, headcount, tickets handed out" },
      { time: "11:30 AM", what: "Arrival, guided walk: Grand Place, Vieille Bourse, cathedral" },
      { time: "1:30 PM", what: "Free time in groups, merveilleux strongly recommended" },
      { time: "6:15 PM", what: "Meet at the station, second headcount, one sprint, all aboard" },
    ],
    dishes: [],
    documents: [
      { title: "Lille day plan", type: "PDF", info: "route, meeting points, emergency numbers" },
      { title: "Trip photo set", type: "Slides", info: "48 photos from the group" },
    ],
  },
};

/** Records grouped by archive format, in display order. */
export function recordsFor(formatKey: string): EditionRecord[] {
  return Object.values(EDITION_RECORDS).filter((record) => record.formatKey === formatKey);
}
