import * as Astronomy from 'astronomy-engine';

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SIGN_ELEMENTS: Record<string, string> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
};

const SIGN_MODALITIES: Record<string, string> = {
  Aries: 'Cardinal', Taurus: 'Fixed', Gemini: 'Mutable', Cancer: 'Cardinal',
  Leo: 'Fixed', Virgo: 'Mutable', Libra: 'Cardinal', Scorpio: 'Fixed',
  Sagittarius: 'Mutable', Capricorn: 'Cardinal', Aquarius: 'Fixed', Pisces: 'Mutable',
};

interface PlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  degree: number;
  element: string;
  modality: string;
  house: number;
  retrograde: boolean;
}

interface HouseCusp {
  house: number;
  sign: string;
  degree: number;
  longitude: number;
}

interface Aspect {
  planet1: string;
  planet2: string;
  type: string;
  angle: number;
  orb: number;
}

export interface BirthChart {
  planets: PlanetPosition[];
  houses: HouseCusp[];
  ascendant: { sign: string; degree: number; longitude: number };
  midheaven: { sign: string; degree: number; longitude: number };
  northNode: PlanetPosition;
  southNode: PlanetPosition;
  aspects: Aspect[];
  houseSystem: string;
  zodiacMode: 'tropical';
  dominantElement: string;
  dominantModality: string;
  housesVerified: boolean;
  timezoneSource: 'api' | 'approximation' | 'noon_default';
  birthTimeKnown: boolean;
}

// ─── Coordinate / Sign Helpers ───

function longitudeToSign(lng: number): { sign: string; degree: number } {
  const normalized = ((lng % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degree = normalized % 30;
  return { sign: SIGNS[signIndex], degree: Math.round(degree * 100) / 100 };
}

function getEclipticLongitude(body: Astronomy.Body, date: Astronomy.FlexibleDateTime, observer: Astronomy.Observer): number {
  // Use actual birth location as Observer for correct topocentric positions
  // (critical for the Moon — parallax can shift it ~1° from wrong observer)
  const equ = Astronomy.Equator(body, date, observer, true, true);
  const ecl = Astronomy.Ecliptic(equ.vec);
  return ((ecl.elon % 360) + 360) % 360;
}

function isRetrograde(body: Astronomy.Body, date: Date, observer: Astronomy.Observer): boolean {
  const before = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const after = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const lngBefore = getEclipticLongitude(body, before, observer);
  const lngAfter = getEclipticLongitude(body, after, observer);
  let diff = lngAfter - lngBefore;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

// ─── Sidereal Time ───

function localSiderealTime(jd: number, longitudeEast: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  let lst = gmst + longitudeEast;
  lst = ((lst % 360) + 360) % 360;
  return lst;
}

// ─── Ascendant & MC ───

function calculateAscendant(lstDeg: number, latDeg: number, obliquityDeg: number): number {
  const lstRad = lstDeg * Math.PI / 180;
  const latRad = latDeg * Math.PI / 180;
  const oblRad = obliquityDeg * Math.PI / 180;
  // Standard formula: tan(ASC) = -cos(RAMC) / (sin(ε)·tan(φ) + cos(ε)·sin(RAMC))
  // The atan2(-cos, sin·cos+tan·sin) gives the Descendant; negate both args to get Ascendant.
  const y = Math.cos(lstRad);
  const x = -(Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad));
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  asc = ((asc % 360) + 360) % 360;
  return asc;
}

function calculateMC(lstDeg: number, obliquityDeg: number): number {
  const lstRad = lstDeg * Math.PI / 180;
  const oblRad = obliquityDeg * Math.PI / 180;
  let mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad)) * 180 / Math.PI;
  mc = ((mc % 360) + 360) % 360;
  return mc;
}

// ─── House Systems ───

function wholeSignHouses(ascLongitude: number): HouseCusp[] {
  const ascSignIndex = Math.floor(((ascLongitude % 360) + 360) % 360 / 30);
  const houses: HouseCusp[] = [];
  for (let i = 0; i < 12; i++) {
    const signIndex = (ascSignIndex + i) % 12;
    houses.push({
      house: i + 1,
      sign: SIGNS[signIndex],
      degree: 0,
      longitude: signIndex * 30,
    });
  }
  return houses;
}

function getWholeSignHouse(planetLng: number, ascLongitude: number): number {
  const ascSignIndex = Math.floor(((ascLongitude % 360) + 360) % 360 / 30);
  const planetSignIndex = Math.floor(((planetLng % 360) + 360) % 360 / 30);
  let house = planetSignIndex - ascSignIndex + 1;
  if (house <= 0) house += 12;
  if (house > 12) house -= 12;
  return house;
}

// ─── Timezone Resolution ───

async function getTimezoneFromCoordinates(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.timeZone || null;
  } catch {
    return null;
  }
}

function getUtcOffsetMinutes(timeZone: string, year: number, month: number, day: number, hours: number, minutes: number): number {
  // Create a UTC date as our reference point
  const utcRef = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  // Format the UTC date in the target timezone to see what the clock reads there
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(utcRef);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

  let tzHour = get('hour');
  if (tzHour === 24) tzHour = 0;
  const tzDay = get('day');
  const tzMonth = get('month');
  const tzYear = get('year');
  const tzMinute = get('minute');

  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0);
  const localMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0);

  // Offset in minutes (positive = east of UTC, e.g., +60 for CET)
  return (localMs - utcMs) / 60000;
}

function localBirthTimeToUTC(
  year: number, month: number, day: number,
  hours: number, minutes: number,
  timeZone: string
): Date {
  // Get the offset at a first guess (assume local time = UTC to start)
  const offsetMin = getUtcOffsetMinutes(timeZone, year, month, day, hours, minutes);

  // UTC = local time - offset
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - offsetMin * 60000;
  const utcGuess = new Date(utcMs);

  // Refine: check offset at the actual UTC time (handles DST boundary)
  const refinedOffset = getUtcOffsetMinutes(
    timeZone,
    utcGuess.getUTCFullYear(), utcGuess.getUTCMonth() + 1, utcGuess.getUTCDate(),
    utcGuess.getUTCHours(), utcGuess.getUTCMinutes()
  );

  // If offset changed (DST boundary), recalculate
  if (refinedOffset !== offsetMin) {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0) - refinedOffset * 60000);
  }
  return utcGuess;
}

function approximateUtcFromLongitude(
  year: number, month: number, day: number,
  hours: number, minutes: number,
  longitudeEast: number
): Date {
  // Crude approximation: timezone offset ≈ longitude / 15, rounded to nearest hour
  const rawOffset = longitudeEast / 15;
  const tzOffsetHours = Math.round(rawOffset);
  const utcHours = hours - tzOffsetHours;
  return new Date(Date.UTC(year, month - 1, day, utcHours, minutes, 0));
}

interface ParsedBirthTime {
  date: Date;
  timezoneSource: 'api' | 'approximation' | 'noon_default';
  birthTimeKnown: boolean;
}

async function parseBirthDateTime(
  dateStr: string, timeStr: string,
  lat: number, lng: number
): Promise<ParsedBirthTime> {
  const [year, month, day] = dateStr.split('-').map(Number);

  const birthTimeKnown = !!(timeStr && timeStr !== 'Unknown');
  let hours = 12, minutes = 0;
  if (birthTimeKnown) {
    const parts = timeStr.split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10) || 0;
  }

  // Try timezone API first for accurate DST-aware conversion
  const timeZone = await getTimezoneFromCoordinates(lat, lng);

  if (timeZone) {
    try {
      const date = localBirthTimeToUTC(year, month, day, hours, minutes, timeZone);
      return { date, timezoneSource: 'api', birthTimeKnown };
    } catch {
      // Fall through to approximation
    }
  }

  // Fallback: longitude-based approximation
  const date = approximateUtcFromLongitude(year, month, day, hours, minutes, lng);
  return {
    date,
    timezoneSource: birthTimeKnown ? 'approximation' : 'noon_default',
    birthTimeKnown,
  };
}

// ─── Julian Day & Obliquity ───

function dateToJD(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400;
  let yr = y, mo = m;
  if (mo <= 2) { yr -= 1; mo += 12; }
  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5;
}

function meanObliquity(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
}

// ─── Lunar Nodes (Mean) ───

function meanNorthNodeLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  // Standard formula for mean longitude of ascending lunar node (= North Node)
  let omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  omega = ((omega % 360) + 360) % 360;
  return omega;
}

// ─── Aspects ───

const ASPECT_TYPES: { name: string; angle: number; orb: number }[] = [
  { name: 'Conjunction', angle: 0, orb: 8 },
  { name: 'Sextile', angle: 60, orb: 6 },
  { name: 'Square', angle: 90, orb: 7 },
  { name: 'Trine', angle: 120, orb: 8 },
  { name: 'Opposition', angle: 180, orb: 8 },
];

function findAspects(planets: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let diff = Math.abs(planets[i].longitude - planets[j].longitude);
      if (diff > 180) diff = 360 - diff;
      for (const aspect of ASPECT_TYPES) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          aspects.push({
            planet1: planets[i].name,
            planet2: planets[j].name,
            type: aspect.name,
            angle: aspect.angle,
            orb: Math.round(orb * 100) / 100,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

// ─── Geocoding ───

async function geocode(place: string): Promise<{ lat: number; lng: number }> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SOVRN-CosmicBlueprint/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Geocoding request failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data || data.length === 0) {
    throw new Error(`Could not geocode location: ${place}`);
  }
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// ─── Sanity Checks ───

function detectSolarChartPattern(planets: PlanetPosition[], ascLongitude: number): boolean {
  // A solar chart fallback places House 1 = Sun's sign.
  // An Aries-default fallback places House 1 = Aries (ascLng near 0°).
  // Detect: if ASC is within 1° of 0° (Aries 0°), that's suspicious.
  const ascNorm = ((ascLongitude % 360) + 360) % 360;
  if (ascNorm < 1 || ascNorm > 359) {
    return true; // Aries 0° default detected
  }

  // Also detect: if ASC sign == Sun sign and ASC degree is close to Sun degree,
  // it might be a solar chart (House 1 = Sun sign)
  const sun = planets.find(p => p.name === 'Sun');
  if (sun) {
    const sunSignIndex = Math.floor(sun.longitude / 30);
    const ascSignIndex = Math.floor(ascNorm / 30);
    if (sunSignIndex === ascSignIndex) {
      const degDiff = Math.abs((sun.longitude % 30) - (ascNorm % 30));
      if (degDiff < 1) return true; // ASC suspiciously matches Sun
    }
  }

  return false;
}

function validateAngles(
  ascLng: number, mcLng: number,
  _lat: number, birthTimeKnown: boolean
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!birthTimeKnown) {
    warnings.push('Birth time unknown — Ascendant and houses are approximate (noon chart).');
  }

  // MC should be roughly 90° ahead of ASC (within ~30° for most latitudes)
  const mcAscDiff = ((mcLng - ascLng + 360) % 360);
  if (mcAscDiff < 50 || mcAscDiff > 310) {
    // MC and ASC too close or nearly opposite — something may be wrong
    if (mcAscDiff > 160 && mcAscDiff < 200) {
      // MC near opposite of ASC — this shouldn't happen
      warnings.push('MC appears ~180° from Ascendant, which is geometrically unusual.');
    }
  }

  return { valid: warnings.length === 0 && birthTimeKnown, warnings };
}

// ─── Planet Data ───

const PLANET_BODIES: { name: string; body: Astronomy.Body }[] = [
  { name: 'Sun', body: Astronomy.Body.Sun },
  { name: 'Moon', body: Astronomy.Body.Moon },
  { name: 'Mercury', body: Astronomy.Body.Mercury },
  { name: 'Venus', body: Astronomy.Body.Venus },
  { name: 'Mars', body: Astronomy.Body.Mars },
  { name: 'Jupiter', body: Astronomy.Body.Jupiter },
  { name: 'Saturn', body: Astronomy.Body.Saturn },
  { name: 'Uranus', body: Astronomy.Body.Uranus },
  { name: 'Neptune', body: Astronomy.Body.Neptune },
  { name: 'Pluto', body: Astronomy.Body.Pluto },
];

// ─── Main Calculation ───

export async function calculateBirthChart(
  birthDate: string,
  birthTime: string,
  birthPlace: string
): Promise<BirthChart> {
  // Step 1: Geocode birth place to lat/lng
  const { lat, lng } = await geocode(birthPlace);

  // Step 2: Convert local birth time to UTC using real timezone data
  const { date, timezoneSource, birthTimeKnown } = await parseBirthDateTime(
    birthDate, birthTime, lat, lng
  );

  // Step 3: Compute Julian Day and obliquity
  const jd = dateToJD(date);
  const obliquity = meanObliquity(jd);

  // Step 4: Compute Local Sidereal Time (longitude must be east-positive; Nominatim returns negative for west)
  const lst = localSiderealTime(jd, lng);

  // Step 5: Compute Ascendant and MC
  const ascLng = calculateAscendant(lst, lat, obliquity);
  const mcLng = calculateMC(lst, obliquity);

  // Step 6: Validate angles
  const ascInfo = longitudeToSign(ascLng);
  const mcInfo = longitudeToSign(mcLng);

  // Step 7: Compute planet positions using birth location as observer
  const observer = new Astronomy.Observer(lat, lng, 0);
  const planets: PlanetPosition[] = PLANET_BODIES.map(({ name, body }) => {
    const longitude = getEclipticLongitude(body, date, observer);
    const { sign, degree } = longitudeToSign(longitude);
    const house = getWholeSignHouse(longitude, ascLng);
    const retrograde = (body !== Astronomy.Body.Sun && body !== Astronomy.Body.Moon)
      ? isRetrograde(body, date, observer)
      : false;
    return { name, longitude, sign, degree, element: SIGN_ELEMENTS[sign], modality: SIGN_MODALITIES[sign], house, retrograde };
  });

  // Step 8: Compute lunar nodes
  const nnLng = meanNorthNodeLongitude(jd);
  const snLng = (nnLng + 180) % 360;
  const nnInfo = longitudeToSign(nnLng);
  const snInfo = longitudeToSign(snLng);

  const northNode: PlanetPosition = {
    name: 'North Node', longitude: nnLng, sign: nnInfo.sign, degree: nnInfo.degree,
    element: SIGN_ELEMENTS[nnInfo.sign], modality: SIGN_MODALITIES[nnInfo.sign],
    house: getWholeSignHouse(nnLng, ascLng), retrograde: true,
  };

  const southNode: PlanetPosition = {
    name: 'South Node', longitude: snLng, sign: snInfo.sign, degree: snInfo.degree,
    element: SIGN_ELEMENTS[snInfo.sign], modality: SIGN_MODALITIES[snInfo.sign],
    house: getWholeSignHouse(snLng, ascLng), retrograde: true,
  };

  // Step 9: Sanity checks
  const isSolarChart = detectSolarChartPattern(planets, ascLng);
  const { valid: anglesValid, warnings } = validateAngles(ascLng, mcLng, lat, birthTimeKnown);
  const housesVerified = birthTimeKnown && !isSolarChart && anglesValid && timezoneSource === 'api';

  if (isSolarChart) {
    warnings.push('WARNING: Possible solar chart fallback detected — Ascendant may be defaulting to Sun sign or Aries 0°.');
  }

  // Step 10: Houses, aspects, element/modality tallies
  const houses = wholeSignHouses(ascLng);
  const allBodies = [...planets, northNode];
  const aspects = findAspects(allBodies);

  const elementCounts: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalityCounts: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  for (const p of planets) {
    elementCounts[p.element]++;
    modalityCounts[p.modality]++;
  }
  const dominantElement = Object.entries(elementCounts).sort((a, b) => b[1] - a[1])[0][0];
  const dominantModality = Object.entries(modalityCounts).sort((a, b) => b[1] - a[1])[0][0];

  const chart: BirthChart = {
    planets, houses,
    ascendant: { sign: ascInfo.sign, degree: ascInfo.degree, longitude: ascLng },
    midheaven: { sign: mcInfo.sign, degree: mcInfo.degree, longitude: mcLng },
    northNode, southNode, aspects,
    houseSystem: 'Whole Sign',
    zodiacMode: 'tropical',
    dominantElement, dominantModality,
    housesVerified,
    timezoneSource,
    birthTimeKnown,
  };

  // Log warnings for debugging
  if (warnings.length > 0) {
    console.warn('[SOVRN Chart]', warnings.join(' | '));
  }

  return chart;
}

// ─── Prompt Formatter ───

export function formatChartForPrompt(chart: BirthChart): string {
  let output = `=== CALCULATED BIRTH CHART ===\n`;
  output += `Zodiac: Tropical | Houses: Whole Sign\n`;
  output += `Timezone source: ${chart.timezoneSource}\n`;
  output += `Houses verified: ${chart.housesVerified ? 'YES' : 'NO'}\n`;
  output += `Birth time known: ${chart.birthTimeKnown ? 'YES' : 'NO'}\n\n`;

  // Always-safe data: planetary signs and degrees (accurate regardless of house system)
  output += `--- PLANETARY POSITIONS (sign & degree are verified) ---\n`;
  for (const p of chart.planets) {
    const retro = p.retrograde ? ' (R)' : '';
    if (chart.housesVerified) {
      output += `${p.name}: ${p.sign} ${p.degree.toFixed(1)}° — House ${p.house}${retro}\n`;
    } else {
      output += `${p.name}: ${p.sign} ${p.degree.toFixed(1)}°${retro}\n`;
    }
  }
  output += `North Node: ${chart.northNode.sign} ${chart.northNode.degree.toFixed(1)}°`;
  if (chart.housesVerified) output += ` — House ${chart.northNode.house}`;
  output += `\nSouth Node: ${chart.southNode.sign} ${chart.southNode.degree.toFixed(1)}°`;
  if (chart.housesVerified) output += ` — House ${chart.southNode.house}`;
  output += `\n\n`;

  if (chart.housesVerified) {
    output += `--- ANGLES (verified) ---\n`;
    output += `ASCENDANT (Rising Sign): ${chart.ascendant.sign} ${chart.ascendant.degree.toFixed(1)}°\n`;
    output += `MIDHEAVEN (MC): ${chart.midheaven.sign} ${chart.midheaven.degree.toFixed(1)}°\n\n`;

    output += `--- HOUSE CUSPS (Whole Sign) ---\n`;
    for (const h of chart.houses) {
      output += `House ${h.house}: ${h.sign}\n`;
    }
    output += `\n`;
  } else {
    output += `--- ANGLES (UNVERIFIED — use with caution) ---\n`;
    output += `ASCENDANT (Rising Sign): ${chart.ascendant.sign} ${chart.ascendant.degree.toFixed(1)}° [approximate]\n`;
    output += `MIDHEAVEN (MC): ${chart.midheaven.sign} ${chart.midheaven.degree.toFixed(1)}° [approximate]\n`;
    output += `⚠ Birth time or timezone could not be fully verified. House placements may be inaccurate.\n`;
    output += `⚠ DO NOT make confident house-based claims. Focus on planetary signs, degrees, aspects, and nodes.\n\n`;
  }

  output += `Dominant Element: ${chart.dominantElement}\n`;
  output += `Dominant Modality: ${chart.dominantModality}\n\n`;

  output += `--- MAJOR ASPECTS ---\n`;
  for (const a of chart.aspects) {
    output += `${a.planet1} ${a.type} ${a.planet2} (orb: ${a.orb}°)\n`;
  }

  return output;
}
