import "server-only";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

const RATE_LIMIT_MAX_PER_MINUTE = 5;
const RATE_LIMIT_MAX_PER_DAY = 25;

const UNKNOWN_IP_MAX_PER_MINUTE = 2;
const UNKNOWN_IP_MAX_PER_DAY = 5;

// Ingen enkelt-IP kan lagre mer enn dagskvoten sin, men antall distinkte IP-er
// er ubegrenset. Over denne terskelen feies utgåtte nøkler bort.
const SWEEP_THRESHOLD = 5_000;

type LimitReason = "minute" | "day";

type RateLimitResult = {
  ok: boolean;
  reason?: LimitReason;
  reset?: number;
};

// Tellingen ligger i prosessminnet: appen kjører som én container bak
// Cloudflare Access, så det finnes ingen andre instanser å dele tilstand med.
// Konsekvensen er at kvotene nullstilles ved restart og deploy. Åpnes appen
// for flere brukere eller skaleres den til flere instanser, må tellingen
// flyttes til delt lagring (Redis e.l.).
const hits = new Map<string, number[]>();

function limitsFor(ip: string) {
  return ip === "unknown"
    ? { perMinute: UNKNOWN_IP_MAX_PER_MINUTE, perDay: UNKNOWN_IP_MAX_PER_DAY }
    : { perMinute: RATE_LIMIT_MAX_PER_MINUTE, perDay: RATE_LIMIT_MAX_PER_DAY };
}

function getKey(ip: string): string {
  return ip === "unknown" ? "unknown-ip" : ip;
}

// Fjerner nøkler som ikke har hatt trafikk det siste døgnet. Kjøres kun når
// kartet har vokst seg stort, slik at vanlige forespørsler forblir O(1).
function sweep(now: number): void {
  for (const [key, timestamps] of hits) {
    const newest = timestamps[timestamps.length - 1];
    if (newest === undefined || now - newest >= DAY_MS) {
      hits.delete(key);
    }
  }
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const now = Date.now();
  const key = getKey(ip);
  const { perMinute, perDay } = limitsFor(ip);

  if (hits.size > SWEEP_THRESHOLD) {
    sweep(now);
  }

  // Bare innvilgede forespørsler telles, så listen kan aldri bli lengre enn
  // dagskvoten. Avviste forespørsler bruker ikke opp kvote — de koster
  // ingenting utover et oppslag her.
  const timestamps = (hits.get(key) ?? []).filter(
    (timestamp) => now - timestamp < DAY_MS
  );

  const withinMinute = timestamps.filter(
    (timestamp) => now - timestamp < MINUTE_MS
  );

  if (withinMinute.length >= perMinute) {
    const oldest = withinMinute[0];
    return {
      ok: false,
      reason: "minute",
      reset: Math.ceil((oldest + MINUTE_MS) / 1000),
    };
  }

  if (timestamps.length >= perDay) {
    const oldest = timestamps[0];
    return {
      ok: false,
      reason: "day",
      reset: Math.ceil((oldest + DAY_MS) / 1000),
    };
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  return { ok: true };
}
