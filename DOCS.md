# PadelScrim — Documentación interna (Alpha)

Este documento explica qué es PadelScrim, cómo está construida, y en qué estado está cada
pieza. Pensado para poner al día a un socio/colaborador nuevo sin tener que leer el código.

## 1. Qué es

App móvil (iOS + Android, React Native/Expo) para jugadores de pádel: encontrar partidos,
encontrar compañero, jugar partidos con resultado oficial, y competir en rankings — todo
girando en torno a una puntuación de habilidad propia llamada **PS Score** (alias interno de
ELO) y, ahora, una pareja fija ranqueada.

Identidad de marca: estética "esports" — negro/violeta/lima, tipografía angulosa (Coubra para
el wordmark, Anton para títulos). Naming inspirado en League of Legends / Strava.

## 2. Stack técnico

- **Expo + React Native + TypeScript**, routing por archivos con **Expo Router**.
- **Supabase**: Postgres + Auth + Storage + Realtime. Toda la lógica de negocio sensible (cálculo
  de ELO, límites free/PRO, RLS) vive en **funciones SQL `security definer`**, no en el cliente —
  así un usuario no puede falsear su propio ranking llamando directamente a la API.
- **React Query** (`@tanstack/react-query`) para todo el fetching/cache (`lib/queries.ts`).
- **EAS Build/Update**: builds nativos (.apk/.ipa) vía `eas build`, actualizaciones de JS
  instantáneas (sin pasar por las stores) vía `eas update` (OTA) al canal `preview`.
- Cuenta de Expo/EAS: `pablodevelopss-team`, proyecto `padelscrim`.

### Build nativo vs. OTA — importante

- Cambios de **JS/UI/lógica** → `eas update` (OTA). Los usuarios lo reciben solo. Tarda segundos
  en publicarse, pero **el dispositivo necesita reabrir la app dos veces** para aplicarlo (la
  primera apertura solo descarga la actualización).
- Cambios que toquen **módulos nativos, permisos, iconos de app, splash, o config de plugins**
  (ej. el selector de fecha nativo, fuentes registradas a nivel nativo) → necesitan un **build
  nuevo** (`eas build --profile preview --platform android`) y reinstalar el `.apk`. OTA no
  puede aplicar estos cambios.

## 3. Modelo de negocio (Free vs. PRO)

Todo lo de pago hoy es un único flag `profiles.is_pro` (booleano). No hay todavía cobro real
integrado (sin Stripe ni similar) — es un interruptor manual a falta de checkout. Los límites
ya están implementados y aplicados **en el servidor** (no se pueden saltar desde el cliente):

| Funcionalidad | Free | PRO |
|---|---|---|
| Parejas ranqueadas declaradas (Duo Queue) | hasta 2 | ilimitadas |
| Ligas (ciudad/país) que una pareja puede unirse | 1 | 5 |
| Clubes KOP que una pareja puede contestar | 1 | 5 |
| Crear Ligas privadas (legacy, en desuso) | — | — |

## 4. Funcionalidades, una por una

### 4.1 Cuenta y onboarding
- Registro/login con email+password (Supabase Auth).
- Onboarding obligatorio tras registrarse: nivel autopercibido + cuestionario (años jugando,
  experiencia competitiva, frecuencia semanal) que calcula un **PS Score de salida** distinto
  para cada perfil (dos "intermedios" no arrancan ambos en 1200) — `lib/eloPlacement.ts`.
- **Ubicación verificada por GPS, no editable a mano** (`components/VerifiedLocation.tsx`):
  ciudad y país solo se rellenan haciendo reverse-geocoding del GPS real del dispositivo. Esto
  es deliberado — evita que alguien ponga una ciudad falsa y rompa los rankings de Liga.

### 4.2 PS Score (ELO)
- Cada jugador tiene `profiles.elo`, empieza según el cuestionario de onboarding.
- Sube/baja al confirmarse el resultado de un partido (`match_results`), vía trigger SQL
  (`apply_elo_change`, K=48 los primeros 5 partidos — "provisional" — luego K=32).
- Fórmula estándar de ELO + multiplicador por diferencia de juegos (una manita pesa más que un
  ajustado al tercero).
- Al crear un partido, el rango de nivel requerido ya no es una etiqueta manual
  ("principiante/intermedio") — se **deriva del PS Score del creador ± 100** y se **fuerza en
  servidor**: un jugador fuera de ese rango no puede unirse, ni siquiera manipulando la app.

### 4.3 Partidos
- Buscador con filtros (zona, nivel, fecha) — `app/(tabs)/index.tsx` ("Match Feed").
- Crear partido: fecha/hora con selector nativo, modo Individual o Pareja, visibilidad
  Abierto/Cerrado, 4 jugadores fijos (el pádel siempre es 4).
- Registrar resultado tras jugar: marcador set a set, confirmación del rival (estado
  pending → confirmed/disputed) antes de que afecte al ELO.

### 4.4 Compañeros (Partners)
- Grid de jugadores compatibles por nivel/zona, solicitud de contacto, chat 1:1 en tiempo real
  una vez aceptada la solicitud (Supabase Realtime).

### 4.5 Parejas ranqueadas (Duo Queue / Pair Divisions)
- Tras tener un compañero aceptado, podéis **declarar una pareja fija** (`declare_pair()`):
  ELO propio de pareja (parte del promedio de ambos), independiente del ELO individual, que
  solo se mueve cuando jugáis juntos un partido confirmado en modo pareja.
- División por tramos de ELO de pareja (Circuit Apex → Rookie Stage) — `lib/pairDivisions.ts`.
- Límite: 2 parejas declaradas en Free, ilimitadas en PRO.
- Pantalla: `/pairs`, accesible desde Perfil ("DUO QUEUE — Manage your fixed pair").

### 4.6 Ligas (city/country) — por pareja
- **El padel se juega de dos**, así que Ligas las une una pareja, no un jugador suelto.
- "Liga" no es una fila en base de datos — es una etiqueta `(kind, value)`, p.ej.
  `('city', 'Edinburgh')`. Cualquier pareja puede unirse a la suya, o a otras (turismo
  competitivo), respetando el cupo 1 free / 5 PRO (`join_pair_league()`).
- Ranking dentro de una liga = ELO de la pareja, entre todas las parejas unidas a esa
  `(kind, value)`.
- Pantallas: `/leagues` (hub), `/leagues/city`, `/leagues/country`.

### 4.7 KOP — King of the Court — por pareja
- Mismo principio que Ligas: una pareja se une a un club (`join_pair_club()`, mismo cupo 1/5),
  y la corona del club es la pareja con más ELO de pareja entre las unidas a ese club.
- Pantalla: `/club-leaderboard`. Visible y resaltado en el menú inferior (icono de corona,
  se ilumina en lima cuando estás en esa pantalla).
- **Pendiente de decisión de producto**: hoy KOP es gratis de usar (solo limitado en cupo de
  clubes); el plan a futuro es que sea una categoría exclusivamente de pago — aún no
  implementado, falta decidir el corte exacto.

### 4.8 Scrim Index (forma semanal) — nuevo
- Nota de 1.0 a 10.0, **separada del PS Score**: mientras el PS Score es una "piedra pesada"
  (nivel histórico, cuesta moverlo), el Scrim Index mide cómo estás jugando *ahora mismo*
  (ventana de tus últimos 5 partidos confirmados, o los de las últimas 2 semanas).
- Implementado hoy (`useScrimIndex` en `lib/queries.ts`):
  1. **Contundencia**: ganar por manita puntúa más que un ajustado al tercero; perder de
     cerca penaliza menos que una manita en contra.
  2. **Decay por inactividad**: más de 10 días sin partido confirmado, el índice empieza a
     bajar progresivamente.
  3. **Factor "Carry" / MVP** — **NO implementado todavía**. La idea (votos de MVP de los
     rivales tras el partido) requiere construir un sistema de votación que hoy no existe.
     Es la pieza que falta para que el Scrim Index esté completo según el diseño original.
- Se muestra en Perfil como una píldora junto al nombre ("7.4 · IN FORM").

### 4.9 KOP Thrones / "My Feuds" en Home y Liga hub
- Resumen visual de cuántas coronas de club tiene tu pareja, integrado en Home y en el hub de
  Ligas.

### 4.10 Coaches
- Listado de coaches por zona, perfil de coach con tarifa/experiencia/especialidades.
- Cualquier jugador puede solicitar contacto con un coach (`coach_leads`) — **sin pago
  integrado todavía**.
- **Idea pendiente de construir** (no iniciada): agendador de citas real — el alumno ve coaches
  por territorio, entra al perfil del coach, y **solo si es PRO** puede reservar y pagar la
  clase; PadelScrim liquida mensualmente al coach reteniendo una comisión. Implica un
  procesador de pagos real (Stripe Connect o similar) — **deliberadamente no empezado** hasta
  decidir cuenta/comisión; lo que sí está claro es el flujo (reserva → pago del alumno PRO →
  clase → liquidación mensual al coach menos comisión).

### 4.11 Social / Feed / Logros
- Seguir jugadores, feed de actividad de a quién sigues (logros + resultados confirmados),
  reacciones ("vib"), leaderboard filtrado a gente que sigues.
- Logros automáticos (primeros partidos, victorias, hitos de ELO).

### 4.12 Moderación
- Bloquear usuarios, reportar perfiles/partidos/resultados, panel de aprobación de coaches.

## 5. Cosas que existen en la base de datos pero ya no se usan en la UI

- `leagues` / `league_members` (ligas privadas por código de invitación) — sustituidas por las
  ligas oficiales de ciudad/país. Las tablas siguen ahí (por si había datos de prueba) pero no
  hay ninguna pantalla que las use.
- `tournaments` y relacionadas — funcionalidad de torneos, pausada explícitamente para centrar
  el producto en matchmaking/ELO en vez de gestión de torneos.

## 6. Seguridad — nota importante

La `service_role` key de Supabase (la que se salta RLS) **se compartió una vez por chat durante
el desarrollo para un script puntual y se trató como comprometida** — nunca se guardó en
ningún archivo del repo. Si en algún momento aparece otra vez una clave de este tipo en una
conversación, hay que rotarla desde el dashboard de Supabase y no commitearla nunca.

## 7. Estado a fecha de hoy / pendientes conocidos

- **Fuentes personalizadas (Coubra) no cargan de forma fiable en Android** — ya se intentó
  convertir el archivo a TTF y registrarlo también vía el plugin nativo de `expo-font`; falta
  lanzar un build nativo nuevo para confirmar si ese segundo intento lo resuelve del todo.
- Falta decidir si KOP pasa a ser una categoría exclusivamente de pago (hoy es gratis de usar,
  solo limitado en número de clubes).
- Scrim Index: falta el factor MVP/Carry (requiere construir votación de MVP post-partido).
- Coach booking + pagos: solo está el listado/contacto; el agendador con pago y comisión está
  en fase de idea, no de construcción.
- `/pairs` (gestión de pareja fija) y la pantalla legacy `league/[id].tsx` no muestran el menú
  inferior porque viven fuera del grupo de rutas con pestañas — funcional, pero visualmente
  inconsistente con el resto de la app.
