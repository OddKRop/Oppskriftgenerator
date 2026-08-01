import type { GenerateRecipeInput } from "@/lib/schema/generatedRecipe";
import {
  forbidsWords,
  maxTime,
  missingIngredientsConsistent,
  usesAtLeast,
  usesUserSpelling,
  type Assertion,
  type ForbidOptions,
} from "./assertions.ts";

export type EvalCase = {
  id: string;
  description: string;
  input: GenerateRecipeInput;
  /**
   * Hva slags svar som godtas. "either" brukes der begge deler er riktig
   * oppførsel, og resultatet noteres i utskriften i stedet for å felle kjøringen.
   */
  expect: "recipe" | "clarifyingQuestion" | "either";
  assertions: Assertion[];
};

const KJØTT_OG_FISK: ForbidOptions = {
  substrings: [
    "kjøttdeig",
    "kylling",
    "biff",
    "svin",
    "bacon",
    "skinke",
    "pølse",
    "kotelett",
    "laks",
    "torsk",
    "reker",
    "tunfisk",
  ],
  // Korte ledd som ville truffet for bredt som substring: «lam» i «lammes»,
  // «okse» i «voksen», «fisk» i «fiskekaker» er ok, men «kjøtt» i «kjøttfri»
  // er det ikke.
  words: ["kjøtt", "lam", "lammekjøtt", "okse", "oksekjøtt", "fisk", "svinekjøtt"],
  allow: ["kjøttfri", "kjøttfrie", "kjøtterstatning", "vegetarpølse", "soyapølse"],
};

const MEIERI: ForbidOptions = {
  substrings: ["fløte", "rømme", "yoghurt", "kesam", "parmesan", "cheddar", "mozzarella"],
  // «melk» og «smør» som substring ville truffet mandelmelk og smørbrød;
  // «ost» ville truffet frokost. Alle tre krever derfor helt ord, og de
  // sammensatte meieriordene listes eksplisitt.
  words: [
    "melk",
    "melken",
    "helmelk",
    "lettmelk",
    "kulturmelk",
    "smør",
    "smøret",
    "meierismør",
    "ost",
    "osten",
    "kremost",
    "brunost",
    "hvitost",
    "gulost",
  ],
  allow: ["mandelmelk", "havremelk", "soyamelk", "kokosmelk", "plantemelk", "melkefri"],
};

export const cases: EvalCase[] = [
  {
    id: "hverdagsmiddag",
    description: "Vanlig middag med rikelig utvalg — skal gi oppskrift innen 40 minutter",
    input: {
      ingredients: ["kylling", "ris", "brokkoli", "soyasaus", "hvitløk"],
      allowLongerTime: false,
    },
    expect: "recipe",
    assertions: [maxTime(40), usesAtLeast(3), missingIngredientsConsistent(), usesUserSpelling()],
  },
  {
    id: "få-ingredienser",
    description: "Tynt utvalg — skal fortsatt gi oppskrift og være ærlig om hva som mangler",
    input: {
      ingredients: ["pasta", "tomat", "hvitløk"],
      allowLongerTime: false,
    },
    expect: "recipe",
    assertions: [maxTime(40), usesAtLeast(2), missingIngredientsConsistent(), usesUserSpelling()],
  },
  {
    id: "vegetar",
    description: "Vegetarpreferanse skal respekteres — ingen kjøtt eller fisk i oppskriften",
    input: {
      ingredients: ["linser", "gulrot", "løk", "hakkede tomater", "ris"],
      preferences: "vegetarisk – ingen kjøtt eller fisk",
      allowLongerTime: false,
    },
    expect: "recipe",
    assertions: [
      forbidsWords("kjøtt/fisk i vegetaroppskrift", KJØTT_OG_FISK),
      maxTime(40),
      missingIngredientsConsistent(), usesUserSpelling(),
    ],
  },
  {
    id: "melkeallergi",
    description: "Allergi er et hardere krav enn en preferanse — ingen meieriprodukter",
    input: {
      ingredients: ["hvetemel", "egg", "sukker", "havregryn", "banan"],
      preferences: "melkeallergi – ingen meieriprodukter",
      allowLongerTime: false,
    },
    expect: "recipe",
    assertions: [
      forbidsWords("meieri ved melkeallergi", MEIERI),
      missingIngredientsConsistent(), usesUserSpelling(),
    ],
  },
  {
    id: "lang-tid",
    description: "allowLongerTime åpner for langtidsretter — skal ikke presses under 40 minutter",
    input: {
      ingredients: ["oksestek", "potet", "gulrot", "løk"],
      allowLongerTime: true,
    },
    expect: "recipe",
    assertions: [usesAtLeast(3), missingIngredientsConsistent(), usesUserSpelling()],
  },
  {
    id: "vagt-input",
    description: "Én ingrediens uten kontekst — både avklaringsspørsmål og oppskrift er riktig",
    input: {
      ingredients: ["mel"],
      allowLongerTime: false,
    },
    expect: "either",
    assertions: [missingIngredientsConsistent(), usesUserSpelling()],
  },
];
