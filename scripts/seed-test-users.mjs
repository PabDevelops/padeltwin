import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const ZONES = ['Edinburgh', 'Glasgow', 'London', 'Manchester', 'Bristol'];
const LEVELS = ['iniciacion', 'intermedio', 'avanzado'];

const NAMES = [
  'Laura García', 'Pablo Sánchez', 'Marta Fernández', 'Carlos Ruiz', 'Lucía Torres',
  'Javier Moreno', 'Elena Gómez', 'Diego Navarro', 'Sara Jiménez', 'Adrián Romero',
  'Paula Alonso', 'Hugo Díaz', 'Claudia Vega', 'Mario Castro', 'Inés Ortega',
  'Daniel Serrano', 'Alba Molina', 'Sergio Iglesias', 'Nuria Pascual', 'Raúl Crespo',
];

async function main() {
  console.log(`Creando ${NAMES.length} cuentas de prueba...`);

  for (let i = 0; i < NAMES.length; i++) {
    const fullName = NAMES[i];
    const email = `test.player${i + 1}@padeltwin.test`;
    const password = 'Padel1234!';
    const level = LEVELS[i % LEVELS.length];
    const zone = ZONES[i % ZONES.length];

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      console.error(`✗ ${email}: ${signUpError.message}`);
      continue;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      console.error(`✗ ${email}: no se obtuvo user id (¿requiere confirmación de email?)`);
      continue;
    }

    const { error: updateError } = await client
      .from('profiles')
      .update({ level, zone })
      .eq('id', userId);

    if (updateError) {
      console.error(`✗ ${email}: perfil creado pero fallo al actualizar nivel/zona: ${updateError.message}`);
      continue;
    }

    console.log(`✓ ${fullName} (${email}) — ${level} / ${zone}`);
  }

  console.log('\nListo. Contraseña de todas las cuentas: Padel1234!');
}

main();
