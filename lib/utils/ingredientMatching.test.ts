import assert from "node:assert/strict";
import test from "node:test";
import { preferredSpelling, userProvidedIngredient } from "./ingredientMatching.ts";

// Ingrediensen fra oppskriften er dekket av det brukeren oppga.
const DEKKET: Array<[string, string[], string]> = [
  ["banan", ["banan", "egg"], "eksakt treff"],
  ["bana", ["banan", "egg"], "skrivefeil i modellens output"],
  ["tomater", ["hakkede tomater"], "kvalifikator hos brukeren"],
  ["hakkede tomater", ["tomater"], "kvalifikator i oppskriften"],
  ["epler", ["eple"], "flertallsform"],
  ["sukker", ["sukkeret"], "bestemt form"],
  ["revet ost", ["ost"], "«revet» sier ikke hvilken vare det er"],
];

// Ikke dekket. Disse er de viktige: sier appen at brukeren har noe hen ikke
// har, mangler varen først når middagen skal lages.
const IKKE_DEKKET: Array<[string, string[], string]> = [
  ["melk", ["mel"], "ett tegn fra hverandre, men ulike varer"],
  ["mel", ["melk"], "samme andre veien"],
  ["kyllingfilet", ["kylling"], "konservativ: bare oppskrift dekkes av bruker"],
  ["tomatpuré", ["tomat"], "puré er ikke det samme som tomat"],
  ["rødløk", ["løk"], "konservativ"],
  ["fløte", ["egg", "sukker"], "ikke oppgitt i det hele tatt"],
  ["vann", ["banan"], "urelatert"],
  ["smør", [], "tom liste"],
];

test("regner ingrediensen som oppgitt av brukeren", () => {
  for (const [item, userIngredients, why] of DEKKET) {
    assert.equal(
      userProvidedIngredient(item, userIngredients),
      true,
      `«${item}» mot [${userIngredients.join(", ")}] — ${why}`
    );
  }
});

test("regner ingrediensen som manglende", () => {
  for (const [item, userIngredients, why] of IKKE_DEKKET) {
    assert.equal(
      userProvidedIngredient(item, userIngredients),
      false,
      `«${item}» mot [${userIngredients.join(", ")}] — ${why}`
    );
  }
});

// [modellens ord, brukerens liste, forventet resultat, hvorfor]
const STAVEMÅTE: Array<[string, string[], string, string]> = [
  ["bana", ["banan", "egg"], "banan", "ren skrivefeil rettes"],
  ["banan", ["banan"], "banan", "riktig fra før"],
  ["epler", ["eple"], "epler", "flertall er ikke skrivefeil"],
  ["eple", ["epler"], "eple", "samme andre veien"],
  ["tomater", ["hakkede tomater"], "tomater", "kvalifikator, ikke skrivefeil"],
  ["bana skiver", ["banan"], "bana skiver", "flerordet — bytte ville mistet «skiver»"],
  ["fløte", ["egg"], "fløte", "ingen match å rette mot"],
  ["mel", ["melk"], "mel", "ulike varer, skal ikke slås sammen"],
];

test("bruker brukerens stavemåte kun ved skrivefeil", () => {
  for (const [item, userIngredients, expected, why] of STAVEMÅTE) {
    assert.equal(
      preferredSpelling(item, userIngredients),
      expected,
      `«${item}» mot [${userIngredients.join(", ")}] — ${why}`
    );
  }
});
