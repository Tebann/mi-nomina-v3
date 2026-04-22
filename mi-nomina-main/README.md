# mi-nomina

Aplicación web de gestión de nómina local-first, ahora preparada para:

- despliegue en GitHub Pages,
- autenticación con Google,
- sincronización de datos en la nube con Firebase Firestore,
- migración automática de datos locales en el primer login.

## Stack

- Vite + React
- TailwindCSS
- jsPDF
- Firebase Auth (Google)
- Firebase Firestore
- GitHub Pages (deploy por GitHub Actions)

## Requisitos

- Node.js 18+
- npm
- cuenta de GitHub
- proyecto en Firebase

## Instalación

```bash
npm install
```

## Variables de entorno

1. Duplica el archivo `.env.example` como `.env`.
2. Completa estos valores con los datos de tu app web en Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

3. Reinicia el servidor `npm run dev` después de editar `.env`.

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

---

## Configuración paso a paso de Firebase (Google Login + Firestore)

### 1. Crear proyecto

1. Abre https://console.firebase.google.com
2. Crea un proyecto nuevo (o usa uno existente).

### 2. Crear app web

1. En el proyecto, pulsa `</>` (Web app).
2. Registra la app con un nombre.
3. Copia el objeto de configuración y llena `.env`.

### 3. Activar login con Google

1. Ve a `Authentication` > `Sign-in method`.
2. Activa `Google`.
3. Guarda.

### 4. Crear Firestore

1. Ve a `Firestore Database`.
2. Crea la base en modo producción.
3. Selecciona región cercana.

### 5. Reglas de seguridad

1. Abre la pestaña `Rules` de Firestore.
2. Copia el contenido de `firestore.rules` y publícalo.

Regla usada:
- cada usuario solo puede leer/escribir sus propios datos.

### 6. Dominios autorizados para Auth

En `Authentication` > `Settings` > `Authorized domains`, agrega:

- `localhost` (para desarrollo)
- `tebann.github.io` (para producción en GitHub Pages)

---

## Migración automática de datos locales

Al primer login con Google:

1. La app busca datos en Firestore para ese `uid`.
2. Si no hay datos cloud, toma tu data local (`localStorage`) y la sube.
3. Si ya hay datos cloud, usa cloud como fuente principal.
4. Después, cada cambio se sincroniza automáticamente.

---

## Publicar gratis en GitHub Pages (muy detallado)

Este proyecto ya trae workflow listo en:

- `.github/workflows/deploy-pages.yml`
- `vite.config.js` (con `base: '/mi-nomina-v3/'`)

### Pasos en GitHub

1. Entra al repo `mi-nomina-v3`.
2. Ve a `Settings` > `Pages`.
3. En `Source`, selecciona `GitHub Actions`.
4. Ve a pestaña `Actions`.
5. Ejecuta o espera el workflow `Deploy to GitHub Pages`.
6. Cuando termine en verde, vuelve a `Settings` > `Pages`.
7. Verás la URL publicada.

### Secrets requeridos para producción (GitHub Actions)

Como `.env` no se sube al repositorio, debes crear estos Secrets en:

`GitHub > Repo > Settings > Secrets and variables > Actions > New repository secret`

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Si no los configuras, la web en GitHub Pages no podrá iniciar sesión con Google.

URL esperada:

```text
https://tebann.github.io/mi-nomina-v3/
```

### Si no carga

1. Verifica que el workflow terminó en verde.
2. Verifica que `Pages` siga en `GitHub Actions`.
3. Verifica que `tebann.github.io` esté en dominios autorizados de Firebase Auth.

---

## Estructura relevante

- `src/App.jsx` - app principal + migración local/cloud + UI
- `src/lib/firebase.js` - inicialización Firebase
- `src/lib/cloudStore.js` - auth + lectura/escritura en Firestore
- `.github/workflows/deploy-pages.yml` - deploy automático
- `vite.config.js` - base para GitHub Pages
- `firestore.rules` - reglas de seguridad sugeridas

## Notas

- `.env` no se sube al repositorio.
- La app funciona sin Firebase configurado, pero mostrará aviso y no permitirá login cloud hasta completar llaves.

## Licencia

MIT
