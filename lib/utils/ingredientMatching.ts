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

/**
 * Hvordan de to møttes.
 *
 * Skillet finnes fordi «typo» er den eneste varianten der modellens stavemåte
 * er direkte feil. «tokens» dekker legitime forskjeller — flertall, bestemt
 * form, kvalifikatorer — og der er modellens ord like riktig som brukerens.
 */
export type MatchKind = "exact" | "tokens" | "typo" | "none";

function matchOne(recipeItem: string, userItem: string): MatchKind {
  const recipeTokens = tokenize(recipeItem);
  const userTokens = tokenize(userItem);

  if (recipeTokens.length === 0 || userTokens.length === 0) {
    return "none";
  }

  if (normalizeIngredient(recipeItem) === normalizeIngredient(userItem)) {
    return "exact";
  }

  if (recipeTokens.join(" ") === userTokens.join(" ")) {
    return "tokens";
  }

  // Hvert ledd i oppskriftens ingrediens må gjenfinnes hos brukeren. Motsatt
  // vei gjelder ikke: brukerens «tomater» dekker ikke «tomatpuré».
  let viaTypo = false;

  for (const token of recipeTokens) {
    if (userTokens.includes(token)) {
      continue;
    }

    if (userTokens.some((candidate) => isTypoOf(candidate, token))) {
      viaTypo = true;
      continue;
    }

    return "none";
  }

  return viaTypo ? "typo" : "tokens";
}

const MATCH_RANK: Record<MatchKind, number> = { exact: 3, tokens: 2, typo: 1, none: 0 };

export type IngredientMatch = { kind: MatchKind; userItem?: string };

/** Finner den av brukerens ingredienser som dekker `recipeItem` best. */
export function matchUserIngredient(
  recipeItem: string,
  userIngredients: string[]
): IngredientMatch {
  let best: IngredientMatch = { kind: "none" };

  for (const userItem of userIngredients) {
    const kind = matchOne(recipeItem, userItem);
    if (MATCH_RANK[kind] > MATCH_RANK[best.kind]) {
      best = { kind, userItem };
      if (kind === "exact") {
        break;
      }
    }
  }

  return best;
}

/** Har brukeren oppgitt denne ingrediensen? */
export function userProvidedIngredient(
  recipeItem: string,
  userIngredients: string[]
): boolean {
  return matchUserIngredient(recipeItem, userIngredients).kind !== "none";
}

/**
 * Modellens stavemåte, eller brukerens hvis modellen skrev feil.
 *
 * Kun ved rene skrivefeil på ett enkelt ord. Er ingrediensen flerordet, kan et
 * bytte av hele teksten miste informasjon («bana skiver» → «banan»), og ved
 * bøyningsforskjeller er modellens ord like riktig som brukerens — «epler» skal
 * ikke bli «eple» bare fordi brukeren skrev entall.
 */
export function preferredSpelling(recipeItem: string, userIngredients: string[]): string {
  const match = matchUserIngredient(recipeItem, userIngredients);

  if (match.kind !== "typo" || !match.userItem) {
    return recipeItem;
  }

  if (tokenize(recipeItem).length !== 1 || tokenize(match.userItem).length !== 1) {
    return recipeItem;
  }

  const recipeWord = normalizeIngredient(recipeItem);
  const userWord = normalizeIngredient(match.userItem);

  if (looksLikeInflection(recipeWord, userWord)) {
    return recipeItem;
  }

  return userWord;
}

// Maks antall tegn et ord i steget kan ha utover ingrediensen for å regnes som
// samme vare. To–tre tegn dekker norske endelser uten å nå andre ord.
const MAX_INFLECTION_TAIL = 3;
const MIN_PREFIX_LENGTH = 3;

/**
 * «risen» inneholder «ris», men stammen er for kort til at endelsen strippes,
 * og avstanden er to tegn. Prefiks-regelen fanger den uten å løsne på
 * matchingen ellers — og siden norske endelser henger bakpå, treffer den ikke
 * «løk» inni «hvitløken», som en ren substring-sjekk ville gjort.
 *
 * Brukes kun til visning i kokemodus. Den er for løs til å avgjøre hva
 * brukeren mangler.
 */
function hasInflectedPrefix(stepToken: string, itemToken: string): boolean {
  return (
    itemToken.length >= MIN_PREFIX_LENGTH &&
    stepToken.startsWith(itemToken) &&
    stepToken.length - itemToken.length <= MAX_INFLECTION_TAIL
  );
}

/**
 * Hvilke av oppskriftens ingredienser som nevnes i en steg-tekst.
 *
 * Kokemodus viser «du trenger nå» per steg, men datamodellen kobler ikke steg
 * til ingredienser. I stedet leter vi opp igjen ingrediensnavnene i teksten.
 * Stemmingen gjør at «hvitløken» i steget treffer «hvitløk» i lista.
 *
 * Bevisst upresist: finner den ingenting, returneres tom liste og linja skjules
 * heller enn å gjette. Et steg som «kok risen etter anvisningen» treffer «ris»,
 * mens «smak til» ikke treffer noe — og det er riktig.
 */
export function ingredientsMentionedIn(
  stepText: string,
  ingredientItems: string[]
): string[] {
  const stepTokens = tokenize(stepText);

  if (stepTokens.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const mentioned: string[] = [];

  for (const item of ingredientItems) {
    const itemTokens = tokenize(item);
    if (itemTokens.length === 0) {
      continue;
    }

    const allPresent = itemTokens.every((token) =>
      stepTokens.some(
        (candidate) =>
          candidate === token || isTypoOf(candidate, token) || hasInflectedPrefix(candidate, token)
      )
    );

    const key = normalizeIngredient(item);
    if (allPresent && !seen.has(key)) {
      seen.add(key);
      mentioned.push(item);
    }
  }

  return mentioned;
}

// Endelser som gjør et ord til en bøyningsform av det andre.
const INFLECTION_ENDINGS = ["r", "er", "e", "en", "et", "a", "ne", "ene", "ane"];

/**
 * Skiller bøyning fra skrivefeil når stemmeren ikke rakk det.
 *
 * «eple» og «epler» skiller seg med ett tegn, akkurat som «bana» og «banan»,
 * så avstanden alene sier ingenting. Forskjellen er hva som er lagt til:
 * «epler» = «eple» + r, en gyldig flertallsendelse, mens «banan» = «bana» + n
 * ikke er noen bøyning — da er det kortere ordet en skrivefeil.
 */
function looksLikeInflection(a: string, b: string): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];

  return (
    longer.startsWith(shorter) && INFLECTION_ENDINGS.includes(longer.slice(shorter.length))
  );
}
