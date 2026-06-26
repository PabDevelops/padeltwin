import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env' });
const client = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { error: signInError } = await client.auth.signInWithPassword({ email: 'test.player1@padeltwin.test', password: 'Padel1234!' });
if (signInError) { console.error('signin error', signInError.message); process.exit(1); }
const { data: profiles, error } = await client.from('profiles').select('id, full_name, level, zone, looking_for_partner, onboarding_completed');
if (error) { console.error(error); process.exit(1); }
console.log(JSON.stringify(profiles, null, 2));
