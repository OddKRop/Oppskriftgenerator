/**
 * Avgjør om en ingrediens i oppskriften er noe brukeren allerede har oppgitt.
 *
 * Ren strengsammenligning er for streng: modellen skriver «tomater» der
 * brukeren skrev «hakkede tomater», og en skrivefeil som «bana» for «banan»
 * gjør at en vare brukeren faktisk har blir ført opp som manglende.
 *
 * Sjekken er bevisst asymmetrisk og konservativ. Å felle en vare brukeren har
 * som manglende er irriterende; å påstå at brukeren har noe hen ikke har er
 * verre — da mangler varen først når middagen skal lages. Derfor godtas kun
 * treff der oppskriftens ingrediens er dekket av brukerens, aldri motsatt:
 * «kyllingfilet» regnes ikke som dekket av «kylling».
 */

// Ordformer som ikke sier noe om hvilken vare det er. Fjernes før
// sammenligningen, slik at «hakkede tomater» og «tomater» møtes.
const QUALIFIERS = new Set([
  "fersk",
  "ferske",
  "frossen",
  "frosne",
  "tørket",
  "tørkede",
  "hakket",
  "hakkede",
  "finhakket",
  "revet",
  "malt",
  "kokt",
  "stekt",
  "grovhakket",
  "oppskåret",
  "skivet",
  "ca",
]);

// Norske fleksjonsendelser. Stammen må bli stående på minst fire tegn, ellers
// blir korte ord som «eple» kuttet til noe som kolliderer med andre varer.
const SUFFIXES = ["ene", "ane", "er", "en", "et", "a", "e"];
const MIN_STEM_LENGTH = 4;

// To passeringer tar «sukkeret» → «sukker» → «sukk». Flere gir ingen gevinst
// og øker sjansen for at to ulike varer ender på samme stamme.
const MAX_STEM_PASSES = 2;

// Skrivefeil godtas kun for ord av en viss lengde. «mel» og «melk» skiller seg
// med ett tegn og er to forskjellige varer — lengdekravet holder dem adskilt.
const MIN_FUZZY_LENGTH = 5;

export function normalizeIngredient(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stem(word: string): string {
  let current = word;

  for (let pass = 0; pass < MAX_STEM_PASSES; pass++) {
    const suffix = SUFFIXES.find(
      (candidate) =>
        current.endsWith(candidate) && current.length - candidate.length >= MIN_STEM_LENGTH
    );

    if (!suffix) {
      break;
    }

    current = current.slice(0, -suffix.length);
  }

  return current;
}

function tokenize(value: string): string[] {
  return normalizeIngredient(value)
    .split(/[^a-zæøå0-9]+/i)
    .filter((token) => token.length > 0 && !QUALIFIERS.has(token))
    .map(stem);
}

/** Levenshtein-avstand, men gir opp så snart den passerer `limit`. */
function withinDistance(a: string, b: string, limit: number): boolean {
  if (Math.abs(a.length - b.length) > limit) {
    return false;
  }

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowBest = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
      current.push(value);
      rowBest = Math.min(rowBest, value);
    }

    if (rowBest > limit) {
      return false;
    }

    previous = current;
  }

  return previous[b.length] <= limit;
}

function isTypoOf(a: string, b: string): boolean {
  return Math.max(a.length, b.length) >= MIN_FUZZY_LENGTH && withinDistance(a, b, 1);
}

/** Er `recipeItem` dekket av den ene ingrediensen `userItem`? */
function coveredBy(recipeItem: string, userItem: string): boolean {
  const recipeTokens = tokenize(recipeItem);
  const userTokens = tokenize(userItem);

  if (recipeTokens.length === 0 || userTokens.length === 0) {
    return false;
  }

  if (recipeTokens.join(" ") === userTokens.join(" ")) {
    return true;
  }

  // Hvert ledd i oppskriftens ingrediens må gjenfinnes hos brukeren. Motsatt
  // vei gjelder ikke: brukerens «tomater» dekker ikke «tomatpuré».
  return recipeTokens.every((token) =>
    userTokens.some((candidate) => candidate === token || isTypoOf(candidate, token))
  );
}

/** Har brukeren oppgitt denne ingrediensen? */
export function userProvidedIngredient(
  recipeItem: string,
  userIngredients: string[]
): boolean {
  return userIngredients.some((userItem) => coveredBy(recipeItem, userItem));
}
