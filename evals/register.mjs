import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// Lar vanlig Node importere appens servermoduler uforandret. Uten dette måtte
// harnessen duplisere prompt og validering, og da ville den evaluert en kopi
// som stille kan drive fra det produksjonskoden faktisk gjør.
//
// To ting mangler utenfor Next:
//   1. `server-only` er ikke installert — Next aliaser den bort under bygget,
//      og den ekte pakken kaster med vilje utenfor react-server-conditionen
//   2. `@/*` er en tsconfig-path, som Node ikke leser
//
// Lastes med --import, altså før evals/run.ts, slik at hooken er på plass når
// runneren importerer appen.
const projectRoot = new URL("../", import.meta.url);
const serverOnlyStub = new URL("./stubs/server-only.js", import.meta.url).href;

// Appens importer er uten filending, slik bundlere tillater. Node krever full
// sti, så vi prøver de samme kandidatene tsconfig-oppsettet ville gjort.
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: serverOnlyStub, shortCircuit: true };
    }

    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), projectRoot);

      for (const suffix of CANDIDATE_SUFFIXES) {
        const candidate = new URL(base.href + suffix);
        if (existsSync(fileURLToPath(candidate))) {
          return { url: candidate.href, shortCircuit: true };
        }
      }

      throw new Error(
        `Fant ingen fil for aliaset "${specifier}" under ${fileURLToPath(projectRoot)}`
      );
    }

    return nextResolve(specifier, context);
  },
});
