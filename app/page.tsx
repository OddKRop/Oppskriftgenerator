"use client";

import CookMode from "@/components/CookMode";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import SectionLabel from "@/components/SectionLabel";
import TabBar from "@/components/TabBar";
import {
  getFavoriteRecipeById,
  isRecipeFavorited,
  removeFavoriteRecipe,
  upsertFavoriteRecipe,
} from "@/lib/favorites/favoritesStorage";
import type { GeneratedRecipe } from "@/lib/schema/generatedRecipe";
import { useEffect, useMemo, useState } from "react";

/**
 * «Rammer» i designet. Bare tidsrammen finnes som eget API-felt; de øvrige
 * settes sammen til `preferences`-strengen sammen med fritekstfeltet, siden
 * modellen leser den som vanlig norsk.
 */
const PREFERENCE_CHIPS = [
  { label: "Uten meieri", preference: "uten meieriprodukter" },
  { label: "Middag", preference: "middagsrett" },
  { label: "Barnevennlig", preference: "barnevennlig" },
] as const;

type View = "input" | "result" | "cook";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export default function Home() {
  const [view, setView] = useState<View>("input");

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [underForty, setUnderForty] = useState(true);
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [preferencesText, setPreferencesText] = useState("");

  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [clarifyingQuestion, setClarifyingQuestion] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [cookStep, setCookStep] = useState(0);
  const [isCurrentRecipeFavorited, setIsCurrentRecipeFavorited] = useState(false);

  const preferences = useMemo(() => {
    const fromChips = PREFERENCE_CHIPS.filter((chip) => activeChips.includes(chip.label)).map(
      (chip) => chip.preference
    );

    return [...fromChips, preferencesText.trim()].filter(Boolean).join(", ");
  }, [activeChips, preferencesText]);

  const addIngredient = (value: string) => {
    const name = value.trim().toLowerCase();
    if (!name) return;
    setIngredients((current) => (current.includes(name) ? current : [...current, name]));
    setDraft("");
  };

  const removeIngredient = (name: string) => {
    setIngredients((current) => current.filter((item) => item !== name));
  };

  const toggleChip = (label: string) => {
    setActiveChips((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );
  };

  const generateRecipe = async () => {
    // Knappen er allerede deaktivert uten ingredienser; dette fanger kall fra
    // «Gi meg et annet forslag» hvis lista skulle bli tømt i mellomtiden.
    if (ingredients.length === 0) {
      setView("input");
      return;
    }

    setIsLoading(true);
    setRecipeError(null);
    setClarifyingQuestion(null);
    setChecked({});
    setCookStep(0);
    setView("result");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          preferences: preferences || undefined,
          allowLongerTime: !underForty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          setRecipeError("Ugyldig forespørsel. Sjekk feltene og prøv igjen.");
        } else if (response.status === 429) {
          setRecipeError("For mange forespørsler akkurat nå. Vent litt og prøv igjen.");
        } else {
          setRecipeError("Kunne ikke generere oppskrift nå. Prøv igjen.");
        }
        return;
      }

      if (typeof data.clarifyingQuestion === "string" && data.clarifyingQuestion.trim().length > 0) {
        // Brukeren må endre input for å komme videre, så vi sender dem tilbake
        // dit framfor å vise spørsmålet på en skjerm de ikke kan svare på.
        setRecipe(null);
        setAssumptions([]);
        setClarifyingQuestion(data.clarifyingQuestion);
        setView("input");
        return;
      }

      if (!data.recipe) {
        setRecipeError("Uventet svar fra AI. Prøv igjen.");
        setRecipe(null);
        setAssumptions([]);
        return;
      }

      setRecipe(data.recipe as GeneratedRecipe);
      setAssumptions(Array.isArray(data.assumptions) ? data.assumptions : []);
    } catch {
      setRecipeError("Nettverksfeil under generering. Prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMissingIngredients = async () => {
    if (!recipe || recipe.missingIngredients.length === 0) return;

    const lines = recipe.missingIngredients
      .slice(0, 5)
      .map((item) => (item.reason ? `${item.item} - ${item.reason}` : item.item))
      .join("\n");

    if (!lines) return;

    try {
      await navigator.clipboard.writeText(lines);
    } catch (error) {
      console.error("Kunne ikke kopiere handleliste", error);
    }
  };

  const handleToggleFavorite = () => {
    if (!recipe) return;

    if (isRecipeFavorited(recipe.id)) {
      removeFavoriteRecipe(recipe.id);
      setIsCurrentRecipeFavorited(false);
      return;
    }

    upsertFavoriteRecipe(recipe);
    setIsCurrentRecipeFavorited(true);
  };

  useEffect(() => {
    if (!recipe) {
      setIsCurrentRecipeFavorited(false);
      return;
    }

    setIsCurrentRecipeFavorited(isRecipeFavorited(recipe.id));
  }, [recipe]);

  // Favorittsiden lenker hit med ?favorite=<id>.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const favoriteRecipeId = params.get("favorite");
    if (!favoriteRecipeId) return;

    const favorite = getFavoriteRecipeById(favoriteRecipeId);
    if (!favorite) {
      setRecipeError("Fant ikke favorittoppskriften i lokal lagring.");
      setView("result");
      return;
    }

    setRecipe(favorite.recipe);
    setRecipeError(null);
    setClarifyingQuestion(null);
    setAssumptions([]);
    setView("result");
  }, []);

  const hasResult = Boolean(recipe) || isLoading || Boolean(recipeError);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-text">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {view === "input" ? (
          <div>
            <header className="border-b border-line-soft px-6 pt-7 pb-6">
              <SectionLabel wide>Oppskriftgenerator</SectionLabel>
              <h1 className="mt-2.5 text-[40px] font-medium leading-[1.02] tracking-[-0.03em]">
                Middag,
                <br />
                av det du
                <br />
                <span className="text-accent-2">allerede har</span>
              </h1>
            </header>

            {clarifyingQuestion ? (
              <div className="px-6 pt-5">
                <div className="border-l-2 border-accent bg-accent/[0.09] px-3.5 py-3">
                  <SectionLabel tone="accent">Trenger en avklaring</SectionLabel>
                  <p className="mt-1.5 text-[15px] text-text">{clarifyingQuestion}</p>
                  <p className="mt-1.5 text-xs text-muted">
                    Juster ingrediensene eller rammene, og prøv igjen.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="px-6 pt-5 pb-6">
              <SectionLabel>01 · Ingredienser</SectionLabel>

              <div className="mt-2.5 border-b border-line pb-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addIngredient(draft);
                    }
                  }}
                  onBlur={() => addIngredient(draft)}
                  placeholder="skriv en ingrediens, enter"
                  aria-label="Legg til ingrediens"
                  className="w-full bg-transparent py-1 text-[17px] text-text outline-none placeholder:text-faint"
                />
              </div>

              <ul className="mt-3">
                {ingredients.map((name, index) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => removeIngredient(name)}
                      className="flex w-full items-baseline gap-2.5 border-b border-hairline py-3 text-left transition-colors hover:text-accent-1"
                    >
                      <span className="w-[18px] font-mono text-[10px] font-medium text-faint">
                        {pad(index + 1)}
                      </span>
                      <span className="text-base">{name}</span>
                      <span className="ml-auto text-xs text-dim">fjern</span>
                    </button>
                  </li>
                ))}
              </ul>

              <SectionLabel className="mt-6">02 · Rammer</SectionLabel>
              <div className="mt-2.5 flex flex-wrap gap-[7px]">
                <button
                  type="button"
                  onClick={() => setUnderForty((value) => !value)}
                  aria-pressed={underForty}
                  className={`min-h-11 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors ${
                    underForty
                      ? "border-accent bg-accent/[0.14] text-accent-1"
                      : "border-line text-muted hover:border-accent-dk"
                  }`}
                >
                  Under 40 min
                </button>

                {PREFERENCE_CHIPS.map((chip) => {
                  const isOn = activeChips.includes(chip.label);
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => toggleChip(chip.label)}
                      aria-pressed={isOn}
                      className={`min-h-11 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors ${
                        isOn
                          ? "border-accent bg-accent/[0.14] text-accent-1"
                          : "border-line text-muted hover:border-accent-dk"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <input
                value={preferencesText}
                onChange={(event) => setPreferencesText(event.target.value)}
                placeholder="noe annet? f.eks. uten sopp"
                aria-label="Andre preferanser"
                className="mt-3 min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-text outline-none placeholder:text-faint"
              />
            </div>

            <div className="px-6 pb-8">
              <button
                type="button"
                onClick={generateRecipe}
                disabled={isLoading || ingredients.length === 0}
                className="flex w-full items-center justify-between rounded-lg border border-accent px-4 py-4 text-base font-medium text-accent-1 transition-colors hover:bg-accent/[0.12] disabled:border-line disabled:text-faint disabled:hover:bg-transparent"
              >
                <span>
                  {ingredients.length === 0 ? "Legg inn minst én ingrediens" : "Lag en oppskrift"}
                </span>
                <span aria-hidden className="text-lg text-accent">
                  →
                </span>
              </button>
              <p className="mt-2.5 text-center text-[11px] text-faint">Kjører lokalt på din maskin</p>
            </div>
          </div>
        ) : null}

        {view === "result" ? (
          isLoading ? (
            <LoadingState />
          ) : recipeError ? (
            <div className="px-6 pt-6">
              <ErrorState title="Generering feilet" message={recipeError} onRetry={generateRecipe} />
            </div>
          ) : recipe ? (
            <div>
              <div className="relative overflow-hidden bg-section px-6 pt-7 pb-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-[70px] h-[210px] w-[210px] rounded-full opacity-75"
                  style={{ background: "radial-gradient(circle, #4c5397 0%, transparent 70%)" }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <SectionLabel wide tone="onSection">
                      Forslag
                    </SectionLabel>
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      aria-pressed={isCurrentRecipeFavorited}
                      aria-label={
                        isCurrentRecipeFavorited ? "Fjern fra favoritter" : "Lagre som favoritt"
                      }
                      className="-mt-2 -mr-1 px-2 py-1 text-lg text-on-section transition-opacity hover:opacity-80"
                    >
                      {isCurrentRecipeFavorited ? "★" : "☆"}
                    </button>
                  </div>

                  <h2 className="mt-3 text-[34px] font-medium leading-[1.06] tracking-[-0.03em] text-on-section">
                    {recipe.title}
                  </h2>

                  <div className="mt-4 flex gap-6">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.1em] text-on-section-muted">
                        Tid
                      </div>
                      <div className="text-lg font-medium text-on-section">
                        {recipe.timeMinutes} min
                      </div>
                    </div>
                    {typeof recipe.servings === "number" ? (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.1em] text-on-section-muted">
                          Porsjoner
                        </div>
                        <div className="text-lg font-medium text-on-section">{recipe.servings}</div>
                      </div>
                    ) : null}
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.1em] text-on-section-muted">
                        Mangler
                      </div>
                      <div className="text-lg font-medium text-on-section">
                        {recipe.missingIngredients.length}
                      </div>
                    </div>
                  </div>

                  {assumptions.length > 0 ? (
                    <p className="relative mt-3 text-[13px] leading-[1.5] text-on-section-muted">
                      {assumptions.join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="px-6 pt-5 pb-5">
                <SectionLabel>Ingredienser</SectionLabel>
                <ul className="mt-2.5">
                  {recipe.ingredients.map((ingredient, index) => {
                    const isChecked = Boolean(checked[index]);
                    return (
                      <li key={`${ingredient.item}-${index}`}>
                        <button
                          type="button"
                          onClick={() =>
                            setChecked((current) => ({ ...current, [index]: !current[index] }))
                          }
                          aria-pressed={isChecked}
                          className="flex w-full items-baseline gap-2.5 border-b border-hairline py-3 text-left"
                        >
                          <span
                            aria-hidden
                            className={`font-mono text-[11px] font-medium ${
                              isChecked ? "text-accent-2" : "text-dim"
                            }`}
                          >
                            {isChecked ? "●" : "○"}
                          </span>
                          <span
                            className={`text-base ${
                              isChecked ? "text-faint line-through" : "text-text"
                            }`}
                          >
                            {ingredient.item}
                          </span>
                          {ingredient.quantity ? (
                            <span className="ml-auto pl-3 font-mono text-[13px] text-faint">
                              {ingredient.quantity}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {recipe.missingIngredients.length > 0 ? (
                  <div className="mt-3.5 flex items-center gap-2.5 border-l-2 border-accent bg-accent/[0.09] px-3.5 py-3">
                    <div>
                      <div className="text-xs text-muted">Du mangler</div>
                      <div className="text-[15px] font-medium text-text">
                        {recipe.missingIngredients.map((item) => item.item).join(", ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyMissingIngredients}
                      className="ml-auto shrink-0 px-2 py-2 text-xs font-medium text-accent-2 transition-colors hover:text-accent-1"
                    >
                      Kopier ›
                    </button>
                  </div>
                ) : (
                  <p className="mt-3.5 text-[13px] text-muted">
                    Du kan lage denne med det du allerede har.
                  </p>
                )}
              </div>

              <div className="px-6 pb-7">
                <SectionLabel>Fremgangsmåte</SectionLabel>
                <ol className="mt-1.5">
                  {recipe.steps.map((step, index) => (
                    <li
                      key={`${index}-${step}`}
                      className="flex gap-3.5 border-b border-hairline py-3.5"
                    >
                      <span className="w-[30px] shrink-0 text-[22px] font-medium leading-none tracking-[-0.02em] text-step-num">
                        {pad(index + 1)}
                      </span>
                      <span className="text-[15px] leading-[1.55] text-pretty text-body">{step}</span>
                    </li>
                  ))}
                </ol>

                {recipe.notes && recipe.notes.length > 0 ? (
                  <div className="mt-5">
                    <SectionLabel>Notater</SectionLabel>
                    <ul className="mt-2 space-y-1.5">
                      {recipe.notes.map((note, index) => (
                        <li key={`${index}-${note}`} className="text-[14px] leading-[1.5] text-muted">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setCookStep(0);
                    setView("cook");
                  }}
                  className="mt-5 w-full rounded-lg border border-accent px-4 py-3.5 text-[15px] font-medium text-accent-1 transition-colors hover:bg-accent/[0.12]"
                >
                  Start kokemodus
                </button>
                <button
                  type="button"
                  onClick={generateRecipe}
                  className="mt-2.5 w-full py-2 text-center text-[13px] text-faint transition-colors hover:text-muted"
                >
                  Gi meg et annet forslag
                </button>
              </div>
            </div>
          ) : null
        ) : null}

        {view === "cook" && recipe ? (
          <CookMode
            recipe={recipe}
            stepIndex={cookStep}
            onPrev={() => setCookStep((step) => Math.max(0, step - 1))}
            onNext={() => {
              // Bytte av visning må skje her og ikke inne i setCookStep —
              // oppdateringsfunksjoner skal være rene.
              if (cookStep >= recipe.steps.length - 1) {
                setView("result");
                return;
              }
              setCookStep((step) => step + 1);
            }}
            onExit={() => setView("result")}
          />
        ) : null}
      </div>

      <TabBar
        active={view === "input" ? "input" : "result"}
        onSelectInput={() => setView("input")}
        onSelectResult={() => setView("result")}
        resultEnabled={hasResult}
      />
    </div>
  );
}
