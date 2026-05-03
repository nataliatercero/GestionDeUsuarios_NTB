import { jest } from '@jest/globals';
import request from 'supertest';

// Mockear ANTES de cualquier import dinámico del código bajo test
jest.unstable_mockModule('../src/services/mail.service.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendInvitationEmail:   jest.fn().mockResolvedValue(undefined),
}));

let app;
let fullOnboarding;
let sendVerificationEmail, sendInvitationEmail;

describe('Mail Service', () => {

  beforeAll(async () => {
    ({ default: app }                = await import('../src/app.js'));
    ({ fullOnboarding }              = await import('./helpers.js'));
    ({ sendVerificationEmail,
       sendInvitationEmail }         = await import('../src/services/mail.service.js'));
  });

  afterEach(() => {
    sendVerificationEmail.mockClear();
    sendInvitationEmail.mockClear();
  });

  // ── EMAIL DE VERIFICACIÓN (registro) ─────────────────────────────────────────
  describe('sendVerificationEmail — POST /api/user/register', () => {

    it('se llama con el email y un código de 6 dígitos al registrarse', async () => {
      const email = `test_${Date.now()}@mail.com`;

      const res = await request(app)
        .post('/api/user/register')
        .send({ email, password: 'ValidPass123!' });

      expect(res.statusCode).toBe(201);
      expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        email,
        expect.stringMatching(/^\d{6}$/)
      );
    });

    it('NO se llama si el email ya está registrado (409)', async () => {
      const email = `dup_${Date.now()}@mail.com`;

      await request(app)
        .post('/api/user/register')
        .send({ email, password: 'ValidPass123!' });

      sendVerificationEmail.mockClear();

      const res = await request(app)
        .post('/api/user/register')
        .send({ email, password: 'ValidPass123!' });

      expect(res.statusCode).toBe(409);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('NO se llama si la validación falla (400)', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({ email: 'no-es-un-email', password: 'ValidPass123!' });

      expect(res.statusCode).toBe(400);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  // ── EMAIL DE INVITACIÓN ────────────────────────────────────────────────────────
  describe('sendInvitationEmail — POST /api/user/invite', () => {

    let adminToken;

    beforeEach(async () => {
      const admin = await fullOnboarding();
      adminToken = admin.token;
      sendInvitationEmail.mockClear();
    });

    it('se llama con los datos correctos al invitar un usuario nuevo', async () => {
      const guestEmail = `guest_${Date.now()}@mail.com`;

      const res = await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: guestEmail, name: 'Ana', lastName: 'López', nif: '12345678B' });

      expect(res.statusCode).toBe(201);
      expect(sendInvitationEmail).toHaveBeenCalledTimes(1);
      expect(sendInvitationEmail).toHaveBeenCalledWith(
        guestEmail,
        expect.any(String),   // nombre completo del invitado
        expect.any(String),   // nombre de la empresa
        'Temporal123!'        // contraseña temporal
      );
    });

    it('incluye el email correcto del invitado', async () => {
      const guestEmail = `check_${Date.now()}@mail.com`;

      await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: guestEmail, name: 'Luis', lastName: 'García', nif: '87654321Z' });

      const [calledEmail] = sendInvitationEmail.mock.calls[0];
      expect(calledEmail).toBe(guestEmail);
    });

    it('NO se llama si el usuario ya existe (409)', async () => {
      const existingEmail = `exist_${Date.now()}@mail.com`;

      await request(app)
        .post('/api/user/register')
        .send({ email: existingEmail, password: 'ValidPass123!' });

      const res = await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: existingEmail, name: 'Luis', lastName: 'García', nif: '87654321Z' });

      expect(res.statusCode).toBe(409);
      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('NO se llama si el token es inválido (401)', async () => {
      const res = await request(app)
        .post('/api/user/invite')
        .send({ email: 'cualquiera@mail.com', name: 'X', lastName: 'Y', nif: '12345678B' });

      expect(res.statusCode).toBe(401);
      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('NO se llama si falta un campo requerido (400)', async () => {
      const res = await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: `nolastname_${Date.now()}@mail.com`, name: 'Ana', nif: '12345678B' });
      // falta lastName

      expect(res.statusCode).toBe(400);
      expect(sendInvitationEmail).not.toHaveBeenCalled();
    });
  });

});
