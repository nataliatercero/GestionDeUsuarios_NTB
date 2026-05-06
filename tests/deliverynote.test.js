import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose';
import { fullOnboarding, makeClient, makeProject } from './helpers.js';

describe('DeliveryNote API', () => {

  const createClient = async (token) => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send(makeClient());
    return res.body.data._id;
  };

  const createProject = async (token, clientId) => {
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send(makeProject(clientId));
    return res.body.data._id;
  };

  const makeMaterialNote = (projectId, overrides = {}) => ({
    project: projectId,
    format: 'material',
    description: 'Entrega de cemento',
    workDate: '2025-06-15',
    material: 'Cemento Portland',
    quantity: 50,
    unit: 'kg',
    ...overrides,
  });

  const makeHoursNote = (projectId, overrides = {}) => ({
    project: projectId,
    format: 'hours',
    description: 'Trabajo de fontanería',
    workDate: '2025-06-15',
    hours: 8,
    ...overrides,
  });

  describe('POST /api/deliverynote', () => {
    let token;
    let projectId;
    let clientId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      clientId = await createClient(token);
      projectId = await createProject(token, clientId);
    });

    it('201 — crea un albarán de materiales correctamente', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send(makeMaterialNote(projectId));

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.format).toBe('material');
      expect(res.body.data.material).toBe('Cemento Portland');
      expect(res.body.data.quantity).toBe(50);
    });

    it('201 — crea un albarán de horas simple correctamente', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send(makeHoursNote(projectId));

      expect(res.statusCode).toBe(201);
      expect(res.body.data.format).toBe('hours');
      expect(res.body.data.hours).toBe(8);
    });

    it('201 — crea un albarán de horas con múltiples trabajadores', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send({
          project: projectId,
          format: 'hours',
          workers: [
            { name: 'Juan García', hours: 6 },
            { name: 'Ana López', hours: 4 },
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.workers).toHaveLength(2);
    });

    it('201 — el cliente se hereda automáticamente del proyecto', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send(makeMaterialNote(projectId));

      expect(res.statusCode).toBe(201);
      const noteClientId = res.body.data.client.toString?.() ?? res.body.data.client;
      expect(noteClientId).toBe(clientId);
    });

    it('404 — falla si el proyecto no existe', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send(makeMaterialNote('000000000000000000000000'));

      expect(res.statusCode).toBe(404);
    });

    it('400 — falla si el format es inválido', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send({ project: projectId, format: 'invalido' });

      expect(res.statusCode).toBe(400);
    });

    it('400 — falla si faltan los campos obligatorios de material', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send({ project: projectId, format: 'material' });

      expect(res.statusCode).toBe(400);
    });

    it('401 — sin token no puede crear albarán', async () => {
      const res = await request(app)
        .post('/api/deliverynote')
        .send(makeMaterialNote(projectId));

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/deliverynote', () => {
    let token;
    let projectId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      const clientId = await createClient(token);
      projectId = await createProject(token, clientId);

      await request(app).post('/api/deliverynote').set('Authorization', `Bearer ${token}`)
        .send(makeMaterialNote(projectId, { workDate: '2024-03-10' }));
      await request(app).post('/api/deliverynote').set('Authorization', `Bearer ${token}`)
        .send(makeHoursNote(projectId, { workDate: '2025-06-01' }));
      await request(app).post('/api/deliverynote').set('Authorization', `Bearer ${token}`)
        .send(makeHoursNote(projectId, { workDate: '2025-07-20' }));
    });

    it('200 — devuelve los albaranes de la empresa con paginación', async () => {
      const res = await request(app)
        .get('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination.totalItems).toBe(3);
    });

    it('200 — paginación limita los resultados', async () => {
      const res = await request(app)
        .get('/api/deliverynote?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('200 — filtra por format=material', async () => {
      const res = await request(app)
        .get('/api/deliverynote?format=material')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].format).toBe('material');
    });

    it('200 — filtra por project', async () => {
      const res = await request(app)
        .get(`/api/deliverynote?project=${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('200 — filtra por signed=false', async () => {
      const res = await request(app)
        .get('/api/deliverynote?signed=false')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      res.body.data.forEach(n => expect(n.signed).toBe(false));
    });

    it('200 — filtra por rango de fechas (from/to)', async () => {
      const res = await request(app)
        .get('/api/deliverynote?from=2025-01-01&to=2025-12-31')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get('/api/deliverynote');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/deliverynote/:id', () => {
    let token;
    let noteId;
    let clientId;
    let projectId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      clientId = await createClient(token);
      projectId = await createProject(token, clientId);

      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send(makeMaterialNote(projectId));
      noteId = res.body.data._id;
    });

    it('200 — devuelve el albarán con usuario, cliente y proyecto populados', async () => {
      const res = await request(app)
        .get(`/api/deliverynote/${noteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(noteId);
      expect(typeof res.body.data.client).toBe('object');
      expect(typeof res.body.data.project).toBe('object');
      expect(typeof res.body.data.user).toBe('object');
      expect(res.body.data.client._id).toBe(clientId);
      expect(res.body.data.project._id).toBe(projectId);
    });

    it('404 — albarán no encontrado', async () => {
      const res = await request(app)
        .get('/api/deliverynote/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get(`/api/deliverynote/${noteId}`);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/deliverynote/:id', () => {
    let token;
    let noteId;
    let projectId;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      token = admin.token;
      const clientId = await createClient(token);
      projectId = await createProject(token, clientId);

      const res = await request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${token}`)
        .send(makeMaterialNote(projectId));
      noteId = res.body.data._id;
    });

    it('200 — elimina un albarán no firmado', async () => {
      const res = await request(app)
        .delete(`/api/deliverynote/${noteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });

    it('400 — no puede eliminar un albarán firmado', async () => {
      await mongoose.connection.collection('deliverynotes').updateOne(
        { _id: new mongoose.Types.ObjectId(noteId) },
        { $set: { signed: true, signedAt: new Date() } }
      );

      const res = await request(app)
        .delete(`/api/deliverynote/${noteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });

    it('404 — albarán no encontrado', async () => {
      const res = await request(app)
        .delete('/api/deliverynote/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });

});
