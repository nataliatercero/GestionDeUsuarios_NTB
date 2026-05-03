import request from 'supertest';
import app from '../src/app.js';
import { fullOnboarding, makeClient, makeProject } from './helpers.js';

describe('Project API', () => {

  const createClient = async (token) => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send(makeClient());
    return res.body.data._id;
  };

  const createProject = async (token, clientId, overrides = {}) => {
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(makeProject(clientId, overrides));
    return res.body.data._id;
  };

  // ── CREAR PROYECTO ─────────────────────────────────────────────────────────
  describe('POST /api/project', () => {
    let token;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      clientId = await createClient(token);
    });

    it('201 — crea un proyecto correctamente', async () => {
      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send(makeProject(clientId));

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.client).toBe(clientId);
    });

    it('409 — rechaza código de proyecto duplicado en la misma empresa', async () => {
      const data = makeProject(clientId);

      await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send(data);

      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send(data);

      expect(res.statusCode).toBe(409);
    });

    it('404 — falla si el cliente no existe', async () => {
      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send(makeProject('000000000000000000000000'));

      expect(res.statusCode).toBe(404);
    });

    it('400 — falla si falta el nombre', async () => {
      const { name, ...sinNombre } = makeProject(clientId);

      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send(sinNombre);

      expect(res.statusCode).toBe(400);
    });

    it('400 — falla si falta el código de proyecto', async () => {
      const { projectCode, ...sinCodigo } = makeProject(clientId);

      const res = await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${token}`)
        .send(sinCodigo);

      expect(res.statusCode).toBe(400);
    });

    it('401 — sin token no puede crear proyecto', async () => {
      const res = await request(app)
        .post('/api/project')
        .send(makeProject(clientId));

      expect(res.statusCode).toBe(401);
    });
  });

  // ── LISTAR PROYECTOS ───────────────────────────────────────────────────────
  describe('GET /api/project', () => {
    let token;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      clientId = await createClient(token);

      await request(app).post('/api/project').set('Authorization', `Bearer ${token}`)
        .send(makeProject(clientId, { name: 'Reforma Cocina', active: true }));
      await request(app).post('/api/project').set('Authorization', `Bearer ${token}`)
        .send(makeProject(clientId, { name: 'Reforma Baño', active: true }));
      await request(app).post('/api/project').set('Authorization', `Bearer ${token}`)
        .send(makeProject(clientId, { name: 'Proyecto Terminado', active: false }));
    });

    it('200 — devuelve los proyectos de la empresa con paginación', async () => {
      const res = await request(app)
        .get('/api/project')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination.totalItems).toBe(3);
    });

    it('200 — paginación funciona correctamente', async () => {
      const res = await request(app)
        .get('/api/project?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('200 — filtra por nombre (búsqueda parcial)', async () => {
      const res = await request(app)
        .get('/api/project?name=Reforma')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('200 — filtra por active=false', async () => {
      const res = await request(app)
        .get('/api/project?active=false')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].active).toBe(false);
    });

    it('200 — filtra por cliente', async () => {
      const otroClienteId = await createClient(token);
      await request(app).post('/api/project').set('Authorization', `Bearer ${token}`)
        .send(makeProject(otroClienteId, { name: 'Proyecto Otro Cliente' }));

      const res = await request(app)
        .get(`/api/project?client=${clientId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(3);
      res.body.data.forEach(p => expect(p.client._id || p.client).toBe(clientId));
    });

    it('200 — un usuario de otra empresa no ve estos proyectos', async () => {
      const otraEmpresa = await fullOnboarding();
      const res = await request(app)
        .get('/api/project')
        .set('Authorization', `Bearer ${otraEmpresa.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get('/api/project');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── OBTENER PROYECTO ───────────────────────────────────────────────────────
  describe('GET /api/project/:id', () => {
    let token;
    let projectId;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      clientId = await createClient(token);
      projectId = await createProject(token, clientId);
    });

    it('200 — devuelve el proyecto con el cliente populado', async () => {
      const res = await request(app)
        .get(`/api/project/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(projectId);
      expect(typeof res.body.data.client).toBe('object');
      expect(res.body.data.client._id).toBe(clientId);
    });

    it('404 — proyecto no encontrado', async () => {
      const res = await request(app)
        .get('/api/project/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('404 — un usuario de otra empresa no puede ver este proyecto', async () => {
      const otraEmpresa = await fullOnboarding();
      const res = await request(app)
        .get(`/api/project/${projectId}`)
        .set('Authorization', `Bearer ${otraEmpresa.token}`);

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get(`/api/project/${projectId}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── ACTUALIZAR PROYECTO ────────────────────────────────────────────────────
  describe('PUT /api/project/:id', () => {
    let token;
    let projectId;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      clientId = await createClient(token);
      projectId = await createProject(token, clientId, { name: 'Nombre Original' });
    });

    it('200 — actualiza los datos del proyecto', async () => {
      const res = await request(app)
        .put(`/api/project/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nombre Actualizado', active: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Nombre Actualizado');
      expect(res.body.data.active).toBe(false);
    });

    it('409 — rechaza código duplicado al actualizar', async () => {
      const otroProyecto = makeProject(clientId);
      await request(app).post('/api/project').set('Authorization', `Bearer ${token}`).send(otroProyecto);

      const res = await request(app)
        .put(`/api/project/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ projectCode: otroProyecto.projectCode });

      expect(res.statusCode).toBe(409);
    });

    it('404 — proyecto no encontrado', async () => {
      const res = await request(app)
        .put('/api/project/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nombre válido' });

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app)
        .put(`/api/project/${projectId}`)
        .send({ name: 'Nombre válido' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── ELIMINAR Y ARCHIVAR ────────────────────────────────────────────────────
  describe('DELETE /api/project/:id', () => {
    let token;
    let projectId;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      clientId = await createClient(token);
      projectId = await createProject(token, clientId);
    });

    it('200 — soft delete archiva el proyecto (?soft=true)', async () => {
      const res = await request(app)
        .delete(`/api/project/${projectId}?soft=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);

      const lista = await request(app).get('/api/project').set('Authorization', `Bearer ${token}`);
      expect(lista.body.data.find(p => p._id === projectId)).toBeUndefined();
    });

    it('200 — hard delete elimina el proyecto permanentemente', async () => {
      const res = await request(app)
        .delete(`/api/project/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);

      const check = await request(app)
        .get(`/api/project/${projectId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(check.statusCode).toBe(404);
    });

    it('404 — proyecto no encontrado', async () => {
      const res = await request(app)
        .delete('/api/project/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).delete(`/api/project/${projectId}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── PROYECTOS ARCHIVADOS ───────────────────────────────────────────────────
  describe('GET /api/project/archived', () => {
    let token;
    let projectId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      const clientId = await createClient(token);
      projectId = await createProject(token, clientId);

      await request(app)
        .delete(`/api/project/${projectId}?soft=true`)
        .set('Authorization', `Bearer ${token}`);
    });

    it('200 — devuelve los proyectos archivados', async () => {
      const res = await request(app)
        .get('/api/project/archived')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const ids = res.body.data.map(p => p._id);
      expect(ids).toContain(projectId);
    });

    it('200 — el proyecto archivado no aparece en la lista normal', async () => {
      const res = await request(app)
        .get('/api/project')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      const ids = res.body.data.map(p => p._id);
      expect(ids).not.toContain(projectId);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get('/api/project/archived');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── RESTAURAR PROYECTO ─────────────────────────────────────────────────────
  describe('PATCH /api/project/:id/restore', () => {
    let token;
    let projectId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      const clientId = await createClient(token);
      projectId = await createProject(token, clientId);

      await request(app)
        .delete(`/api/project/${projectId}?soft=true`)
        .set('Authorization', `Bearer ${token}`);
    });

    it('200 — restaura un proyecto archivado', async () => {
      const res = await request(app)
        .patch(`/api/project/${projectId}/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.deleted).toBeFalsy();

      const lista = await request(app).get('/api/project').set('Authorization', `Bearer ${token}`);
      const ids = lista.body.data.map(p => p._id);
      expect(ids).toContain(projectId);
    });

    it('400 — error al restaurar un proyecto que no está archivado', async () => {
      await request(app)
        .patch(`/api/project/${projectId}/restore`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .patch(`/api/project/${projectId}/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });

    it('404 — proyecto no encontrado', async () => {
      const res = await request(app)
        .patch('/api/project/000000000000000000000000/restore')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app)
        .patch(`/api/project/${projectId}/restore`);

      expect(res.statusCode).toBe(401);
    });
  });

});
