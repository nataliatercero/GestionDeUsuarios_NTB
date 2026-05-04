import request from 'supertest';
import app from '../src/app.js';
import { fullOnboarding, registerAndVerify, makeClient } from './helpers.js';

describe('Client API', () => {

  // CREAR CLIENTE
  describe('POST /api/client', () => {
    let token;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
    });

    it('201 — crea un cliente correctamente', async () => {
      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient());

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.name).toBeDefined();
    });

    it('201 — el CIF se normaliza a mayúsculas aunque se envíe en minúsculas', async () => {
      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient({ cif: 'b12345678' }));

      expect(res.statusCode).toBe(201);
      expect(res.body.data.cif).toBe('B12345678');
    });

    it('409 — rechaza CIF duplicado dentro de la misma empresa', async () => {
      const clientData = makeClient();

      await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(clientData);

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(clientData);

      expect(res.statusCode).toBe(409);
    });

    it('400 — falla si falta el nombre', async () => {
      const { name, ...sinNombre } = makeClient();

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(sinNombre);

      expect(res.statusCode).toBe(400);
    });

    it('400 — falla si el CIF no tiene exactamente 9 caracteres', async () => {
      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient({ cif: 'B123' }));

      expect(res.statusCode).toBe(400);
    });

    it('401 — sin token no puede crear un cliente', async () => {
      const res = await request(app)
        .post('/api/client')
        .send(makeClient());

      expect(res.statusCode).toBe(401);
    });

    it('400 — usuario sin empresa no puede crear clientes', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${user.token}`)
        .send(makeClient());

      expect(res.statusCode).toBe(400);
    });
  });

  // LISTAR CLIENTES
  describe('GET /api/client', () => {
    let token;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;

      await request(app).post('/api/client').set('Authorization', `Bearer ${token}`)
        .send(makeClient({ name: 'Albañilería García S.L.' }));
      await request(app).post('/api/client').set('Authorization', `Bearer ${token}`)
        .send(makeClient({ name: 'Fontanería López S.A.' }));
      await request(app).post('/api/client').set('Authorization', `Bearer ${token}`)
        .send(makeClient({ name: 'Electricidad García Hermanos' }));
    });

    it('200 — devuelve los clientes de la empresa con paginación', async () => {
      const res = await request(app)
        .get('/api/client')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination.totalItems).toBe(3);
      expect(res.body.pagination.totalPages).toBeDefined();
      expect(res.body.pagination.currentPage).toBe(1);
    });

    it('200 — paginación limita los resultados correctamente', async () => {
      const res = await request(app)
        .get('/api/client?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.totalItems).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('200 — filtra por nombre (búsqueda parcial insensible a mayúsculas)', async () => {
      const res = await request(app)
        .get('/api/client?name=garcía')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach(c => expect(c.name.toLowerCase()).toContain('garcía'));
    });

    it('200 — un usuario de otra empresa no ve estos clientes', async () => {
      const otraEmpresa = await fullOnboarding();
      const res = await request(app)
        .get('/api/client')
        .set('Authorization', `Bearer ${otraEmpresa.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('401 — sin token no puede listar clientes', async () => {
      const res = await request(app).get('/api/client');
      expect(res.statusCode).toBe(401);
    });
  });

  // OBTENER CLIENTE
  describe('GET /api/client/:id', () => {
    let token;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient());
      clientId = res.body.data._id;
    });

    it('200 — devuelve los datos del cliente por ID', async () => {
      const res = await request(app)
        .get(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(clientId);
    });

    it('404 — cliente no encontrado', async () => {
      const res = await request(app)
        .get('/api/client/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('404 — un usuario de otra empresa no puede ver este cliente', async () => {
      const otraEmpresa = await fullOnboarding();
      const res = await request(app)
        .get(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${otraEmpresa.token}`);

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get(`/api/client/${clientId}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ACTUALIZAR CLIENTE
  describe('PUT /api/client/:id', () => {
    let token;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient({ name: 'Nombre Original' }));
      clientId = res.body.data._id;
    });

    it('200 — actualiza los datos del cliente', async () => {
      const res = await request(app)
        .put(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nombre Actualizado' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Nombre Actualizado');
    });

    it('409 — rechaza actualizar con un CIF que ya usa otro cliente', async () => {
      const otroCliente = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient());
      const cifarOtro = otroCliente.body.data.cif;

      const res = await request(app)
        .put(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ cif: cifarOtro });

      expect(res.statusCode).toBe(409);
    });

    it('404 — cliente no encontrado', async () => {
      const res = await request(app)
        .put('/api/client/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nombre válido' });

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app)
        .put(`/api/client/${clientId}`)
        .send({ name: 'Nombre válido' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ELIMINAR Y ARCHIVAR
  describe('DELETE /api/client/:id', () => {
    let token;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient());
      clientId = res.body.data._id;
    });

    it('200 — soft delete archiva el cliente (?soft=true)', async () => {
      const res = await request(app)
        .delete(`/api/client/${clientId}?soft=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);

      const lista = await request(app)
        .get('/api/client')
        .set('Authorization', `Bearer ${token}`);
      expect(lista.body.data.find(c => c._id === clientId)).toBeUndefined();
    });

    it('200 — hard delete elimina el cliente permanentemente', async () => {
      const res = await request(app)
        .delete(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);

      const check = await request(app)
        .get(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(check.statusCode).toBe(404);
    });

    it('404 — cliente no encontrado', async () => {
      const res = await request(app)
        .delete('/api/client/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).delete(`/api/client/${clientId}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // CLIENTES ARCHIVADOS
  describe('GET /api/client/archived', () => {
    let token;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient());
      clientId = res.body.data._id;

      await request(app)
        .delete(`/api/client/${clientId}?soft=true`)
        .set('Authorization', `Bearer ${token}`);
    });

    it('200 — devuelve los clientes archivados', async () => {
      const res = await request(app)
        .get('/api/client/archived')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const ids = res.body.data.map(c => c._id);
      expect(ids).toContain(clientId);
    });

    it('200 — el cliente archivado no aparece en la lista normal', async () => {
      const res = await request(app)
        .get('/api/client')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      const ids = res.body.data.map(c => c._id);
      expect(ids).not.toContain(clientId);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get('/api/client/archived');
      expect(res.statusCode).toBe(401);
    });
  });

  // RESTAURAR CLIENTE
  describe('PATCH /api/client/:id/restore', () => {
    let token;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;

      const res = await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${token}`)
        .send(makeClient());
      clientId = res.body.data._id;

      await request(app)
        .delete(`/api/client/${clientId}?soft=true`)
        .set('Authorization', `Bearer ${token}`);
    });

    it('200 — restaura un cliente archivado', async () => {
      const res = await request(app)
        .patch(`/api/client/${clientId}/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.deleted).toBeFalsy();

      const lista = await request(app)
        .get('/api/client')
        .set('Authorization', `Bearer ${token}`);
      const ids = lista.body.data.map(c => c._id);
      expect(ids).toContain(clientId);
    });

    it('400 — no puede restaurar un cliente que no está archivado', async () => {
      await request(app)
        .patch(`/api/client/${clientId}/restore`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .patch(`/api/client/${clientId}/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });

    it('404 — cliente no encontrado', async () => {
      const res = await request(app)
        .patch('/api/client/000000000000000000000000/restore')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app)
        .patch(`/api/client/${clientId}/restore`);

      expect(res.statusCode).toBe(401);
    });
  });

});
