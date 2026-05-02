import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';

// Deben declararse ANTES de cualquier import dinámico del código bajo test
jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn(),
}));

jest.unstable_mockModule('../src/services/pdf.service.js', () => ({
  generateDeliveryNotePdf: jest.fn(),
}));

// ── Variables pobladas en beforeAll tras registrar los mocks ──────────────────
let app;
let fullOnboarding, makeClient, makeProject;
let uploadToCloudinary, generateDeliveryNotePdf;

// Imagen PNG mínima válida (1×1 px) para que multer/sharp no rechacen el buffer
const FAKE_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const FAKE_SIG_URL = 'https://res.cloudinary.com/test/signatures/sig.webp';
const FAKE_PDF_URL = 'https://res.cloudinary.com/test/pdfs/albaran.pdf';

describe('Sign & PDF API', () => {

  beforeAll(async () => {
    // Importar dinámicamente DESPUÉS de haber registrado los mocks
    ({ default: app } = await import('../src/app.js'));
    ({ fullOnboarding, makeClient, makeProject } = await import('./helpers.js'));
    ({ uploadToCloudinary } = await import('../src/services/storage.service.js'));
    ({ generateDeliveryNotePdf } = await import('../src/services/pdf.service.js'));
  });

  // ── Helpers internos ─────────────────────────────────────────────────────────

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

  // ── PATCH /api/deliverynote/:id/sign ────────────────────────────────────────
  describe('PATCH /api/deliverynote/:id/sign', () => {
    let token;
    let noteId;

    beforeEach(async () => {
      // Mock por defecto: signature primero, PDF después
      uploadToCloudinary
        .mockResolvedValueOnce({ url: FAKE_SIG_URL, publicId: 'sig-id' })
        .mockResolvedValueOnce({ url: FAKE_PDF_URL, publicId: 'pdf-id' });
      generateDeliveryNotePdf.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));

      const admin = await fullOnboarding();
      token = admin.token;
      const clientId = await createClient(token);
      const projectId = await createProject(token, clientId);
      noteId = await createNote(token, projectId);
    });

    it('200 — firma el albarán, guarda signatureUrl y pdfUrl', async () => {
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

    it('200 — uploadToCloudinary se llama dos veces (firma + PDF)', async () => {
      uploadToCloudinary.mockClear();
      uploadToCloudinary
        .mockResolvedValueOnce({ url: FAKE_SIG_URL, publicId: 'sig-id' })
        .mockResolvedValueOnce({ url: FAKE_PDF_URL, publicId: 'pdf-id' });

      await request(app)
        .patch(`/api/deliverynote/${noteId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });

      expect(uploadToCloudinary).toHaveBeenCalledTimes(2);
      // Primera llamada: imagen de firma (resourceType image por defecto)
      expect(uploadToCloudinary.mock.calls[0][1]).toMatchObject({ folder: 'bildy/signatures' });
      // Segunda llamada: PDF (resourceType raw)
      expect(uploadToCloudinary.mock.calls[1][1]).toMatchObject({ folder: 'bildy/pdfs', resourceType: 'raw' });
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

  // ── GET /api/deliverynote/pdf/:id ────────────────────────────────────────────
  describe('GET /api/deliverynote/pdf/:id', () => {
    let token;
    let noteId;

    beforeEach(async () => {
      uploadToCloudinary
        .mockResolvedValueOnce({ url: FAKE_SIG_URL, publicId: 'sig-id' })
        .mockResolvedValueOnce({ url: FAKE_PDF_URL, publicId: 'pdf-id' });
      generateDeliveryNotePdf.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));

      const admin = await fullOnboarding();
      token = admin.token;
      const clientId = await createClient(token);
      const projectId = await createProject(token, clientId);
      noteId = await createNote(token, projectId);

      // Firmar para que tenga pdfUrl
      await request(app)
        .patch(`/api/deliverynote/${noteId}/sign`)
        .set('Authorization', `Bearer ${token}`)
        .attach('signature', FAKE_IMAGE, { filename: 'firma.png', contentType: 'image/png' });
    });

    it('302 — redirige a la URL del PDF en Cloudinary', async () => {
      const res = await request(app)
        .get(`/api/deliverynote/pdf/${noteId}`)
        .set('Authorization', `Bearer ${token}`)
        .redirects(0);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(FAKE_PDF_URL);
    });

    it('400 — albarán sin PDF (no firmado)', async () => {
      const clientId = await createClient(token);
      const projectId = await createProject(token, clientId);
      const unsignedNoteId = await createNote(token, projectId);

      const res = await request(app)
        .get(`/api/deliverynote/pdf/${unsignedNoteId}`)
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
      const res = await request(app).get(`/api/deliverynote/pdf/${noteId}`);
      expect(res.statusCode).toBe(401);
    });
  });

});
