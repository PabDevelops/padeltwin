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

const AVATARS = [
  'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=400&fit=crop', // Laura García
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&fit=crop', // Pablo Sánchez
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&fit=crop', // Marta Fernández
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&fit=crop', // Carlos Ruiz
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&fit=crop', // Lucía Torres
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&fit=crop', // Javier Moreno
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&fit=crop', // Elena Gómez
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&fit=crop', // Diego Navarro
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&fit=crop', // Sara Jiménez
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&fit=crop', // Adrián Romero
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&fit=crop', // Paula Alonso
  'https://images.unsplash.com/photo-1483721310020-03333e577076?w=400&fit=crop', // Hugo Díaz
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&fit=crop', // Claudia Vega
  'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?w=400&fit=crop', // Mario Castro
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&fit=crop', // Inés Ortega
  'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=400&fit=crop', // Daniel Serrano
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&fit=crop', // Alba Molina
  'https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?w=400&fit=crop', // Sergio Iglesias
  'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&fit=crop', // Nuria Pascual
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&fit=crop', // Raúl Crespo
];

async function main() {
  console.log('Iniciando actualización de fotos de perfil para usuarios de prueba...');

  for (let i = 0; i < 20; i++) {
    const email = `test.player${i + 1}@padeltwin.test`;
    const password = 'Padel1234!';
    const avatarUrl = AVATARS[i];

    // Create client instance specifically for this user's auth context
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Sign in as the user
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error(`✗ Error de inicio de sesión para ${email}: ${authError.message}`);
      continue;
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error(`✗ No se pudo obtener el User ID para ${email}`);
      continue;
    }

    // 2. Update the profile avatar_url
    const { error: updateError } = await client
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      console.error(`✗ Error al actualizar foto de perfil para ${email}: ${updateError.message}`);
      continue;
    }

    console.log(`✓ Foto de perfil de padel actualizada con éxito para test.player${i + 1} (${email})`);
  }

  console.log('\nActualización completada para los 20 jugadores de prueba.');
}

main();
