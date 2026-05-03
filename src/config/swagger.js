import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BildyApp API',
      version: '1.0.0',
      description:
        'API REST para la digitalización de albaranes de obra. Permite gestionar usuarios, empresas, clientes, proyectos y albaranes con firma digital y generación de PDF.',
      contact: { name: 'BildyApp', email: 'soporte@bildy.app' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desarrollo local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token obtenido en /api/user/login o /api/user/register',
        },
      },
      schemas: {
        // ── Errores ──────────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'boolean', example: true },
            message: { type: 'string',  example: 'Descripción del error' },
            code:    { type: 'string',  example: 'NOT_FOUND' },
          },
        },
        // ── Paginación ───────────────────────────────────────────────────────
        Pagination: {
          type: 'object',
          properties: {
            totalItems:  { type: 'integer', example: 42 },
            totalPages:  { type: 'integer', example: 5  },
            currentPage: { type: 'integer', example: 1  },
          },
        },
        // ── Address ──────────────────────────────────────────────────────────
        Address: {
          type: 'object',
          properties: {
            street:   { type: 'string', example: 'Calle Mayor' },
            number:   { type: 'string', example: '12' },
            postal:   { type: 'string', example: '28001' },
            city:     { type: 'string', example: 'Madrid' },
            province: { type: 'string', example: 'Madrid' },
          },
        },
        // ── User ─────────────────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            _id:       { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0d' },
            email:     { type: 'string', example: 'usuario@empresa.com' },
            name:      { type: 'string', example: 'María' },
            lastName:  { type: 'string', example: 'García' },
            nif:       { type: 'string', example: '12345678A' },
            role:      { type: 'string', enum: ['admin', 'guest'] },
            status:    { type: 'string', enum: ['pending', 'verified'] },
            company:   { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0e' },
          },
        },
        // ── Company ──────────────────────────────────────────────────────────
        Company: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            name:        { type: 'string', example: 'Construcciones López S.L.' },
            cif:         { type: 'string', example: 'B12345678' },
            address:     { $ref: '#/components/schemas/Address' },
            logo:        { type: 'string', nullable: true },
            isFreelance: { type: 'boolean', example: false },
          },
        },
        // ── Client ───────────────────────────────────────────────────────────
        Client: {
          type: 'object',
          properties: {
            _id:     { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0f' },
            name:    { type: 'string', example: 'Promotora Pérez S.A.' },
            cif:     { type: 'string', example: 'A98765432' },
            email:   { type: 'string', example: 'contacto@promotora.com' },
            phone:   { type: 'string', example: '910000000' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        ClientInput: {
          type: 'object',
          required: ['name', 'cif'],
          properties: {
            name:    { type: 'string', minLength: 2, example: 'Promotora Pérez S.A.' },
            cif:     { type: 'string', minLength: 9, maxLength: 9, example: 'A98765432' },
            email:   { type: 'string', format: 'email' },
            phone:   { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        // ── Project ──────────────────────────────────────────────────────────
        Project: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            name:        { type: 'string', example: 'Reforma Oficinas Centro' },
            projectCode: { type: 'string', example: 'PRJ-2025-001' },
            client:      { $ref: '#/components/schemas/Client' },
            address:     { $ref: '#/components/schemas/Address' },
            email:       { type: 'string' },
            notes:       { type: 'string' },
            active:      { type: 'boolean', example: true },
          },
        },
        ProjectInput: {
          type: 'object',
          required: ['name', 'projectCode', 'client'],
          properties: {
            name:        { type: 'string', example: 'Reforma Oficinas Centro' },
            projectCode: { type: 'string', example: 'PRJ-2025-001' },
            client:      { type: 'string', description: 'ID del cliente', example: '664f...' },
            address:     { $ref: '#/components/schemas/Address' },
            email:       { type: 'string', format: 'email' },
            notes:       { type: 'string' },
            active:      { type: 'boolean', default: true },
          },
        },
        // ── DeliveryNote ─────────────────────────────────────────────────────
        Worker: {
          type: 'object',
          required: ['name', 'hours'],
          properties: {
            name:  { type: 'string', example: 'Juan García' },
            hours: { type: 'number', example: 8 },
          },
        },
        DeliveryNote: {
          type: 'object',
          properties: {
            _id:          { type: 'string' },
            project:      { $ref: '#/components/schemas/Project' },
            client:       { $ref: '#/components/schemas/Client' },
            user:         { $ref: '#/components/schemas/User' },
            format:       { type: 'string', enum: ['material', 'hours'] },
            description:  { type: 'string' },
            workDate:     { type: 'string', format: 'date' },
            material:     { type: 'string', example: 'Cemento Portland' },
            quantity:     { type: 'number', example: 50 },
            unit:         { type: 'string', example: 'kg' },
            hours:        { type: 'number', example: 8 },
            workers:      { type: 'array', items: { $ref: '#/components/schemas/Worker' } },
            signed:       { type: 'boolean', example: false },
            signedAt:     { type: 'string', format: 'date-time', nullable: true },
            signatureUrl: { type: 'string', nullable: true },
            pdfUrl:       { type: 'string', nullable: true },
          },
        },
        DeliveryNoteInput: {
          oneOf: [
            {
              title: 'Material',
              required: ['project', 'format', 'material', 'quantity', 'unit'],
              properties: {
                project:     { type: 'string' },
                format:      { type: 'string', enum: ['material'] },
                description: { type: 'string' },
                workDate:    { type: 'string', format: 'date' },
                material:    { type: 'string', example: 'Cemento Portland' },
                quantity:    { type: 'number', example: 50 },
                unit:        { type: 'string', example: 'kg' },
              },
            },
            {
              title: 'Horas',
              required: ['project', 'format'],
              properties: {
                project:     { type: 'string' },
                format:      { type: 'string', enum: ['hours'] },
                description: { type: 'string' },
                workDate:    { type: 'string', format: 'date' },
                hours:       { type: 'number', example: 8 },
                workers:     { type: 'array', items: { $ref: '#/components/schemas/Worker' } },
              },
            },
          ],
        },
      },
      // Respuestas reutilizables
      responses: {
        Unauthorized: {
          description: 'Token no proporcionado o inválido',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Recurso no encontrado',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        BadRequest: {
          description: 'Datos de entrada inválidos',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Conflict: {
          description: 'Conflicto de unicidad (duplicado)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    // ── Rutas ─────────────────────────────────────────────────────────────────
    paths: {
      // ── USER ──────────────────────────────────────────────────────────────
      '/api/user/register': {
        post: {
          tags: ['Usuarios'],
          summary: 'Registrar usuario',
          description: 'Crea una cuenta nueva. Devuelve un token JWT y envía el código de verificación por email.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['email', 'password'],
                  properties: {
                    email:    { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8, example: 'MiPass123!' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Usuario creado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, token: { type: 'string' }, refreshToken: { type: 'string' }, data: { $ref: '#/components/schemas/User' } } } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            409: { $ref: '#/components/responses/Conflict' },
          },
        },
        put: {
          tags: ['Usuarios'],
          summary: 'Onboarding — datos personales',
          description: 'Completa el perfil con nombre, apellido y NIF.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['name', 'lastName', 'nif'],
                  properties: {
                    name:     { type: 'string' },
                    lastName: { type: 'string' },
                    nif:      { type: 'string', minLength: 9 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Perfil actualizado' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/user/login': {
        post: {
          tags: ['Usuarios'],
          summary: 'Iniciar sesión',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['email', 'password'],
                  properties: {
                    email:    { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login correcto', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, token: { type: 'string' }, refreshToken: { type: 'string' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/user/validation': {
        put: {
          tags: ['Usuarios'],
          summary: 'Verificar email con código',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['code'], properties: { code: { type: 'string', minLength: 6, maxLength: 6, example: '482916' } } } } },
          },
          responses: {
            200: { description: 'Email verificado' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/user/me': {
        get: {
          tags: ['Usuarios'],
          summary: 'Obtener perfil propio',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Perfil del usuario autenticado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/user/company': {
        patch: {
          tags: ['Usuarios'],
          summary: 'Onboarding — empresa',
          description: 'Crea una empresa nueva o une al usuario a una existente por CIF. Requiere rol admin.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['isFreelance'],
                  properties: {
                    isFreelance: { type: 'boolean' },
                    name:        { type: 'string' },
                    cif:         { type: 'string' },
                    address:     { $ref: '#/components/schemas/Address' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Empresa creada o unión completada' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/user/logo': {
        patch: {
          tags: ['Usuarios'],
          summary: 'Subir logo de empresa',
          description: 'Sube una imagen como logo de la empresa. La imagen se optimiza con Sharp y se almacena en Cloudinary.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', required: ['logo'], properties: { logo: { type: 'string', format: 'binary' } } } } },
          },
          responses: {
            200: { description: 'Logo actualizado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { logo: { type: 'string' } } } } } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/user/invite': {
        post: {
          tags: ['Usuarios'],
          summary: 'Invitar usuario a la empresa',
          description: 'Crea un usuario con rol guest en la empresa del admin y le envía un email con las credenciales.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['email', 'name', 'lastName', 'nif'],
                  properties: {
                    email:    { type: 'string', format: 'email' },
                    name:     { type: 'string' },
                    lastName: { type: 'string' },
                    nif:      { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Invitación enviada' },
            401: { $ref: '#/components/responses/Unauthorized' },
            409: { $ref: '#/components/responses/Conflict' },
          },
        },
      },
      '/api/user/password': {
        put: {
          tags: ['Usuarios'],
          summary: 'Cambiar contraseña',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['currentPassword', 'newPassword', 'confirmPassword'],
                  properties: {
                    currentPassword:  { type: 'string' },
                    newPassword:      { type: 'string', minLength: 8 },
                    confirmPassword:  { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Contraseña actualizada' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/user/refresh': {
        post: {
          tags: ['Usuarios'],
          summary: 'Renovar access token',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } },
          },
          responses: {
            200: { description: 'Nuevo access token', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/user/logout': {
        post: {
          tags: ['Usuarios'],
          summary: 'Cerrar sesión',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Sesión cerrada' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/api/user/trash': {
        get: {
          tags: ['Usuarios'],
          summary: 'Listar usuarios eliminados (admin)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista de usuarios en papelera' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/api/user': {
        delete: {
          tags: ['Usuarios'],
          summary: 'Eliminar cuenta propia',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Cuenta eliminada' }, 401: { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/api/user/{id}': {
        delete: {
          tags: ['Usuarios'],
          summary: 'Eliminar usuario por ID (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Usuario eliminado' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
        },
      },

      // ── CLIENT ────────────────────────────────────────────────────────────
      '/api/client': {
        get: {
          tags: ['Clientes'],
          summary: 'Listar clientes',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'name',  in: 'query', schema: { type: 'string' }, description: 'Búsqueda parcial insensible a mayúsculas' },
          ],
          responses: {
            200: { description: 'Lista de clientes', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Client' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Clientes'],
          summary: 'Crear cliente',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ClientInput' } } } },
          responses: {
            201: { description: 'Cliente creado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Client' } } } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            409: { $ref: '#/components/responses/Conflict' },
          },
        },
      },
      '/api/client/archived': {
        get: {
          tags: ['Clientes'],
          summary: 'Listar clientes archivados',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Clientes con soft-delete', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Client' } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/client/{id}': {
        get: {
          tags: ['Clientes'],
          summary: 'Obtener cliente por ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Datos del cliente', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Client' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Clientes'],
          summary: 'Actualizar cliente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ClientInput' } } } },
          responses: {
            200: { description: 'Cliente actualizado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Client' } } } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
            409: { $ref: '#/components/responses/Conflict' },
          },
        },
        delete: {
          tags: ['Clientes'],
          summary: 'Eliminar cliente',
          description: 'Añade `?soft=true` para archivar en lugar de eliminar permanentemente.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id',   in: 'path',  required: true,  schema: { type: 'string' } },
            { name: 'soft', in: 'query', required: false, schema: { type: 'boolean' }, description: 'Si es true, hace soft-delete (archivar)' },
          ],
          responses: {
            200: { description: 'Cliente eliminado o archivado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/client/{id}/restore': {
        patch: {
          tags: ['Clientes'],
          summary: 'Restaurar cliente archivado',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Cliente restaurado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Client' } } } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── PROJECT ───────────────────────────────────────────────────────────
      '/api/project': {
        get: {
          tags: ['Proyectos'],
          summary: 'Listar proyectos',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit',  in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'name',   in: 'query', schema: { type: 'string' } },
            { name: 'client', in: 'query', schema: { type: 'string' }, description: 'ID del cliente' },
            { name: 'active', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: {
            200: { description: 'Lista de proyectos', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Project' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Proyectos'],
          summary: 'Crear proyecto',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectInput' } } } },
          responses: {
            201: { description: 'Proyecto creado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Project' } } } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { description: 'Cliente no encontrado' },
            409: { $ref: '#/components/responses/Conflict' },
          },
        },
      },
      '/api/project/archived': {
        get: {
          tags: ['Proyectos'],
          summary: 'Listar proyectos archivados',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Proyectos con soft-delete', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Project' } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/project/{id}': {
        get: {
          tags: ['Proyectos'],
          summary: 'Obtener proyecto por ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Datos del proyecto con cliente populado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Project' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Proyectos'],
          summary: 'Actualizar proyecto',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectInput' } } } },
          responses: {
            200: { description: 'Proyecto actualizado' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
            409: { $ref: '#/components/responses/Conflict' },
          },
        },
        delete: {
          tags: ['Proyectos'],
          summary: 'Eliminar proyecto',
          description: 'Añade `?soft=true` para archivar en lugar de eliminar permanentemente.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id',   in: 'path',  required: true,  schema: { type: 'string' } },
            { name: 'soft', in: 'query', required: false, schema: { type: 'boolean' } },
          ],
          responses: {
            200: { description: 'Proyecto eliminado o archivado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/project/{id}/restore': {
        patch: {
          tags: ['Proyectos'],
          summary: 'Restaurar proyecto archivado',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Proyecto restaurado' },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── DELIVERYNOTE ──────────────────────────────────────────────────────
      '/api/deliverynote': {
        get: {
          tags: ['Albaranes'],
          summary: 'Listar albaranes',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page',    in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit',   in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'project', in: 'query', schema: { type: 'string' }, description: 'Filtrar por ID de proyecto' },
            { name: 'client',  in: 'query', schema: { type: 'string' }, description: 'Filtrar por ID de cliente' },
            { name: 'format',  in: 'query', schema: { type: 'string', enum: ['material', 'hours'] } },
            { name: 'signed',  in: 'query', schema: { type: 'boolean' } },
            { name: 'from',    in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha de trabajo desde (YYYY-MM-DD)' },
            { name: 'to',      in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha de trabajo hasta (YYYY-MM-DD)' },
          ],
          responses: {
            200: { description: 'Lista de albaranes', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/DeliveryNote' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Albaranes'],
          summary: 'Crear albarán',
          description: 'El cliente se hereda automáticamente del proyecto seleccionado.',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DeliveryNoteInput' } } } },
          responses: {
            201: { description: 'Albarán creado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/DeliveryNote' } } } } } },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { description: 'Proyecto no encontrado' },
          },
        },
      },
      '/api/deliverynote/pdf/{id}': {
        get: {
          tags: ['Albaranes'],
          summary: 'Obtener PDF del albarán firmado',
          description: 'Redirige (302) a la URL del PDF almacenado en Cloudinary.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            302: { description: 'Redirección a la URL del PDF' },
            400: { description: 'El albarán no tiene PDF generado (no está firmado)' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/deliverynote/{id}': {
        get: {
          tags: ['Albaranes'],
          summary: 'Obtener albarán por ID',
          description: 'Devuelve el albarán con usuario, cliente y proyecto populados.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Albarán detallado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/DeliveryNote' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Albaranes'],
          summary: 'Eliminar albarán',
          description: 'Solo se puede eliminar si el albarán **no está firmado**.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Albarán eliminado' },
            400: { description: 'No se puede eliminar un albarán firmado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/deliverynote/{id}/sign': {
        patch: {
          tags: ['Albaranes'],
          summary: 'Firmar albarán',
          description: 'Recibe la imagen de firma (multipart). Sube la firma a Cloudinary, genera el PDF con pdfkit y lo almacena también en Cloudinary.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', required: ['signature'], properties: { signature: { type: 'string', format: 'binary', description: 'Imagen de la firma (PNG/JPG)' } } } } },
          },
          responses: {
            200: { description: 'Albarán firmado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/DeliveryNote' } } } } } },
            400: { description: 'Sin imagen de firma o albarán ya firmado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
    },
  },
  apis: [], // Paths definidos inline arriba
};

export const swaggerSpec = swaggerJSDoc(options);
