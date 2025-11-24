# Documentación Técnica - Sistema de Chat Colaborativo

## Descripción General
Este proyecto implementa un sistema de chat colaborativo en tiempo real utilizando **Node.js (Express)** para el backend y **Next.js (React)** para el frontend. La comunicación bidireccional se maneja a través de **Socket.io**, y la persistencia de datos se realiza con **PostgreSQL** y **Prisma ORM**. La autenticación se gestiona mediante **Google OAuth 2.0** (Passport.js).

## Estructura del Proyecto
El proyecto está dividido en dos carpetas principales:
- `backend/`: Servidor API y WebSocket.
- `frontend/`: Aplicación cliente Next.js.

### Tecnologías Clave
- **Backend**: Express, Socket.io, Prisma, Passport.js.
- **Frontend**: Next.js, Tailwind CSS, Socket.io Client, Axios.
- **Base de Datos**: PostgreSQL.

## Instrucciones de Ejecución

### Prerrequisitos
- Node.js instalado.
- PostgreSQL corriendo (localmente o en la nube como Render).
- Credenciales de Google OAuth (Client ID y Secret).

### Configuración del Backend
1.  Navega a la carpeta `backend`:
    ```bash
    cd backend
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Crea un archivo `.env` en `backend/` con el siguiente contenido:
    ```env
    PORT=5000
    DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_bd"
    GOOGLE_CLIENT_ID="tu_google_client_id"
    GOOGLE_CLIENT_SECRET="tu_google_client_secret"
    COOKIE_KEY="una_clave_secreta_random"
    ```
4.  Ejecuta las migraciones de Prisma:
    ```bash
    npx prisma migrate dev --name init
    ```
5.  Inicia el servidor:
    ```bash
    npm start
    ```
    El servidor correrá en `http://localhost:5000`.

### Configuración del Frontend
1.  Navega a la carpeta `frontend`:
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
    La aplicación estará disponible en `http://localhost:3000`.

## Implementación de WebSockets
La comunicación en tiempo real se maneja en `backend/server.js` y `frontend/src/app/chat/page.tsx`.

### Eventos Principales
- **`connection`**: Se dispara cuando un usuario entra al chat.
- **`join_chat`**: El cliente envía los datos del usuario. El servidor lo une a una sala privada con su `userId`.
- **`update_online_users`**: Emite la lista actualizada de usuarios conectados.
- **`send_message`**: Maneja mensajes privados (usando `receiverId`) y grupales. Si es privado, se envía a la sala del destinatario.
- **`get_chat_history`**: Recupera los mensajes previos entre dos usuarios específicos.
- **`receive_message`**: El cliente recibe un mensaje y decide si mostrarlo basado en el chat seleccionado.
- **`disconnect`**: Actualiza la lista de usuarios conectados al salir.

## Autenticación
Se utiliza **Passport.js** con la estrategia de Google.
1.  El usuario hace clic en "Login with Google" en el frontend.
2.  Es redirigido a `/auth/google` en el backend.
3.  Google valida y devuelve el control a `/auth/google/callback`.
4.  El backend crea una sesión y redirige al usuario al chat (`/chat`).

## Base de Datos (Prisma)
El esquema (`schema.prisma`) define dos modelos:
- **User**: Almacena ID de Google, nombre, email y avatar.
- **Message**: Almacena contenido, fecha y relación con el usuario emisor.
