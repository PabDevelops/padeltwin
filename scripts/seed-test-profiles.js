// One-off seed script: creates real auth users + profiles so the new ELO
// placement quiz can be sanity-checked against varied answer combos.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-test-profiles.js
//
// Needs EXPO_PUBLIC_SUPABASE_URL (already in .env) and the service_role key
// (Project Settings -> API -> service_role). Never commit the service key.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEVEL_POINTS = { iniciacion: 0, intermedio: 150, avanzado: 300 };
const YEARS_POINTS = { under1: 0, '1to3': 40, '3to5': 90, over5: 150 };
const COMPETITION_POINTS = { none: 0, club: 30, local: 80, ranked: 180 };
const FREQUENCY_POINTS = { lessThanOne: 0, oneToTwo: 30, threeOrMore: 60 };
const BASE_ELO = 1000;

function computeStartingElo({ level, yearsPlaying, competition, frequency }) {
  return (
    BASE_ELO +
    LEVEL_POINTS[level] +
    YEARS_POINTS[yearsPlaying] +
    COMPETITION_POINTS[competition] +
    FREQUENCY_POINTS[frequency]
  );
}

const PASSWORD = 'Test1234!';

const PROFILES = [
  { name: 'Test Beginner Casual', level: 'iniciacion', yearsPlaying: 'under1', competition: 'none', frequency: 'lessThanOne', zone: 'Edinburgh', club: null },
  { name: 'Test Beginner Keen', level: 'iniciacion', yearsPlaying: '1to3', competition: 'club', frequency: 'oneToTwo', zone: 'Edinburgh', club: 'Padel Edinburgh' },
  { name: 'Test Intermediate New', level: 'intermedio', yearsPlaying: 'under1', competition: 'none', frequency: 'oneToTwo', zone: 'Edinburgh', club: null },
  { name: 'Test Intermediate Casual', level: 'intermedio', yearsPlaying: '1to3', competition: 'club', frequency: 'oneToTwo', zone: 'Edinburgh', club: 'Padel Edinburgh' },
  { name: 'Test Intermediate Competitive', level: 'intermedio', yearsPlaying: '3to5', competition: 'local', frequency: 'threeOrMore', zone: 'Edinburgh', club: 'Padel Edinburgh' },
  { name: 'Test Advanced Club', level: 'avanzado', yearsPlaying: '3to5', competition: 'local', frequency: 'oneToTwo', zone: 'Glasgow', club: 'Glasgow Padel Club' },
  { name: 'Test Advanced Ranked', level: 'avanzado', yearsPlaying: 'over5', competition: 'ranked', frequency: 'threeOrMore', zone: 'Glasgow', club: 'Glasgow Padel Club' },
  { name: 'Test Advanced Veteran', level: 'avanzado', yearsPlaying: 'over5', competition: 'ranked', frequency: 'oneToTwo', zone: 'London', club: null },
];

async function main() {
  for (const p of PROFILES) {
    const email = `${p.name.toLowerCase().replace(/\s+/g, '.')}@padeltwin.test`;
    const elo = computeStartingElo(p);

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });

    if (createError) {
      console.error(`✗ ${email}: ${createError.message}`);
      continue;
    }

    const userId = created.user.id;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: p.name,
        level: p.level,
        zone: p.zone,
        club: p.club,
        elo,
        looking_for_partner: true,
        onboarding_completed: true,
      })
      .eq('id', userId);

    if (updateError) {
      console.error(`✗ ${email} (profile update): ${updateError.message}`);
      continue;
    }

    console.log(`✓ ${email} — elo ${elo} (${p.level}, ${p.yearsPlaying}, ${p.competition}, ${p.frequency})`);
  }

  console.log(`\nAll test accounts use the password: ${PASSWORD}`);
}

main();
