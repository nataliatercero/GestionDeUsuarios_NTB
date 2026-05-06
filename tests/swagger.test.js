import request from 'supertest';
import app from '../src/app.js';

describe('Swagger Documentation', () => {

  describe('GET /api-docs', () => {

    it('200 — sirve la interfaz Swagger UI', async () => {
      const res = await request(app)
        .get('/api-docs/')
        .redirects(1);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });

    it('devuelve HTML con el título de la API', async () => {
      const res = await request(app)
        .get('/api-docs/')
        .redirects(1);

      expect(res.text).toMatch(/swagger/i);
    });
  });

  describe('GET /api-docs.json', () => {

    let spec;

    beforeAll(async () => {
      const res = await request(app).get('/api-docs.json');
      spec = res.body;
    });

    it('200 — devuelve JSON con Content-Type correcto', async () => {
      const res = await request(app).get('/api-docs.json');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('tiene openapi 3.0.x', () => {
      expect(spec.openapi).toMatch(/^3\.0\./);
    });

    it('tiene info con título y versión', () => {
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
    });

    it('define el esquema de seguridad bearerAuth', () => {
      const schemes = spec.components?.securitySchemes;
      expect(schemes).toBeDefined();
      expect(schemes.bearerAuth).toBeDefined();
      expect(schemes.bearerAuth.type).toBe('http');
      expect(schemes.bearerAuth.scheme).toBe('bearer');
    });

    const expectedSchemas = [
      'User', 'Company', 'Client', 'ClientInput',
      'Project', 'ProjectInput',
      'DeliveryNote', 'DeliveryNoteInput', 'Worker',
      'Address', 'Pagination', 'Error',
    ];

    expectedSchemas.forEach(name => {
      it(`tiene el schema "${name}"`, () => {
        expect(spec.components?.schemas?.[name]).toBeDefined();
      });
    });

    const expectedResponses = ['Unauthorized', 'NotFound', 'BadRequest', 'Conflict'];

    expectedResponses.forEach(name => {
      it(`tiene la respuesta reutilizable "${name}"`, () => {
        expect(spec.components?.responses?.[name]).toBeDefined();
      });
    });

    const expectedPaths = [
      '/api/user/register',
      '/api/user/login',
      '/api/user/validation',
      '/api/user/me',
      '/api/user/company',
      '/api/user/logo',
      '/api/user/invite',
      '/api/user/password',
      '/api/user/refresh',
      '/api/user/logout',
      '/api/user/trash',
      '/api/user',
      '/api/user/{id}',
      '/api/client',
      '/api/client/archived',
      '/api/client/{id}',
      '/api/client/{id}/restore',
      '/api/project',
      '/api/project/archived',
      '/api/project/{id}',
      '/api/project/{id}/restore',
      '/api/deliverynote',
      '/api/deliverynote/pdf/{id}',
      '/api/deliverynote/{id}',
      '/api/deliverynote/{id}/sign',
    ];

    expectedPaths.forEach(path => {
      it(`documenta el path "${path}"`, () => {
        expect(spec.paths?.[path]).toBeDefined();
      });
    });

    it(`documenta exactamente ${expectedPaths.length} paths`, () => {
      expect(Object.keys(spec.paths)).toHaveLength(expectedPaths.length);
    });

    it('POST /api/user/register tiene requestBody y respuesta 201', () => {
      const op = spec.paths['/api/user/register']?.post;
      expect(op).toBeDefined();
      expect(op.requestBody).toBeDefined();
      expect(op.responses?.['201']).toBeDefined();
    });

    it('POST /api/user/login es público (sin security)', () => {
      const op = spec.paths['/api/user/login']?.post;
      expect(op?.security).toEqual([]);
    });

    it('PATCH /api/deliverynote/{id}/sign acepta multipart/form-data', () => {
      const op = spec.paths['/api/deliverynote/{id}/sign']?.patch;
      expect(op?.requestBody?.content?.['multipart/form-data']).toBeDefined();
    });

    it('DELETE /api/client/{id} documenta el query param ?soft', () => {
      const op = spec.paths['/api/client/{id}']?.delete;
      const softParam = op?.parameters?.find(p => p.name === 'soft');
      expect(softParam).toBeDefined();
    });

    it('GET /api/deliverynote documenta filtros de fecha (from/to)', () => {
      const op = spec.paths['/api/deliverynote']?.get;
      const params = op?.parameters?.map(p => p.name) ?? [];
      expect(params).toContain('from');
      expect(params).toContain('to');
    });

    it('GET /api/deliverynote/pdf/{id} documenta respuesta 302', () => {
      const op = spec.paths['/api/deliverynote/pdf/{id}']?.get;
      expect(op?.responses?.['302']).toBeDefined();
    });
  });

});
