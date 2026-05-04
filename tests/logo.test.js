import { jest } from '@jest/globals';

// ── Mock storage.service ANTES de que cualquier módulo lo importe ─────────────
const mockUploadToCloudinary = jest.fn();

jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  uploadToCloudinary: mockUploadToCloudinary,
  deleteFromCloudinary: jest.fn(),
}));

// ── Referencias (pobladas en beforeAll) ──────────────────────────────────────
let request, app, fullOnboarding, registerAndVerify;

beforeAll(async () => {
  const supertest       = await import('supertest');
  request               = supertest.default;

  const appMod          = await import('../src/app.js');
  app                   = appMod.default;

  const helpers         = await import('./helpers.js');
  fullOnboarding        = helpers.fullOnboarding;
  registerAndVerify     = helpers.registerAndVerify;
});

afterEach(() => {
  mockUploadToCloudinary.mockReset();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/user/logo', () => {
  const fakeLogoUrl = 'https://res.cloudinary.com/test/bildy/logos/logo-test.webp';
  const setupMock = () =>
    mockUploadToCloudinary.mockResolvedValue({ url: fakeLogoUrl, publicId: 'bildy/logos/logo-test' });

  it('200 — admin con empresa sube logo correctamente', async () => {
    setupMock();
    const admin = await fullOnboarding();

    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${admin.token}`)
      .attach('logo', Buffer.from('fake-image-data'), { filename: 'logo.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logo).toBe(fakeLogoUrl);
  });

  it('200 — la URL del logo se almacena en la empresa', async () => {
    setupMock();
    const admin = await fullOnboarding();

    const uploadRes = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${admin.token}`)
      .attach('logo', Buffer.from('fake-image-data'), { filename: 'logo.png', contentType: 'image/png' });

    expect(uploadRes.body.data.logo).toMatch(/cloudinary/);
  });

  it('llama a uploadToCloudinary con buffer y carpeta bildy/logos', async () => {
    setupMock();
    const admin = await fullOnboarding();

    await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${admin.token}`)
      .attach('logo', Buffer.from('fake-image-data'), { filename: 'logo.png', contentType: 'image/png' });

    expect(mockUploadToCloudinary).toHaveBeenCalledTimes(1);
    const [buffer, opts] = mockUploadToCloudinary.mock.calls[0];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(opts.folder).toBe('bildy/logos');
  });

  it('400 — sin archivo devuelve 400', async () => {
    const admin = await fullOnboarding();

    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.statusCode).toBe(400);
    expect(mockUploadToCloudinary).not.toHaveBeenCalled();
  });

  it('400 — usuario con perfil pero sin empresa devuelve 400', async () => {
    setupMock();
    const user = await registerAndVerify();

    // Completa perfil personal pero NO el onboarding de empresa
    await request(app)
      .put('/api/user/register')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Sin', lastName: 'Empresa', nif: '00000001A' });

    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${user.token}`)
      .attach('logo', Buffer.from('fake-image-data'), { filename: 'logo.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(400);
    expect(mockUploadToCloudinary).not.toHaveBeenCalled();
  });

  it('400 — usuario sin perfil (hasProfile falla) devuelve 400', async () => {
    const user = await registerAndVerify();

    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${user.token}`)
      .attach('logo', Buffer.from('fake-image-data'), { filename: 'logo.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(400);
    expect(mockUploadToCloudinary).not.toHaveBeenCalled();
  });

  it('401 — sin token devuelve 401', async () => {
    const res = await request(app)
      .patch('/api/user/logo')
      .attach('logo', Buffer.from('fake-image-data'), { filename: 'logo.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(401);
  });

  it('401 — token inválido devuelve 401', async () => {
    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', 'Bearer token-falso')
      .attach('logo', Buffer.from('fake-image-data'), { filename: 'logo.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(401);
  });
});
