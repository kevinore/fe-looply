# Plan de ejecución · Frontend (PWA)

> **Requisito previo:** la capa de backend está terminada (ver `plan-backend-db.md`, sección 16) y existe `frontend/openapi.json`.
> **Nombre de la plataforma:** pendiente. **Nunca** escribas "quefresh" ni "Qué Fresh" en código. El nombre, logo, colores y textos del negocio llegan desde la API (`branding`).

---

## 0. Instrucciones para Claude Code

1. Ejecuta las fases **en orden**. No avances sin cumplir la "Verificación" de la fase.
2. Los pasos **[HUMANO]** los hace la persona: detente y espera.
3. **El frontend no decide reglas de negocio.** No calcula precios, descuentos, compras ni premios. Muestra lo que responde la API. Si una pantalla necesita un dato que la API no da, detente y pregunta; no lo calcules.
4. Los mockups de referencia usan IDs (`01`, `C1`, `S2`, `R3`…). Cada pantalla de este plan cita su ID. **[HUMANO]** debe dejar las imágenes de los mockups en `frontend/docs/mockups/` con el ID en el nombre de archivo.
5. Nunca guardes tokens ni datos de sesión en `localStorage`, `sessionStorage` ni IndexedDB. La sesión vive **solo** en cookies httpOnly que pone el servidor. (Única excepción: la clave de idempotencia de un giro, sección 8.4.)
6. Tras cada fase: `npm run lint`, `npm run typecheck`, `npm run test`. Todo en verde.
7. Commits pequeños por paso.

---

## 1. Qué construimos

Una sola aplicación con dos zonas:

| Zona | Ruta | Usuario | Prioridad |
|---|---|---|---|
| Cliente | `/c/*` | Cliente del negocio, desde su celular | **Liviana y rápida**: carga en < 2 s con datos móviles |
| Operador | `/op/*` | Dueño y operador, en el celular del punto | Completa y rápida de operar: venta de 3 bebidas en < 5 s |

Sin modo offline. Si no hay conexión, se muestra un mensaje claro y un botón para reintentar.

---

## 2. Stack fijado

| Pieza | Elección |
|---|---|
| Base | Vite + React + TypeScript (estricto) |
| Rutas | React Router |
| Datos del servidor | TanStack Query |
| Estado local (carrito) | Zustand |
| Cliente de API | `openapi-typescript` (tipos) + `openapi-fetch` (llamadas) |
| Estilos | Tailwind CSS |
| Formularios | Validación con `zod` |
| PWA | `vite-plugin-pwa` |
| QR (generar) | `qrcode` |
| QR (escanear dentro de la app) | `qr-scanner` |
| Pruebas | Vitest + Testing Library, Playwright |
| Calidad | ESLint + Prettier |
| Hosting | Vercel |

Usa la última versión estable de cada librería.

---

## 3. Fase 1 · Proyecto

### 3.1 Crear

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm i react-router-dom @tanstack/react-query zustand openapi-fetch zod qrcode qr-scanner
npm i -D openapi-typescript tailwindcss @tailwindcss/vite vite-plugin-pwa vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test eslint prettier @types/qrcode
```

### 3.2 Estructura

```
frontend/
  src/
    main.tsx
    app/
      router.tsx          # rutas; /op cargado de forma diferida
      queryClient.ts
    api/
      schema.d.ts         # GENERADO desde openapi.json. No editar a mano.
      client.ts           # instancia de openapi-fetch
      errors.ts           # mapa código de error → mensaje
    brand/
      BrandProvider.tsx   # aplica branding como variables CSS
    ui/                   # componentes base
    features/
      customer/           # pantallas y lógica del cliente
      operator/           # pantallas y lógica del operador
    lib/
      money.ts            # formato COP
      phone.ts            # formato de celular en vivo
      device.ts           # detección de iOS/Android/navegador/instalada
      wakeLock.ts
      wheel.ts            # cálculo de ángulos de la ruleta
      events.ts           # envío de eventos del cliente
  public/
    icons/
  docs/mockups/           # [HUMANO] imágenes de referencia
  openapi.json            # exportado por el backend
  vercel.json
```

### 3.3 Scripts en `package.json`

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "gen:api": "openapi-typescript openapi.json -o src/api/schema.d.ts",
  "lint": "eslint .",
  "typecheck": "tsc -b --noEmit",
  "test": "vitest run",
  "e2e": "playwright test"
}
```

### 3.4 Proxy de desarrollo (mismo origen, igual que producción)

`vite.config.ts`:
```ts
server: {
  proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: false } }
}
```
En desarrollo, el backend usa `COOKIE_SECURE=false` y `ALLOWED_ORIGINS=http://localhost:5173`.

### 3.5 Cliente de API (`src/api/client.ts`)

- `createClient<paths>({ baseUrl: '' })` — rutas relativas, siempre `/api/...`.
- `credentials: 'include'` en todas las peticiones.
- Todas las peticiones que escriben envían `Content-Type: application/json`.
- Un envoltorio `unwrap(res)` que:
  - Si la respuesta es exitosa, devuelve `data`.
  - Si trae `{ error: { code, message, extra } }`, lanza `ApiError(code, status, extra)`.
  - Si no hay conexión (falla de red), lanza `ApiError('network_error')`.

### 3.6 Mensajes de error (`src/api/errors.ts`)

Mapa de **todos** los códigos de la tabla 14.2 del plan de backend al mensaje en español, más:
- `network_error` → "Sin conexión. Revisa tu señal e intenta de nuevo."

Regla: **nunca** mostrar al usuario un código técnico, un número HTTP ni un texto en inglés.

### 3.7 [HUMANO] Vercel
1. Importar el repositorio, carpeta raíz `frontend/`.
2. Conectar el dominio propio.

### 3.8 `vercel.json`

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<DOMINIO-RAILWAY>/api/:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'" }
      ]
    }
  ]
}
```

**Por qué el rewrite es crítico:** el navegador ve la API en el mismo dominio que la app. Así las cookies del servidor son de "primera parte" y Safari en iPhone (y Chrome en iPhone, que usa el mismo motor) las conserva entre visitas. Sin esto, la sesión del cliente se perdería.

### Verificación Fase 1
- `npm run gen:api` genera `schema.d.ts` sin errores.
- `npm run dev` con el backend local: `fetch('/api/health')` desde la consola del navegador responde `ok`.

---

## 4. Fase 2 · Sistema de diseño

### 4.1 Marca dinámica (`BrandProvider`)

1. Zona cliente: `GET /api/c/business`. Zona operador: `business` de `GET /api/op/auth/me`.
2. Aplicar `branding.colors` como variables CSS en `:root`: `--brand-primary`, `--brand-secondary`, `--brand-ink`, `--brand-bg`.
3. Si falta un color, usar estos valores por defecto: primary `#E07AA6`, secondary `#5DA57E`, ink `#1A1A1A`, bg `#F4F1EC`.
4. Actualizar `<meta name="theme-color">` con `--brand-primary`.
5. `document.title` = `branding.display_name`.

Tailwind lee esas variables: `bg-brand-primary`, `text-brand-ink`, etc. **Ningún color del negocio va escrito a mano en componentes.**

### 4.2 Tipografía
- Títulos: serif de display, como en los mockups. **[HUMANO]** confirmar la fuente exacta; si no se define, usar `Fraunces`.
- Texto: sans-serif, `Inter` por defecto.
- Cargar solo los pesos usados.

### 4.3 Componentes base (`src/ui/`)

| Componente | Detalle |
|---|---|
| `Button` | Variantes: `primary`, `dark`, `secondary`, `ghost`, `danger`. Alto mínimo 48 px. Estado `loading` que desactiva y muestra indicador. |
| `Pill` | Etiquetas pequeñas (estado, tipo). |
| `Card` | Contenedor blanco con radio grande. |
| `BottomSheet` | Hoja inferior con fondo oscurecido (Cobrar, Premios de Ana). |
| `ProgressSegments` | N segmentos (N = `milestone_every`), rellenos según `progress`. |
| `Keypad` | Teclado numérico grande (búsqueda por 4 dígitos). |
| `DigitBoxes` | 4 casillas de dígitos. |
| `ProductTile` | Foto (o placeholder rayado), nombre, precio, contador de cantidad. |
| `Toast` | Mensajes breves. |
| `ErrorState`, `EmptyState`, `LoadingState` | Estados estándar de pantalla. |
| `Money` | Muestra COP con formato `$42.000`. |

### 4.4 Utilidades (`src/lib/`)

- `money.ts`: `formatCop(42000)` → `"$42.000"` (punto como separador de miles, sin decimales, sin espacio).
- `phone.ts`: `formatPhoneInput("3101234567")` → `"310 123 4567"`; `isValidColombianMobile(raw)` → 10 dígitos que empiezan por 3. Solo para ayudar al usuario; **la validación real la hace el backend**.
- `device.ts`: `isIOS()`, `isIOSChrome()` (user agent contiene `CriOS`), `isAndroid()`, `isStandalone()` (`matchMedia('(display-mode: standalone)')` o `navigator.standalone`).

### Verificación Fase 2
- Página interna `/dev/ui` (solo en desarrollo) que muestra todos los componentes.
- Pruebas unitarias de `formatCop` y `formatPhoneInput`.

---

## 5. Fase 3 · Rutas y carga

### 5.1 Tabla de rutas

| Ruta | Pantalla | Mockup |
|---|---|---|
| `/` | Redirige a `/c` | — |
| `/c` | Mi tarjeta, o "Escanea tu compra" si no hay sesión | C5 |
| `/c/claim/:token` | Entrada desde el QR (decide el flujo) | — |
| `/c/register/:token` | Registro | C1 |
| `/c/confirm/:token` | ¿Eres …? | C2 |
| `/c/claimed` | +1 compra | S2 |
| `/c/spin/:spinId` | Ruleta | C3 / S3 |
| `/c/prize/:awardId` | Premio ganado / detalle | M1 / C6 |
| `/c/prize/:awardId/use` | Quiero usar mi premio | M2 |
| `/c/scan` | Escáner interno | S1 |
| `/c/install` | Guardar en inicio | S0 |
| `/c/history` | Historial | C4 |
| `/op/login` | Login operador | — |
| `/op` | Abrir jornada o Venta | 01 / 02 |
| `/op/sale/:saleId/qr` | QR de venta | 04 |
| `/op/sale/:saleId` | Ficha de venta vinculada | 05 |
| `/op/search` | Buscar cliente | 06 |
| `/op/prizes` | Premios pendientes | R5 |
| `/op/summary` | Resumen y cierre | 07 |
| `/op/history` | Histórico | — |

### 5.2 Carga diferida
- Todo `/op/*` se importa con `React.lazy`. El cliente nunca descarga código del operador.
- **Presupuesto:** el JavaScript inicial de `/c/claim/:token` pesa ≤ 150 KB comprimido. Verificar con `vite build` y el reporte de tamaños.

### 5.3 Guardas
- `/op/*` (excepto login): `GET /api/op/auth/me`. Si 401 → `/op/login?next=<ruta>`.
- Cualquier respuesta 401 en `/op` durante el uso → llevar a login conservando la ruta.

---

## 6. Fase 4 · PWA

### 6.1 `vite-plugin-pwa`

```ts
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  manifest: false,                 // manifest propio en /public (ver 6.2)
  workbox: {
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [],            // NUNCA cachear respuestas de la API
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
  },
})
```

Reglas del service worker:
- Guarda solo la estructura de la app (HTML, JS, CSS, íconos, fuentes).
- **Jamás** guarda nada de `/api/*`. Los datos siempre vienen frescos.
- Actualización automática al desplegar una nueva versión.

### 6.2 Manifests

`public/manifest.webmanifest` (cliente):
```json
{
  "name": "<display_name del negocio>",
  "short_name": "<display_name corto>",
  "start_url": "/c",
  "scope": "/",
  "display": "standalone",
  "background_color": "#F4F1EC",
  "theme_color": "#E07AA6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`public/manifest-op.webmanifest`: igual pero `start_url: "/op"` y nombre "<negocio> · Operador". En las rutas `/op/*`, reemplazar el `href` del `<link rel="manifest">` por este archivo al montar.

> En el MVP el manifest es estático con los datos del primer negocio. Cuando haya un segundo negocio, se servirá dinámicamente. **[HUMANO]** entregar el logo en 512×512 para generar los íconos.

### 6.3 `index.html`
```html
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#E07AA6">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
Respetar áreas seguras del iPhone con `env(safe-area-inset-*)`.

### Verificación Fase 4
- Lighthouse (móvil) en `/c`: instalable y sin errores de PWA.
- En Chrome Android aparece la opción de instalar.

---

## 7. Fase 5 · Zona del cliente, pantalla por pantalla

**Regla general de cada pantalla:** cuatro estados diseñados: cargando, éxito, error (con botón Reintentar) y vacío cuando aplique.

### 7.1 Entrada desde el QR — `/c/claim/:token`

Esta ruta **no muestra UI propia**: decide adónde ir. Mientras decide, pantalla de carga con la marca.

1. Enviar evento `qr_scanned` (sin esperar respuesta).
2. En paralelo: `GET /api/c/claims/:token` y `GET /api/c/me`.
3. Según la vista previa `state`:
   - `already_claimed` → pantalla de mensaje "Esta compra ya fue reclamada" + botón "Ver mi tarjeta" (si hay sesión).
   - `expired` → "Este código venció. Pide al operador que lo busque por tus últimos 4 dígitos."
   - `voided` → "Esta compra fue anulada."
   - `not_found` → "No encontramos esa compra."
   - `claimable` → paso 4.
4. Si `GET /api/c/me` respondió 200 (hay sesión) → `POST /api/c/claim {claim_token}` → paso 5.
5. Si `GET /api/c/me` respondió 401 (sin sesión) → `navigate('/c/register/:token', { state: { preview } })`.
6. Resultado del reclamo:
   - Si `new_spins` tiene elementos → `/c/spin/<primer id>`.
   - Si no → `/c/claimed` con la tarjeta.
7. Si el reclamo falla con `claim_already_claimed` (alguien lo reclamó entre la vista previa y el reclamo) → mensaje del paso 3.

### 7.2 Registro — C1 `/c/register/:token`

Contenido: encabezado "Tu compra ya cuenta." + chip con la compra (`items_count` bebidas · total) + mascota/logo desde branding.

Campos:
1. **Celular:** prefijo `+57` fijo y no editable. `<input type="tel" inputmode="numeric" autocomplete="tel-national">`. Formato en vivo `310 123 4567`. Máximo 10 dígitos.
2. **Nombre:** `autocomplete="given-name"`, 2 a 30 caracteres.
3. **Consentimiento:** casilla **sin** marcar por defecto + texto "Acepto el tratamiento de mis datos según la política de privacidad (Ley 1581 de 2012)" con enlace a `branding.privacy_policy_url`.

Botón: **"Girar la ruleta"**, desactivado hasta que celular (10 dígitos, empieza por 3), nombre y consentimiento sean válidos.

Al enviar:
1. Enviar evento `register_viewed` al montar la pantalla (una vez).
2. `POST /api/c/register { phone: "+57" + dígitos, alias, consent: true, claim_token }`.
3. Botón en estado `loading`; no permitir doble envío.
4. Respuestas:
   - 200/201 → igual que 7.1 paso 6.
   - `customer_exists` → `navigate('/c/confirm/:token', { state: { phone, alias: extra.alias, last4: extra.phone_last4 } })`.
   - `invalid_phone` → error bajo el campo celular.
   - `claim_*` → mensajes de 7.1 paso 3.
   - Otros → toast con el mensaje del mapa.

Pie: "Sin contraseña · sin descargas · 20 segundos".

### 7.3 ¿Eres …? — C2 `/c/confirm/:token`

- Si se entra sin `state` (recarga), volver a `/c/claim/:token`.
- Texto: "El número 310 ••• 4567 ya está registrado. Confirma y sumamos la compra de hoy a tu tarjeta."
- **"Sí, soy yo"** → `POST /api/c/identify/confirm { phone, claim_token }` → igual que 7.1 paso 6.
- **"No, corregir número"** → evento `identity_rejected` → volver a C1 con el celular en foco y el nombre conservado.

### 7.4 +1 compra — S2 `/c/claimed`

- Datos: la tarjeta que devolvió el reclamo (pasada por `state`; si no hay, `GET /api/c/me`).
- Muestra: "¡Hola, {alias}!", "+1 compra", `ProgressSegments`, texto "{progress} de {milestone_every} compras · faltan {purchases_to_next_spin} para girar".
- Si `counted === false`: texto "Ya sumaste tu compra de hoy. ¡Gracias por volver!" en lugar de "+1 compra". Con la regla R8 actual (1 sello por venta) el backend siempre envía `counted = true`; el texto se conserva por si la regla vuelve a ser por jornada.
- Botón **"Listo"** → `/c`.
- Si es la primera compra del cliente y no está instalada → después de "Listo", ir a `/c/install` (una sola vez por dispositivo; recordar con una cookie no sensible `install_prompt_seen=1` puesta por el frontend, 180 días).

### 7.5 Ruleta — C3 / S3 `/c/spin/:spinId`

Encabezado:
- Si el giro es `welcome`: "Gira, {alias}." + "Todas las casillas ganan."
- Si es `milestone`: pantalla S3 "¡Giro desbloqueado!" con progreso completo, y botón "Girar ahora" que muestra la rueda.

Carga: `GET /api/c/wheel` → segmentos. Dibujar la rueda en SVG con **segmentos iguales** (no reflejan probabilidades), cada uno con `short_label` y su color de marca.

Al tocar **"Girar"**:
1. Desactivar el botón inmediatamente.
2. Leer o crear la clave de idempotencia: `sessionStorage['spin:' + spinId]`; si no existe, `crypto.randomUUID()` y guardarla. (El backend es idempotente por giro; la clave sirve para detectar recargas en el cliente.)
3. `POST /api/c/spins/:spinId/spin`.
4. Con `segment_index` de la respuesta, animar (7.5.1).
5. Al terminar la animación → `/c/prize/:awardId` (M1).

Recarga en medio: al montar, si `sessionStorage['spin:' + spinId]` existe, llamar de nuevo `POST .../spin` (devuelve el mismo premio) y mostrar directamente el resultado sin animar.

Errores: `spin_not_found` o `spin_not_available` → mensaje + botón "Ver mi tarjeta".

Pie: "Si cierras la app, tu premio queda guardado."

#### 7.5.1 Animación (`src/lib/wheel.ts`)

```ts
// n segmentos iguales, puntero arriba (0°), rueda gira en sentido horario
export function targetRotation(index: number, n: number, currentRotation: number): number {
  const seg = 360 / n;
  const center = index * seg + seg / 2;           // centro del segmento en la rueda
  const jitter = (Math.random() - 0.5) * seg * 0.6; // no caer siempre en el centro exacto
  const base = currentRotation - (currentRotation % 360);
  return base + 360 * 5 + (360 - center) + jitter; // 5 vueltas completas + alinear al puntero
}
```
- Transición CSS: `transform 3800ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`.
- Con `prefers-reduced-motion`: sin vueltas, mostrar el resultado directamente.
- Pruebas unitarias: para cada `index`, el ángulo final normalizado deja el centro del segmento bajo el puntero (tolerancia ± 30% del segmento).

### 7.6 Premio ganado — M1 `/c/prize/:awardId`

- `GET /api/c/prizes/:awardId`.
- Muestra: "¡Ganaste!", nombre del premio, "en una bebida · vence {fecha}".
- Pregunta "¿Lo usas ahora?":
  - **"Usar ahora"** → `/c/prize/:awardId/use` (M2).
  - **"Guardar para otra visita"** → `/c`.
- Si el premio está `redeemed` → "Ya usaste este premio". Si `expired` → "Este premio venció".

Detalle desde la tarjeta (C6): misma ruta, con fechas de ganado y vencimiento, y los pasos: "Pide tu bebida", "Dile tu nombre al operador: él lo redime desde tu ficha", "Máximo un premio por compra, sobre una bebida". Pie: "Activo · solo lo redime el operador".

### 7.7 Quiero usar mi premio — M2 `/c/prize/:awardId/use`

- Pantalla oscura de alto contraste para mostrarle al operador.
- Título: "Cuando te toque, dile: 'Quiero usar mi premio'".
- Tarjeta: NOMBRE `{alias}` · CELULAR `{últimos 4}` · PREMIO `{nombre}`.
- Consultar `GET /api/c/prizes/:awardId` **cada 3 segundos** (`refetchInterval`).
- Cuando `status === 'redeemed'` → animación de éxito "¡Premio aplicado!" y botón "Listo" → `/c`.
- Mantener la pantalla encendida (Wake Lock, 9.1).
- Botón "Mejor lo guardo" → `/c`.

### 7.8 Mi tarjeta — C5 `/c`

Sin sesión (`GET /api/c/me` → 401): pantalla con la marca y el texto "Para ver tu tarjeta, escanea el QR de tu próxima compra." + botón "Escanear" (S1). **No** hay formulario para ingresar el celular aquí: la identidad solo se recupera con una compra real (regla R5 del backend).

Con sesión:
- Evento `card_viewed`.
- Saludo con fecha: "Domingo 27 sep · Hola, {alias}".
- Tarjeta de marca: `{progress} de {milestone_every} compras` + `ProgressSegments` (el último segmento con la etiqueta "GIRO").
- Si hay `available_spins`: banner destacado "Tienes {n} giro(s) esperándote" → `/c/spin/<id>`.
- Botón **"Escanear mi compra"** → `/c/scan`.
- Lista "Premios activos ({n})": nombre + "Vence {fecha}". Toque → `/c/prize/:id`.
- Barra inferior: Tarjeta · Premios · Historial.

### 7.9 Escáner interno — S1 `/c/scan`

1. Pedir cámara trasera con `qr-scanner`.
2. Marco guía y texto "Apunta al QR de tu compra".
3. Al leer un código:
   - Parsear como URL. Aceptar solo si el **origen es el mismo de la app** y la ruta coincide con `/c/claim/<token>`.
   - Válido → `navigate('/c/claim/<token>')`.
   - Inválido → "Este código no es de una compra" y seguir escaneando.
4. Permiso denegado o sin cámara: "Dile al operador tus últimos 4 dígitos: {last4}" (el last4 viene de la tarjeta).
5. Liberar la cámara al salir de la pantalla.

> Nota: si el cliente escanea el QR con la **cámara normal** del celular, el sistema abre `/c/claim/:token` y todo funciona igual (7.1).

### 7.10 Guardar en inicio — S0 `/c/install`

Mostrar solo si `!isStandalone()`. Evento `install_prompt_shown`.

| Dispositivo | Contenido |
|---|---|
| Android (Chrome) | Botón **"Agregar a inicio"** que dispara el evento `beforeinstallprompt` guardado. Si el usuario acepta → evento `install_prompt_accepted`. |
| iPhone + Safari | Pasos: 1) Toca **Compartir**. 2) Elige **Agregar a inicio**. |
| iPhone + Chrome | Pasos: 1) Toca **Compartir** (en la barra de Chrome). 2) Elige **Agregar a inicio**. |
| Otro | No mostrar la pantalla. |

Botón secundario "Ahora no" → `/c`.

Capturar `beforeinstallprompt` en `main.tsx` al arrancar (llamar `preventDefault()` y guardarlo en memoria).

### 7.11 Historial — C4 `/c/history`
`GET /api/c/history`: lista por fecha con productos, total y premio usado. Estado vacío: "Todavía no tienes compras."

### 7.12 Eventos del cliente (`src/lib/events.ts`)
- `sendEvent(type, payload?, saleId?)`: `POST /api/c/events` con `client_ts`. Usar `navigator.sendBeacon` si está disponible; si falla, ignorar en silencio. **Nunca** bloquear la interfaz por un evento.
- `page_loaded` con `load_ms = performance.now()` cuando la primera pantalla termina de renderizar.

### Verificación Fase 5
- Recorrer F1, F2 y F3 contra el backend local con datos de prueba.
- Pruebas de componentes: C1 (validación y desactivación del botón), S2 (con `counted` verdadero y falso), C3 (idempotencia en recarga).

---

## 8. Fase 6 · Zona del operador, pantalla por pantalla

### 8.1 Login — `/op/login`
- Email (`autocomplete="username"`) y contraseña (`autocomplete="current-password"`).
- `POST /api/op/auth/login` → redirigir a `next` o `/op`.
- `invalid_credentials` → mensaje bajo el formulario. `rate_limited` → mensaje de espera.

### 8.2 Abrir jornada — 01 `/op` (sin jornada abierta)
- `GET /api/op/workdays/current` → `null`.
- Muestra: "Buenos días, {nombre}", fecha local larga ("Domingo 4 de octubre"), tipo (Domingo / Festivo / Otro día), clima si ya existe, y la última jornada (desde `GET /api/op/stats/history`).
- **"Abrir jornada"** → `POST /api/op/workdays/open` → pantalla de venta.
- `workday_already_open` → ir directo a la venta.
- `workday_already_closed_today` → "La jornada de hoy ya se cerró" + botón al resumen.

### 8.3 Venta — 02 `/op` (con jornada abierta)

Datos: `GET /api/op/products` (cachear 5 minutos).

Estado del carrito (Zustand, **solo en memoria**):
```ts
type Cart = {
  lines: Record<productId, number>;   // cantidades
  customer: CustomerSummary | null;   // si se vinculó antes de cobrar (F5)
  prize: { awardId: string; targetProductId: string; preview: {...} } | null;
  idempotencyKey: string | null;      // se crea al abrir Cobrar
};
```

Interacción:
- Tocar un producto: +1. Mantener presionado 500 ms: −1 (con vibración corta si está disponible).
- Contador `×N` sobre el producto.
- Encabezado: "Jornada abierta · venta {n}".
- Barra inferior: "{n} bebidas" + total **estimado** (suma de precios del catálogo; el total real lo calcula el backend) + botón **"Cobrar"** (desactivado con carrito vacío).
- Botón secundario **"Cliente"** en el encabezado → `/op/search?mode=attach` (F5).
- Si hay cliente vinculado (R1): banda verde superior "{alias} · 310 ••• {last4} · {progress} de {every} compras" con ✕ para quitarlo, y banda rosa "{alias} tiene {n} premios · Aplicar" si tiene premios activos.

### 8.4 Cobrar — 03 (hoja inferior)

Al **abrir** la hoja: si `idempotencyKey` es `null`, crear `crypto.randomUUID()` y guardarlo en el carrito. Así un doble toque en Cobrar reutiliza la misma clave y el backend no duplica la venta.

Contenido:
- "Cobrar" + total estimado + resumen de líneas.
- Si hay premio aplicado: línea "Premio {nombre} · {producto}" con el descuento estimado en rojo (el valor final lo da el backend).
- Medios de pago en cuadrícula: **Efectivo**, **Nequi**, **Bre-B**, **Tarjeta**. Uno seleccionado (por defecto Efectivo).
- Botón **"Cobrar y mostrar QR"** (sin cliente) o **"Cobrar {total}"** (con cliente).
- Enlace "Volver al carrito".

Al confirmar:
1. `POST /api/op/sales` con cabecera `Idempotency-Key` y cuerpo `{items, payment_method, customer_id, prize_award_id, prize_target_product_id}`.
2. Éxito:
   - Venta **sin** cliente → vaciar carrito → `/op/sale/:id/qr`.
   - Venta **con** cliente → vaciar carrito → pantalla de confirmación R4 (8.9).
3. Error → toast con mensaje; **no** vaciar el carrito; conservar la clave de idempotencia para reintentar.

### 8.5 QR de venta — 04 `/op/sale/:saleId/qr`

- Fondo del color primario de la marca. "Venta {n} · {total} · {medio}". Título: "Escanea y gira la ruleta".
- QR generado con `qrcode` a partir de `claim_url`: SVG, corrección de errores `M`, mínimo 260 px, fondo blanco con margen blanco amplio. Logo pequeño al centro solo si sigue siendo legible con corrección `M` (probarlo; si falla, quitarlo).
- Chip de estado: "Esperando escaneo…" con punto animado.
- Al montar: evento `sale_qr_shown` y **Wake Lock** (9.1).
- Consultar `GET /api/op/sales/:id/status` **cada 2 segundos** mientras `status === 'paid'`. Detener cuando cambie, al salir de la pantalla o si pasan 10 minutos.
- Cuando `status === 'claimed'` → `/op/sale/:id` (05) con vibración corta.
- Botones:
  - **"Siguiente venta"** → evento `sale_skipped` → `/op`.
  - **"Buscar cliente"** → `/op/search?saleId=:id`.
  - **"Anular venta"** (enlace) → diálogo con motivo obligatorio (3–200 caracteres) → `POST /api/op/sales/:id/void` → `/op`.

### 8.6 Ficha de venta vinculada — 05 `/op/sale/:saleId`

- Banda verde: "✓ Vinculada por {QR|manual} · {hora}", inicial del nombre, alias, "310 ••• {last4}", progreso con texto "{faltan} para el próximo giro".
- "Premios activos · máx. 1 por venta": cada premio con botón **"Redimir"** si aplica (8.8).
  - `extra_item` y `free_item`: "Se entrega ya".
  - `percent_off`: "Próxima venta" (no se puede redimir sobre esta venta; el botón lleva a una venta nueva con el premio preseleccionado, 8.10).
- Aviso: "Confirma el nombre en persona antes de redimir."
- **"Siguiente venta"** → `/op`.
- Enlace **"Desvincular (no es {alias})"** → confirmación → `POST /api/op/sales/:id/unlink` → vuelve al QR (04). Si `sale_has_prize` → mensaje.

### 8.7 Buscar cliente — 06 `/op/search`

Parámetros: `?saleId=` (vincular una venta ya cobrada, F4) o `?mode=attach` (vincular antes de cobrar, F5), o `?mode=redeem` (F6).

- `DigitBoxes` + `Keypad` grande.
- Al completar 4 dígitos → `GET /api/op/customers/search?last4=`.
- Resultados: inicial, alias, "310 ••• {last4} · {compras} compras · {n} premios" + botón **"Vincular"** (o "Elegir" en `mode=attach`/`redeem`).
- Acción según el modo:
  - `saleId` → `POST /api/op/sales/:saleId/link {customer_id}` → 05.
  - `mode=attach` → guardar el cliente en el carrito → volver a 02.
  - `mode=redeem` → 8.8 sobre la venta más reciente del cliente en la jornada.
- Sin resultados: "Nadie con esos 4 dígitos."
- "Borrar" y "Listo" en el teclado.

### 8.8 Redimir premio sobre venta cobrada — M3 (F6)

Hoja inferior "{premio} ¿en cuál bebida?":
- Encabezado: "{alias} · 310 ••• {last4} · encontrada por {last4}".
- `extra_item`: lista de bebidas de la venta para elegir a cuál va el extra (informativo) → botón **"Entregado"**.
- `free_item`: lista de productos activos para elegir cuál se entrega → botón **"Entregado"**.
- Resumen: "Se registra en su venta de hoy · {n} bebidas · {total} · + {premio} $0 · No se cobra nada más".
- `POST /api/op/sales/:saleId/redeem-prize { prize_award_id, product_id }`.
- Éxito → toast "Premio entregado" → 05 actualizado.
- `discount_needs_new_sale` → abrir venta nueva con el premio preseleccionado (8.10).

### 8.9 Premios de un cliente antes de cobrar — R2 y R3 (F5)

- Desde la banda rosa de 02, **"Aplicar"** abre la hoja "Premios de {alias}":
  - Lista de premios activos con radio de selección (vencimiento y fecha en que se ganó).
  - "¿A qué bebida?": solo productos que están en el carrito.
  - Nota: "Se sugiere la bebida más cara. Tope en bebida gratis: {max_value_cop}".
  - Botón **"Aplicar · −{descuento estimado}"**.
- Guardar `prize` en el carrito y volver a 02; la hoja de Cobrar (R3) muestra la línea del premio y el total con descuento.
- "Quitar premio" en la hoja de Cobrar.
- **R4 confirmación** (después de cobrar con cliente): "Cobrada · {total}", "Venta {n} · {medio} · {alias}", tarjeta "Registro del premio" (premio, venta, descuento, operador, hora) y, si el backend devolvió `new_spins`, tarjeta "+1 compra · {progress} de {every} · Giro desbloqueado · {alias} lo gira desde su tarjeta". Botones **"Siguiente venta"** y enlace "Anular venta".

### 8.10 Venta nueva con descuento — M4 (F6 4b)
Igual que 02 con cliente y premio preseleccionados. La banda muestra "Buscada por {last4} · 2.ª venta hoy, no suma" cuando corresponda (el backend lo confirma con `counted` en la respuesta).

### 8.11 Premios pendientes — R5 `/op/prizes`
- `GET /api/op/prizes/pending?filter=expiring|free|all`.
- Pestañas: "Vencen en 7 días", "Gratis", "Todos".
- Filas: inicial, alias · last4, premio, "vence en {n} días".
- Pie: "Al buscar o vincular a un cliente con premios, el aviso aparece solo en la venta."

### 8.12 Resumen y cierre — 07 `/op/summary`
- `GET /api/op/stats/workdays/{id}`.
- Muestra: fecha y horario, **total**, ventas, bebidas, bebidas por venta, **% vinculadas** contra meta 40% (tarjeta destacada), gráfico de barras de ventas por hora con la mejor hora resaltada, efectivo vs digital con la frase "Cuadre: cuenta el efectivo de caja contra {efectivo}", top 3 productos.
- **"Cerrar jornada"** → diálogo de confirmación "¿Contaste el efectivo?" → `POST /api/op/workdays/current/close` → pantalla del resumen final en modo solo lectura.
- El gráfico se dibuja en SVG propio (sin librería de gráficos).

### 8.13 Histórico — `/op/history`
Rango de fechas (por defecto 30 días) → `GET /api/op/stats/history`: lista de jornadas (fecha, total, ventas, % vinculadas) y ranking de productos. Botón "Exportar CSV" (solo dueño) que abre `/api/op/export/sales.csv?from&to`.

### 8.14 Navegación del operador
Barra inferior en 02: **Venta** · **Buscar** · **Premios** · **Resumen**. Menú con "Histórico" y "Cerrar sesión" (`POST /api/op/auth/logout`).

### Verificación Fase 6
- Recorrer F4, F5, F6 y F7 completos contra el backend local.
- Prueba de componente: doble toque en "Cobrar y mostrar QR" envía **una** sola `Idempotency-Key`.

---

## 9. Fase 7 · Capacidades del dispositivo

### 9.1 Pantalla siempre encendida (`src/lib/wakeLock.ts`)
- `navigator.wakeLock.request('screen')` en 04 (QR), 02 (venta) y M2 (usar premio).
- Volver a pedirlo en `visibilitychange` cuando la página vuelve a ser visible.
- Liberarlo al salir de la pantalla.
- Si el navegador no lo soporta, continuar sin él (funciona en iPhone desde iOS 16.4 y en Chrome Android).

### 9.2 Cámara
Solo en S1. Liberar siempre la cámara al desmontar.

### 9.3 Vibración
`navigator.vibrate(40)` al vincularse un cliente en 04 y al restar en 02. Si no existe (iPhone), ignorar.

### 9.4 Sin conexión
- Escuchar `online`/`offline`. Banda superior "Sin conexión" cuando `navigator.onLine === false`.
- TanStack Query: reintentar 2 veces las lecturas; **nunca** reintentar automáticamente peticiones que escriben (excepto las que llevan clave de idempotencia, y solo con acción del usuario).

---

## 10. Fase 8 · Accesibilidad y uso al sol

- Contraste AA mínimo en todo texto.
- Objetivos táctiles de al menos 48 × 48 px.
- Tamaño de fuente del cuerpo mínimo 16 px (evita el zoom automático de iPhone en campos).
- QR siempre sobre blanco puro, con margen.
- Etiquetas accesibles en botones con solo ícono.
- Soporte de `prefers-reduced-motion`.

---

## 11. Fase 9 · Pruebas

### 11.1 Unitarias (Vitest)
`formatCop`, `formatPhoneInput`, `isValidColombianMobile`, `targetRotation`, detección de dispositivo, `unwrap` y mapa de errores (todo código de la tabla 14.2 tiene mensaje).

### 11.2 De componentes
C1, C2, S2, C3, 02 (carrito), 03 (idempotencia), 04 (sondeo se detiene al vincular), 06.

### 11.3 De punta a punta (Playwright)
Contra backend local con base de prueba y datos semilla. Proyectos: `Mobile Safari` (WebKit) y `Pixel 7` (Chromium). Dos contextos de navegador simultáneos: uno como operador, otro como cliente.

| Prueba | Recorrido |
|---|---|
| F1 | Operador cobra → cliente abre la URL del QR → registra → gira → ve premio → operador ve "Vinculada" |
| F2 | Cliente con sesión abre la URL → +1 compra; en la 5.ª → giro desbloqueado |
| F3 | Nuevo contexto de cliente (sin cookie) con celular existente → ¿Eres …? → sí → +1 compra, sin giro |
| F4 | Cobrar → Siguiente venta → Buscar por 4 dígitos → Vincular |
| F5 | Cliente → Aplicar premio 10% → Cobrar → total con descuento → confirmación |
| F6 | Cliente gana extra → "Usar ahora" → operador redime → pantalla M2 del cliente cambia sola |
| F7 | Abrir jornada → 3 ventas → Resumen → Cerrar |
| Errores | QR ya reclamado, QR anulado, sin consentimiento, celular inválido |

### 11.4 Dispositivos reales (obligatorio antes del primer domingo)

| Dispositivo | Qué comprobar |
|---|---|
| iPhone + Safari | Registro; cerrar Safari; volver **al día siguiente**: la sesión sigue; Agregar a inicio y abrir desde el ícono |
| iPhone + Chrome | Mismo flujo; confirmar que la sesión es independiente de Safari y que "¿Eres …?" la recupera |
| Android + Chrome | Instalación con botón nativo; escáner interno |
| Android de gama baja | `/c/claim/:token` carga en < 2 s con datos móviles 4G |
| Celular del operador | QR legible al sol a 50 cm; la pantalla no se apaga en 04; venta de 3 bebidas en < 5 s |

### 11.5 Rendimiento
Lighthouse móvil sobre `/c/claim/<token de prueba>`: Rendimiento ≥ 90, PWA instalable, Accesibilidad ≥ 90.

---

## 12. Fase 10 · Despliegue

1. Actualizar `vercel.json` con el dominio de Railway.
2. Variables de Vercel: ninguna es necesaria en el MVP (todo va por `/api`).
3. Desplegar a producción desde la rama `main`; vistas previas automáticas en otras ramas (apuntan a la API de `dev`: crear un segundo servicio de Railway con la rama `dev` de Neon **[HUMANO]**, o dejar las vistas previas sin backend).
4. Verificar en producción:
   - `https://<dominio>/api/health` → `ok` (prueba el rewrite).
   - Login de operador y cookie `op_session` presente con `HttpOnly` y `Secure`.
   - Cabeceras de seguridad presentes (revisar en las herramientas del navegador).
5. **Ensayo general [HUMANO]:** en casa, con datos móviles, 20 ventas simuladas cubriendo F1–F7 entre dos personas. Luego anular esas ventas y abrir la jornada real.

---

## 13. Entregable final de esta capa

- [ ] App en producción en el dominio propio.
- [ ] F1–F7 en verde en Playwright (WebKit y Chromium).
- [ ] Pruebas en los 5 dispositivos reales completadas.
- [ ] Cliente: del escaneo al premio en < 40 s.
- [ ] Operador: venta de 3 bebidas en < 5 s.
- [ ] Lighthouse dentro de los objetivos.
- [ ] Cero códigos técnicos visibles para el usuario.

## Pendientes de la persona
- [ ] Imágenes de los mockups en `docs/mockups/` con su ID.
- [ ] Fuente de títulos.
- [ ] Logo en 512 × 512 y fotos de productos.
- [ ] URL de la política de privacidad.
- [ ] Dominio.
