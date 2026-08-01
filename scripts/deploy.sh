#!/usr/bin/env bash
#
# Deployer appen på NEXUS1, men bare hvis den er verdt å deploye.
#
# Eval-harnessen kan ikke kjøre i GitHub Actions: modellen ligger på denne
# maskinen, og en CI-runner måtte lastet ned gemma på nytt hver gang. Deployen
# er derimot allerede noe som skjer her, med Ollama tilgjengelig — så det er
# her porten hører hjemme.
#
#   ./scripts/deploy.sh              full sjekk, deretter rebuild
#   ./scripts/deploy.sh --skip-eval  hopp over modellkjøringen
#   ./scripts/deploy.sh --check      kjør sjekkene, ikke deploy

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

SKIP_EVAL=0
CHECK_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --skip-eval) SKIP_EVAL=1 ;;
    --check) CHECK_ONLY=1 ;;
    # Skriver ut kommentarblokken øverst, uten å være avhengig av linjenumre.
    -h|--help)
      awk 'NR>2 && /^#/ { sub(/^# ?/, ""); print; next } NR>2 { exit }' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    *) echo "Ukjent flagg: $arg" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

# ── Forutsetninger ──────────────────────────────────────────────────────────
step "Sjekker forutsetninger"

command -v docker >/dev/null || fail "docker finnes ikke på PATH"

if [ ! -d node_modules ]; then
  echo "  node_modules mangler — installerer"
  npm ci
fi

# Harnessen sjekker dette selv og gir en god feilmelding, men da har vi allerede
# brukt tid på typecheck og enhetstester. Bedre å stoppe med én gang.
if [ "$SKIP_EVAL" -eq 0 ]; then
  OLLAMA_URL="${AI_BASE_URL:-http://127.0.0.1:11434/v1}"
  curl -fsS -m 5 "${OLLAMA_URL}/models" >/dev/null 2>&1 \
    || fail "Fikk ikke kontakt med modelltjenesten på ${OLLAMA_URL}. Kjør med --skip-eval for å deploye uten evaluering."
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "  merk: arbeidstreet har ucommittede endringer — de bygges med"
fi

# ── Sjekker ─────────────────────────────────────────────────────────────────
step "Typecheck"
npx tsc --noEmit

step "Enhetstester"
npm test

if [ "$SKIP_EVAL" -eq 1 ]; then
  step "Eval hoppet over (--skip-eval)"
  echo "  Modelloppførselen er ikke verifisert for denne deployen."
else
  step "Eval mot modellen"
  # Feiler ved første brutte krav. Modellen er probabilistisk, så en enkelt
  # flake kan stoppe en deploy — det er meningen. Haster det, finnes --skip-eval.
  npm run eval
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
  step "Kun sjekk (--check) — deployer ikke"
  exit 0
fi

# ── Deploy ──────────────────────────────────────────────────────────────────
step "Bygger og starter container"
docker compose up -d --build

# ── Etterkontroll ───────────────────────────────────────────────────────────
step "Verifiserer at appen svarer"

# Containeren bruker network_mode: host og lytter på 127.0.0.1:3003.
APP_URL="http://127.0.0.1:3003"

# Uten -S her: containeren bruker et par sekunder på å komme opp, og -S ville
# skrevet ut hvert avviste forsøk underveis. Da ser en vellykket deploy ut som
# en feil. Går det virkelig galt, sier `fail` fra.
curl -fs -m 30 --retry 10 --retry-delay 2 --retry-connrefused -o /dev/null "${APP_URL}/" \
  || fail "Appen svarer ikke på ${APP_URL} etter rebuild"

HEALTH="$(curl -fsS -m 10 "${APP_URL}/api/ai/health")" \
  || fail "Helsesjekken svarte ikke"

case "$HEALTH" in
  *'"ok":true'*) ;;
  *) fail "Helsesjekken er ikke grønn: ${HEALTH}" ;;
esac

printf '\n\033[32m✓ Deployet.\033[0m %s\n' "$HEALTH"
