import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';

jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn(),
}));

jest.unstable_mockModule('../src/services/pdf.service.js', () => ({
  generateDeliveryNotePdf: jest.fn(),
}));

let app;
let fullOnboarding;
let uploadToCloudinary, generateDeliveryNotePdf;

const FAKE_SIG_URL  = 'https://res.cloudinary.com/test/signatures/sig.webp';
const FAKE_PDF_URL  = 'https://res.cloudinary.com/test/pdfs/albaran.pdf';
const FAKE_IMAGE    = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

describe('Sign & PDF API', () => {

  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
    ({ fullOnboarding } = await import('./helpers.js'));
    ({ uploadToCloudinary } = await import('../src/services/storage.service.js'));
    ({ generateDeliveryNotePdf } = await import('../src/services/pdf.service.js'));
  });

  // Limpia el estado de los mocks después de cada test para evitar acumulación
  afterEach(() => {
    uploadToCloudinary.mockReset();
    generateDeliveryNotePdf.mockReset();
  });

  // Helpers internos

  const createClient = async (token) => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Test S.L.', cif: `A${Math.random().toString().slice(2, 10)}` });
    return res.body.data._id;
  };

  const createProject = async (token, clientId) => {
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Proyecto Test', projectCode: `PRJ${Math.random().toString().slice(2, 9)}`, client: clientId });
    return res.body.data._id;
  };

  const createNote = async (token, projectId) => {
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({ project: projectId, format: 'material', material: 'Cemento', quantity: 10, unit: 'kg' });
    return res.body.data._id;
  };

  // Implementación determinista según las opciones recibidas (sin acumulación de queue)
  const setupMocks = () => {
    uploadToCloudinary.mockImplementation(async (_buffer, opts) => {
      if (opts?.resourceType === 'raw') return { url: FAKE_PDF_URL, publicId: 'pdf-id' };
      return { url: FAKE_SIG_URL, publicId: 'sig-id' };
    });
    generateDeliveryNotePdf.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));
  };

  // PATCH /api/deliverynote/:id/sign 
  describe('PATCH /api/deliverynote/:id/sign', () => {
    let token;
    let noteId;

    beforeEach(async () => {
      setupMocks();
      const admin = await fullOnboarding();
      token = admin.token;
      const clientId = await createClient(token);
      const projectId = await createProject(token, clientId);
      noteId = await createNote(token, projectId);
    });

    it('200 — firma el albarán y devuelve signatureUrl y pdfUrl correctos', async () => {
      const res = await request(app)
        .patch(`/api/deliverynote/${noteId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signed).toBe(true);
      expect(res.body.data.signedAt).toBeDefined();
      expect(res.body.data.signatureUrl).toBe(FAKE_SIG_URL);
      expect(res.body.data.pdfUrl).toBe(FAKE_PDF_URL);
    });

    it('200 — uploadToCloudinary se llama dos veces: firma (image) y PDF (raw)', async () => {
      await request(app)
        .patch(`/api/deliverynote/${noteId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });

      expect(uploadToCloudinary).toHaveBeenCalledTimes(2);
      expect(uploadToCloudinary.mock.calls[0][1]).toMatchObject({ folder: 'bildy/signatures' });
      expect(uploadToCloudinary.mock.calls[1][1]).toMatchObject({ folder: 'bildy/pdfs', resourceType: 'raw' });
    });

    it('200 — generateDeliveryNotePdf se llama una vez', async () => {
      await request(app)
        .patch(`/api/deliverynote/${noteId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });

      expect(generateDeliveryNotePdf).toHaveBeenCalledTimes(1);
    });

    it('400 — falla si no se adjunta imagen de firma', async () => {
      const res = await request(app)
        .patch(`/api/deliverynote/${noteId}/sign`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });

    it('400 — no puede firmar un albarán ya firmado', async () => {
      await mongoose.connection.collection('deliverynotes').updateOne(
        { _id: new mongoose.Types.ObjectId(noteId) },
        { $set: { signed: true, signedAt: new Date() } }
      );

      const res = await request(app)
        .patch(`/api/deliverynote/${noteId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });

      expect(res.statusCode).toBe(400);
    });

    it('404 — albarán no encontrado', async () => {
      const res = await request(app)
        .patch('/api/deliverynote/000000000000000000000000/sign')
        .set('Authorization', `Bearer ${token}`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app)
        .patch(`/api/deliverynote/${noteId}/sign`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });

      expect(res.statusCode).toBe(401);
    });
  });

  // GET /api/deliverynote/pdf/:id
  describe('GET /api/deliverynote/pdf/:id', () => {
    let token;
    let noteId;
    let signedNoteId;

    beforeEach(async () => {
      setupMocks();
      const admin = await fullOnboarding();
      token = admin.token;
      const clientId = await createClient(token);
      const projectId = await createProject(token, clientId);

      // Albarán sin firmar (para el test 400)
      noteId = await createNote(token, projectId);

      // Albarán firmado (para el test 302)
      signedNoteId = await createNote(token, projectId);
      await request(app)
        .patch(`/api/deliverynote/${signedNoteId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });
    });

    it('302 — redirige a la URL del PDF en Cloudinary', async () => {
      const res = await request(app)
        .get(`/api/deliverynote/pdf/${signedNoteId}`)
        .set('Authorization', `Bearer ${token}`)
        .redirects(0);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(FAKE_PDF_URL);
    });

    it('400 — albarán sin PDF (aún no firmado)', async () => {
      const res = await request(app)
        .get(`/api/deliverynote/pdf/${noteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });

    it('404 — albarán no encontrado', async () => {
      const res = await request(app)
        .get('/api/deliverynote/pdf/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get(`/api/deliverynote/pdf/${signedNoteId}`);
      expect(res.statusCode).toBe(401);
    });
  });

});
