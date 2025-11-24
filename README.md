# Sistema de Chat Colaborativo en Tiempo Real

Este proyecto es una aplicación de chat en tiempo real diseñada para facilitar la comunicación colaborativa entre usuarios. Permite mensajería privada, un chat global ("CollabSketch"), autenticación con Google y sesiones temporales para invitados.

## 🎯 Objetivo del Proyecto

El objetivo principal es proporcionar una plataforma robusta y eficiente para la comunicación instantánea. Las características clave incluyen:

*   **Comunicación en Tiempo Real:** Uso de WebSockets (Socket.io) para mensajería instantánea sin recargas de página.
*   **Privacidad y Colaboración:** Soporte tanto para chats privados 1 a 1 como para una sala global de colaboración.
*   **Experiencia de Usuario Fluida:** Actualizaciones optimistas de UI, notificaciones de conexión/desconexión y estado de usuarios (Online/Offline).
*   **Flexibilidad de Acceso:** Inicio de sesión seguro con Google y acceso rápido mediante cuentas de invitado temporales que se autodestruyen al salir.

## 🚀 Cómo Inicializar el Proyecto

El proyecto está dividido en dos partes: `backend` (API y WebSockets) y `frontend` (Interfaz de Usuario).

### Prerrequisitos

*   Node.js (v18 o superior)
*   PostgreSQL (Base de datos)

### 1. Configuración del Backend

1.  Navega a la carpeta del backend:
    ```bash
    cd backend
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Configura las variables de entorno:
    *   Crea un archivo `.env` basado en `.env.example`.
    *   Asegúrate de definir `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `COOKIE_KEY`.
4.  Configura la base de datos (Prisma):
    ```bash
    npx prisma generate
    npx prisma migrate dev
    ```
5.  Inicia el servidor:
    ```bash
    npm start
    ```
    *El servidor correrá en `http://localhost:5000`.*

### 2. Configuración del Frontend

1.  Abre una nueva terminal y navega a la carpeta del frontend:
    ```bash
    cd frontend
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```
    *La aplicación estará disponible en `http://localhost:3000`.*

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** Next.js, Tailwind CSS, Socket.io-client, Axios.
*   **Backend:** Node.js, Express, Socket.io, Prisma, Passport.js.
*   **Base de Datos:** PostgreSQL.

---
¡Disfruta chateando en **CollabSketch**!
