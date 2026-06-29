// Creates a large batch of realistic test accounts (real auth.users rows,
// all password "123456") plus profiles, declared pairs and confirmed match
// history, so the app can be tested with a populated country league /
// division ranking instead of one lonely account.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-test-users.mjs
//
// Needs EXPO_PUBLIC_SUPABASE_URL from .env and the service_role key (never
// committed — passed via env var only) because creating auth users in bulk
// requires the admin API, which the anon key cannot do.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TOTAL_USERS = 126;
const PASSWORD = '123456';

// Everyone lands in Edinburgh, UK — that's the single market we're seeding
// for the launch distribution, so the country league / divisions should be
// entirely populated by this one city's worth of players.
const COUNTRIES = {
  'United Kingdom': ['Edinburgh'],
};
const COUNTRY_NAMES = Object.keys(COUNTRIES);

const FIRST_NAMES = [
  'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Jamie', 'Riley', 'Cameron', 'Drew',
  'Pablo', 'Marco', 'Luca', 'Sofia', 'Elena', 'Carlos', 'Diego', 'Laura', 'Maria', 'Ana',
  'Tom', 'Jack', 'Olivia', 'Emma', 'Noah', 'Liam', 'Lucas', 'Mia', 'Zoe', 'Leo',
];
const LAST_NAMES = [
  'Garcia', 'Smith', 'Rossi', 'Dubois', 'Silva', 'Fernandez', 'Brown', 'Bianchi', 'Martin',
  'Lopez', 'Costa', 'Wilson', 'Moreau', 'Ferrari', 'Sanchez', 'Taylor', 'Russo', 'Bernard',
  'Gomez', 'Clarke',
];

const SEXES = ['male', 'female', 'other'];
const HANDS = ['left', 'right'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function eloToLevel(elo) {
  if (elo < 1000) return 'iniciacion';
  if (elo < 1400) return 'intermedio';
  return 'avanzado';
}
function randomElo() {
  // Roughly bell-shaped around 1200, spread 700-1900.
  const base = (Math.random() + Math.random() + Math.random()) / 3; // 0..1, centered
  return Math.round(700 + base * 1200);
}

async function main() {
  console.log(`Seeding ${TOTAL_USERS} test users...`);
  const createdUsers = [];

  for (let i = 1; i <= TOTAL_USERS; i++) {
    const email = `test${i}@test.com`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      if (error.message?.includes('already been registered') || error.code === 'email_exists') {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = list?.users.find((u) => u.email === email);
        if (existing) {
          createdUsers.push({ id: existing.id, email });
          continue;
        }
      }
      console.error(`Failed to create ${email}:`, error.message);
      continue;
    }
    createdUsers.push({ id: data.user.id, email });
    if (i % 20 === 0) console.log(`  ${i}/${TOTAL_USERS} auth users created`);
  }

  console.log(`Created/found ${createdUsers.length} auth users. Building profiles...`);

  const profilesByCountry = {};
  for (const c of COUNTRY_NAMES) profilesByCountry[c] = [];

  const profileRows = createdUsers.map((u, idx) => {
    const country = COUNTRY_NAMES[idx % COUNTRY_NAMES.length];
    const zone = pick(COUNTRIES[country]);
    const elo = randomElo();
    const row = {
      id: u.id,
      full_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      level: eloToLevel(elo),
      zone,
      country,
      elo,
      height_cm: randInt(155, 200),
      sex: pick(SEXES),
      dominant_hand: pick(HANDS),
      looking_for_partner: Math.random() < 0.6,
      onboarding_completed: true,
    };
    profilesByCountry[country].push(row);
    return row;
  });

  for (let i = 0; i < profileRows.length; i += 50) {
    const batch = profileRows.slice(i, i + 50);
    const { error } = await supabase.from('profiles').upsert(batch, { onConflict: 'id' });
    if (error) console.error('Profile upsert error:', error.message);
  }
  console.log('Profiles written.');

  // Declare pairs within each country (a player can only be in one pair here,
  // good enough for seeding division/league rankings).
  console.log('Declaring pairs...');
  const pairRows = [];
  for (const country of COUNTRY_NAMES) {
    const shuffled = shuffle(profilesByCountry[country]);
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      const a = shuffled[i];
      const b = shuffled[i + 1];
      const [playerA, playerB] = a.id < b.id ? [a, b] : [b, a];
      pairRows.push({
        player_a_id: playerA.id,
        player_b_id: playerB.id,
        elo: Math.round((playerA.elo + playerB.elo) / 2),
        matches_played: randInt(0, 12),
      });
    }
  }
  for (let i = 0; i < pairRows.length; i += 50) {
    const batch = pairRows.slice(i, i + 50);
    const { error } = await supabase.from('pairs').upsert(batch, { onConflict: 'player_a_id,player_b_id' });
    if (error) console.error('Pair upsert error:', error.message);
  }
  console.log(`Declared ${pairRows.length} pairs.`);

  // A handful of confirmed match results so Scrim Index / recent matches
  // have something to show. Individual mode, random teammates each time.
  console.log('Generating confirmed match history...');
  const allIds = createdUsers.map((u) => u.id);
  const MATCH_COUNT = 200;
  let createdMatches = 0;

  for (let m = 0; m < MATCH_COUNT; m++) {
    const four = shuffle(allIds).slice(0, 4);
    const [a1, a2, b1, b2] = four;
    const daysAgo = randInt(0, 13);
    const dateTime = new Date(Date.now() - daysAgo * 86400000);

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({
        created_by: a1,
        date_time: dateTime.toISOString(),
        location: 'Seeded Test Court',
        level: 'intermedio',
        max_players: 4,
        mode: 'individual',
        visibility: 'closed',
        status: 'full',
      })
      .select()
      .single();
    if (matchErr) {
      console.error('Match insert error:', matchErr.message);
      continue;
    }

    await supabase.from('match_players').insert([
      { match_id: match.id, player_id: a1 },
      { match_id: match.id, player_id: a2 },
      { match_id: match.id, player_id: b1 },
      { match_id: match.id, player_id: b2 },
    ]);

    const aWins = Math.random() < 0.5;
    const sets = aWins
      ? [{ a: 6, b: randInt(0, 4) }, { a: 6, b: randInt(0, 4) }]
      : [{ a: randInt(0, 4), b: 6 }, { a: randInt(0, 4), b: 6 }];

    const { data: result, error: resultErr } = await supabase
      .from('match_results')
      .insert({
        match_id: match.id,
        team_a_player1: a1,
        team_a_player2: a2,
        team_b_player1: b1,
        team_b_player2: b2,
        sets,
        winner: aWins ? 'a' : 'b',
        recorded_by: a1,
        status: 'pending',
      })
      .select()
      .single();
    if (resultErr) {
      console.error('Match result insert error:', resultErr.message);
      continue;
    }

    // Confirm it as the opposing team — this is what fires the real ELO trigger.
    const { error: confirmErr } = await supabase
      .from('match_results')
      .update({ status: 'confirmed', confirmed_by: b1, confirmed_at: new Date().toISOString() })
      .eq('id', result.id);
    if (confirmErr) console.error('Confirm error:', confirmErr.message);
    else createdMatches++;

    if ((m + 1) % 50 === 0) console.log(`  ${m + 1}/${MATCH_COUNT} matches processed`);
  }

  console.log(`Done. ${createdMatches} confirmed matches created.`);
  console.log('All test accounts use password "123456" — emails test1@test.com .. test126@test.com.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
