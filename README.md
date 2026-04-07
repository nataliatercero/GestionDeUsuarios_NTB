# GestionDeUsuarios-NTB

# BildyApp - API de Gestión de Usuarios (Práctica Intermedia)

Este proyecto corresponde al desarrollo del backend del módulo de gestión de usuarios para BildyApp. La API permite el ciclo completo de vida de un usuario: desde el registro y la verificación de email hasta el onboarding de empresa, gestión de sesiones con Refresh Tokens y administración de roles.

## Tecnologías y Requisitos Técnicos

Se han implementado los requisitos obligatorios del curso:

- Node.js v22+ con arquitectura ESM (`"type": "module"`).
- MongoDB Atlas con Mongoose (uso de Virtuals, Indexes, Populate y Soft Delete).
- Autenticación con JWT:
  - Access Token (30 minutos)
  - Refresh Token (7 días) con claves independientes
- Validación con Zod usando `.transform()`, `.refine()` y `discriminatedUnion`.
- Arquitectura MVC:
  - `src/models`
  - `src/controllers`
  - `src/routes`
  - `src/middlewares`
  - `src/validators`
- Seguridad:
  - Helmet
  - Rate Limiting
  - Sanitización NoSQL
- EventEmitter para notificaciones de eventos (`user:registered`, `user:verified`, `company:created`, etc.)

## Instalación y Ejecución

1. Clonar el repositorio:
   `git clone <url-del-repo>`
   `cd GestionDeUsuarios_NTB`

2. Instalar dependencias:
   `npm install`

3. Configurar variables de entorno:

   Crea un archivo `.env` basado en `.env.example`. Es necesario definir:
   - JWT_SECRET_ACCESS
   - JWT_SECRET_REFRESH
   - DB_URI de MongoDB Atlas

4. Ejecutar en desarrollo:
   `npm run dev`

## Pruebas de la API (REST Client)

Se incluyen dos archivos de pruebas compatibles con la extensión REST Client de VS Code:

- `testREAL.http`: flujo principal (happy path) desde registro hasta borrado.
- `test.http`: pruebas completas con casos de error, validación, seguridad y extras.

## Funcionalidades Extra

- Cambio de contraseña (`PUT /api/user/password`):
  - Validación con Zod `.refine()` para asegurar coincidencia y diferencia con la anterior.

- Zod discriminatedUnion:
  - Validación de empresa dinámica según `isFreelance`.

- Gestión de tokens:
  - Refresh Token almacenado en base de datos.
  - Invalidación en logout (se establece como null).

- Papelera (soft delete):
  - Los administradores pueden ver usuarios eliminados de su propia empresa.
