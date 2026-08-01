import { writeFile } from "node:fs/promises";
import { cases, type EvalCase } from "./cases.ts";
import type { Outcome } from "./assertions.ts";

// Harnessen pinner modellen selv, slik at en kjøring er reproduserbar
// uavhengig av hva .env.docker eller skallet tilfeldigvis har satt.
const DEFAULT_MODEL = "gemma4:e4b";
const DEFAULT_TIMEOUT_SECONDS = 180;

type Options = {
  model: string;
  baseUrl?: string;
  runs: number;
  only: string[];
  timeoutMs: number;
  verbose: boolean;
  json?: string;
  list: boolean;
};

type CapturedLog = { level: string; args: unknown[] };

type RunResult = {
  caseId: string;
  run: number;
  ok: boolean;
  kind?: Outcome["kind"];
  attempts?: number;
  durationMs: number;
  totalTokens?: number;
  failures: string[];
  outcome?: Outcome;
  logs: CapturedLog[];
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    model: DEFAULT_MODEL,
    runs: 1,
    only: [],
    timeoutMs: DEFAULT_TIMEOUT_SECONDS * 1000,
    verbose: false,
    list: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined) {
        throw new Error(`${arg} mangler verdi`);
      }
      return next;
    };

    switch (arg) {
      case "--model":
        options.model = value();
        break;
      case "--base-url":
        options.baseUrl = value();
        break;
      case "--runs":
        options.runs = Number.parseInt(value(), 10);
        break;
      case "--case":
        options.only.push(value());
        break;
      case "--timeout":
        options.timeoutMs = Number.parseInt(value(), 10) * 1000;
        break;
      case "--json":
        options.json = value();
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--list":
        options.list = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Ukjent flagg: ${arg}`);
    }
  }

  if (!Number.isFinite(options.runs) || options.runs < 1) {
    throw new Error("--runs må være et positivt heltall");
  }

  return options;
}

function printHelp(): void {
  console.log(
    [
      "Kjører faste input mot modellen gjennom appens egen generateRecipeFromAI.",
      "",
      "  --model <navn>     modell å teste (standard: " + DEFAULT_MODEL + ")",
      "  --base-url <url>   overstyr AI_BASE_URL",
      "  --runs <n>         antall kjøringer per case (standard: 1)",
      "  --case <id>        kjør kun denne casen, kan gjentas",
      "  --timeout <sek>    tidsgrense per kjøring (standard: " + DEFAULT_TIMEOUT_SECONDS + ")",
      "  --json <sti>       skriv fullt resultat som JSON",
      "  --verbose          vis appens logger også for kjøringer som gikk bra",
      "  --list             list casene og avslutt",
    ].join("\n")
  );
}

/**
 * Produksjonskoden logger tett på hver forespørsel. Vi fanger loggen i stedet
 * for å la den skylle over tabellen, og skriver den ut igjen for kjøringer som
 * feilet — da er det nettopp den loggen man vil se.
 */
async function captureLogs<T>(
  work: () => Promise<T>
): Promise<{ value: T; logs: CapturedLog[] }> {
  const logs: CapturedLog[] = [];
  const levels = ["log", "info", "warn", "error"] as const;
  const original = new Map(levels.map((level) => [level, console[level]] as const));

  for (const level of levels) {
    console[level] = (...args: unknown[]) => {
      logs.push({ level, args });
    };
  }

  try {
    return { value: await work(), logs };
  } finally {
    for (const level of levels) {
      console[level] = original.get(level)!;
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Kallet kan ikke avbrytes utenfra, så modellen jobber videre i bakgrunnen.
    // Det er greit her: prosessen avsluttes uansett når kjøringen er ferdig.
    const timer = setTimeout(() => reject(new Error(`${label} brukte mer enn ${ms / 1000} s`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function tokensFrom(logs: CapturedLog[]): number | undefined {
  for (const entry of logs) {
    if (entry.args[0] === "[ai.generate.usage]") {
      const payload = entry.args[1] as { totalTokens?: number } | undefined;
      if (typeof payload?.totalTokens === "number") {
        return payload.totalTokens;
      }
    }
  }

  return undefined;
}

function formatLog(entry: CapturedLog): string {
  return entry.args
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join(" ");
}

async function runCase(
  testCase: EvalCase,
  run: number,
  options: Options,
  generate: typeof import("@/lib/ai/generateRecipe").generateRecipeFromAI
): Promise<RunResult> {
  const startedAt = Date.now();
  const requestId = `eval-${testCase.id}-${run}`;
  const failures: string[] = [];

  let logs: CapturedLog[] = [];
  let kind: Outcome["kind"] | undefined;
  let attempts: number | undefined;
  let outcome: Outcome | undefined;

  try {
    const captured = await captureLogs(() =>
      withTimeout(generate(testCase.input, requestId), options.timeoutMs, testCase.id)
    );
    logs = captured.logs;
    const result = captured.value;

    if (!result.ok) {
      failures.push(`generering feilet (${result.code}) etter ${result.attempts} forsøk`);
      attempts = result.attempts;
    } else {
      attempts = result.attempts;

      outcome =
        "clarifyingQuestion" in result.result
          ? { kind: "clarifyingQuestion", question: result.result.clarifyingQuestion }
          : {
              kind: "recipe",
              recipe: result.result.recipe,
              assumptions: result.result.assumptions ?? [],
            };

      kind = outcome.kind;

      if (expectMismatch(testCase, outcome)) {
        failures.push(`forventet ${testCase.expect}, fikk ${outcome.kind}`);
      }

      for (const assertion of testCase.assertions) {
        const failure = assertion(outcome, { ingredients: testCase.input.ingredients });
        if (failure) {
          failures.push(failure);
        }
      }
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  return {
    caseId: testCase.id,
    run,
    ok: failures.length === 0,
    kind,
    attempts,
    durationMs: Date.now() - startedAt,
    totalTokens: tokensFrom(logs),
    failures,
    outcome,
    logs,
  };
}

function expectMismatch(testCase: EvalCase, outcome: Outcome): boolean {
  return testCase.expect !== "either" && testCase.expect !== outcome.kind;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const selected = options.only.length
    ? cases.filter((testCase) => options.only.includes(testCase.id))
    : cases;

  if (options.only.length && selected.length !== options.only.length) {
    const found = new Set(selected.map((testCase) => testCase.id));
    const missing = options.only.filter((id) => !found.has(id));
    throw new Error(`Ukjent case: ${missing.join(", ")}`);
  }

  if (options.list) {
    for (const testCase of cases) {
      console.log(`${testCase.id.padEnd(18)} ${testCase.description}`);
    }
    return;
  }

  // Må settes før modulene importeres, slik at klienten bygges mot riktig
  // endepunkt og hver forespørsel bruker modellen vi faktisk vil teste.
  process.env.AI_MODEL = options.model;
  if (options.baseUrl) {
    process.env.AI_BASE_URL = options.baseUrl;
  }

  const { generateRecipeFromAI } = await import("@/lib/ai/generateRecipe");
  const { checkModelAvailability, getBaseUrl } = await import("@/lib/ai/modelClient");

  const health = await checkModelAvailability();
  if (!health.ok) {
    throw new Error(health.message);
  }

  console.log(`Modell:   ${options.model}`);
  console.log(`Endepunkt: ${getBaseUrl()}`);
  console.log(`Caser:    ${selected.length} × ${options.runs} kjøring(er)\n`);

  const results: RunResult[] = [];

  for (const testCase of selected) {
    for (let run = 1; run <= options.runs; run++) {
      // Framdriftslinjen overskrives med \r når vi skriver til en terminal.
      // Pipes output til fil eller CI, ville den blitt stående som støy.
      const interactive = process.stdout.isTTY === true;
      if (interactive) {
        process.stdout.write(`  ${testCase.id.padEnd(18)} kjører …`);
      }

      const result = await runCase(testCase, run, options, generateRecipeFromAI);
      results.push(result);

      const seconds = (result.durationMs / 1000).toFixed(1);
      const detail = [
        result.kind === "clarifyingQuestion" ? "avklaringsspørsmål" : result.kind,
        result.attempts ? `${result.attempts} forsøk` : undefined,
        result.totalTokens ? `${result.totalTokens} tokens` : undefined,
      ]
        .filter(Boolean)
        .join(", ");

      process.stdout.write(
        `${interactive ? "\r" : ""}  ${testCase.id.padEnd(18)} ${
          result.ok ? "OK  " : "FEIL"
        }  ${seconds.padStart(6)}s  ${detail}\n`
      );

      for (const failure of result.failures) {
        console.log(`      → ${failure}`);
      }

      // Et brutt krav er bare mulig å bedømme mot det modellen faktisk svarte —
      // særlig for innholdskrav, der et falskt treff ellers ser ut som regresjon.
      if (!result.ok && result.outcome) {
        for (const line of JSON.stringify(result.outcome, null, 2).split("\n")) {
          console.log(`      ${line}`);
        }
      }

      if (!result.ok || options.verbose) {
        for (const entry of result.logs) {
          console.log(`      | ${formatLog(entry)}`);
        }
      }
    }
  }

  const passed = results.filter((result) => result.ok).length;
  const meanSeconds =
    results.reduce((sum, result) => sum + result.durationMs, 0) / results.length / 1000;
  const firstTry = results.filter((result) => result.attempts === 1).length;

  console.log(`\nBestått:      ${passed}/${results.length}`);
  console.log(`Uten retry:   ${firstTry}/${results.length}`);
  console.log(`Snitt-tid:    ${meanSeconds.toFixed(1)}s`);

  if (options.json) {
    await writeFile(
      options.json,
      JSON.stringify(
        {
          model: options.model,
          ranAt: new Date().toISOString(),
          passed,
          total: results.length,
          // Appens logger utelates med vilje: de er store, og det som er verdt
          // å ta vare på fra dem — tokenbruk — er allerede plukket ut.
          results: results.map((result) => ({
            caseId: result.caseId,
            run: result.run,
            ok: result.ok,
            kind: result.kind,
            attempts: result.attempts,
            durationMs: result.durationMs,
            totalTokens: result.totalTokens,
            failures: result.failures,
            outcome: result.outcome,
          })),
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(`JSON skrevet: ${options.json}`);
  }

  if (passed < results.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
