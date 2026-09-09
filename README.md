# Aetheris Casino & Sportsbook

Simulador de casino/apuestas 100% frontend (HTML/CSS/JS sin frameworks ni build),
con un backend ligero en **Google Apps Script** (gratis) que actúa como base de
datos (Google Drive) y API de autenticación.

## Estructura

```
juegos de azar/
├── index.html              # Punto de entrada único de la app
├── css/styles.css          # Estilos y temas
├── js/
│   ├── state.js            # Cliente de la API (sesiones, wallet, RTP, admin)
│   ├── gameEngine.js        # Sonido, confeti, carga de cada juego
│   ├── router.js            # Router por hash, UI de auth/wallet/admin
│   └── games/*.js           # Un módulo por cada uno de los 20 juegos
└── backend/
    └── drive_script.js      # Código a pegar en script.google.com (Apps Script)
```

> Antes había además `backend/core`, `backend/models`, `backend/services` y
> `frontend/` — un segundo intento de arquitectura (v2) que **nunca estuvo
> conectado a `index.html`** (código muerto). Se eliminó para no tener dos
> backends inconsistentes conviviendo en el repo.

## Cómo funciona la seguridad ahora

La versión anterior guardaba **toda la base de datos** (emails, hashes de
contraseña, saldos, y hasta el Access Token de Mercado Pago) en un archivo de
Drive que cualquiera con la URL podía leer con un simple `GET`, y el rol de
"administrador" se determinaba con datos que el propio navegador controlaba
(bastaba con abrir la consola y escribir `stateManager.state.currentUser =
'admin@...'`). Eso se corrigió:

- El backend ahora es una **API con sesiones** (`login`/`register` devuelven un
  token; cada acción sensible exige ese token y el servidor decide el rol).
- Los hashes de contraseña **nunca** salen del servidor. Se guardan con sal +
  un "pepper" secreto que solo vive en `backend/drive_script.js`.
- El **Access Token de Mercado Pago nunca llega al navegador**. Las
  preferencias de pago se crean desde el servidor, y el saldo solo se acredita
  cuando Mercado Pago confirma el pago por webhook (ya no al abrir el checkout).
- El código de verificación de registro/recuperación lo genera y valida el
  servidor (antes, cualquiera podía leerlo en su propia consola del navegador
  y resetear la contraseña de OTRA cuenta con solo saber su email).
- Bloqueo temporal de cuenta tras 5 intentos fallidos de login.
- Límite de multiplicador máximo por juego en el servidor, como red de
  seguridad ante resultados manipulados desde el cliente.

**Limitación que sigue existiendo:** el resultado de cada juego (si ganás y
cuánto) se calcula en el JavaScript del navegador (`js/games/*.js`). Alguien
con conocimientos técnicos podría alterarlo desde la consola. Para una demo
esto es razonable; si esto fuera a manejar dinero real, ese cálculo debería
moverse al servidor. Queda documentado en `backend/drive_script.js`.

## Puesta en marcha en Linux (Servidor y Base de Datos Local)

Este proyecto incluye un servidor local en Python 3 que sirve el frontend y gestiona la base de datos localmente en Linux.

### Ejecución rápida:

1. Abre la terminal en esta carpeta.
2. Ejecuta el script de inicio:
   ```bash
   ./start_server.sh
   ```
   *(O ejecuta directamente: `python3 server.py`)*

3. Abre tu navegador e ingresa a:
   **http://localhost:8000**

La primera vez que arranca, se crea automáticamente el archivo `aetheris_db.json` en la raíz del proyecto con las cuentas de prueba iniciales. Todos los cambios de saldo, usuarios, apuestas e historial se guardarán localmente en este archivo.

---

## Opción 2: Backend en la Nube (Google Apps Script + Drive)

Si prefieres usar la versión remota en la nube:

1. Andá a https://script.google.com/ → **Nuevo proyecto**.
2. Borrá el código de ejemplo y pegá **todo** el contenido de `backend/drive_script.js`.
3. Configura la implementación como Aplicación web y copia la URL en `js/state.js`.


### 3. Mercado Pago (opcional)

Si querés depósitos reales: entrá al panel admin de la app (`#admin`) logueado
como administrador, y cargá tu *Public Key* y *Access Token* de Mercado Pago
(los sacás de tu cuenta de desarrollador de Mercado Pago, plan gratuito). El
Access Token se guarda únicamente en el backend, nunca se vuelve a mostrar en
el navegador.

## Cuentas de prueba

| Rol   | Email                         | Contraseña |
|-------|-------------------------------|------------|
| User  | user@aetheris.com             | user123    |
| Admin | admin@aetheris.com            | admin123   |
| Admin | jacobocastelblanco@gmail.com  | admin1234  |

Cambiá estas contraseñas (o borrá esas cuentas) antes de compartir la URL
públicamente.
