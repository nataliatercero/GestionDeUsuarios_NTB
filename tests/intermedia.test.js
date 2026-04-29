import request from 'supertest';
import app from '../src/app.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Registra un usuario y devuelve { token, refreshToken, userId }
 */
const registerUser = async (overrides = {}) => {
  const payload = {
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: 'ValidPass123!',
    ...overrides,
  };
  const res = await request(app).post('/api/user/register').send(payload);
  return {
    token: res.body.token,
    refreshToken: res.body.refreshToken,
    userId: res.body.data?.id,
    email: payload.email,
    password: payload.password,
    statusCode: res.statusCode,
    body: res.body,
  };
};

/**
 * Devuelve el código de verificación leyendo el usuario desde la DB
 * (en tests usamos mongoose directamente)
 */
const getVerificationCode = async (userId) => {
  const mongoose = (await import('mongoose')).default;
  const doc = await mongoose.connection
    .collection('users')
    .findOne({ _id: new (await import('mongoose')).default.Types.ObjectId(userId) });
  return doc?.verificationCode;
};

/**
 * Registra, verifica el email y devuelve los datos del usuario
 */
const registerAndVerify = async (overrides = {}) => {
  const user = await registerUser(overrides);
  const code = await getVerificationCode(user.userId);
  await request(app)
    .put('/api/user/validation')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ code });
  return user;
};

/**
 * Registra, verifica, completa el perfil y crea empresa. Devuelve todo.
 */
const fullOnboarding = async (overrides = {}) => {
  const user = await registerAndVerify(overrides);

  // Perfil personal
  await request(app)
    .put('/api/user/register')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ name: 'Test', lastName: 'User', nif: '12345678A' });

  // Empresa
  const cif = `B${Date.now().toString().slice(-8)}`;
  await request(app)
    .patch('/api/user/company')
    .set('Authorization', `Bearer ${user.token}`)
    .send({
      isFreelance: false,
      name: 'Test Corp S.L.',
      cif,
      address: {
        street: 'Calle Test',
        number: '1',
        postal: '28001',
        city: 'Madrid',
        province: 'Madrid',
      },
    });

  // Refrescar token (la empresa ya está asociada)
  const meRes = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${user.token}`);

  return { ...user, me: meRes.body.data };
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('User API — Práctica Intermedia', () => {
  // ── REGISTRO ──────────────────────────────────────────────────────────────
  describe('POST /api/user/register', () => {
    it('201 — registra un usuario con email y password válidos', async () => {
      const { statusCode, body } = await registerUser();

      expect(statusCode).toBe(201);
      expect(body.success).toBe(true);
      expect(body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.data.status).toBe('pending');
    });

    it('409 — rechaza email duplicado', async () => {
      const { email } = await registerUser(); // email dinámico

      const res = await request(app)
        .post('/api/user/register')
        .send({ email, password: 'ValidPass123!' });

      expect(res.statusCode).toBe(409);
    });

    it('400 — rechaza email inválido', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({ email: 'no-es-email', password: 'ValidPass123!' });

      expect(res.statusCode).toBe(400);
    });

    it('400 — rechaza password demasiado corta', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({ email: `short_${Date.now()}@test.com`, password: '123' });

      expect(res.statusCode).toBe(400);
    });

    it('400 — rechaza body vacío', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('ignora campos extra', async () => {
      const { statusCode, body } = await registerUser({ extra_field: 'hacker' });

      expect(statusCode).toBe(201);
      expect(body.data.extra_field).toBeUndefined();
    });
  });

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  describe('POST /api/user/login', () => {
    it('200 — login correcto devuelve tokens', async () => {
      const { email, password } = await registerUser();

      const res = await request(app)
        .post('/api/user/login')
        .send({ email, password });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('401 — rechaza password incorrecta', async () => {
      const { email } = await registerUser();

      const res = await request(app)
        .post('/api/user/login')
        .send({ email, password: 'Incorrecta123!' });

      expect(res.statusCode).toBe(401);
    });

    it('401 — usuario que no existe', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({ email: `noexiste_${Date.now()}@test.com`, password: 'ValidPass123!' });

      expect(res.statusCode).toBe(401);
    });

    it('400 — body vacío', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  // ── VERIFICACIÓN DE EMAIL ─────────────────────────────────────────────────
  describe('PUT /api/user/validation', () => {
    it('200 — verifica email con código correcto', async () => {
      const user = await registerUser();
      const code = await getVerificationCode(user.userId);

      const res = await request(app)
        .put('/api/user/validation')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ code });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('200 — tras verificar el status es verified', async () => {
      const user = await registerUser();
      const code = await getVerificationCode(user.userId);

      await request(app)
        .put('/api/user/validation')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ code });

      const meRes = await request(app)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${user.token}`);

      expect(meRes.body.data.status).toBe('verified');
    });

    it('400 — código incorrecto', async () => {
      const user = await registerUser();

      const res = await request(app)
        .put('/api/user/validation')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ code: '000000' });

      expect(res.statusCode).toBe(400);
    });

    it('429 — bloquea tras agotar los intentos', async () => {
      const user = await registerUser();

      // 3 intentos fallidos (agota verificationAttempts = 3)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .put('/api/user/validation')
          .set('Authorization', `Bearer ${user.token}`)
          .send({ code: '000000' });
      }

      // 4º intento → debe bloquearse
      const res = await request(app)
        .put('/api/user/validation')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ code: '000000' });

      expect(res.statusCode).toBe(429);
    });

    it('400 — no permite verificar dos veces', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .put('/api/user/validation')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ code: '123456' });

      expect(res.statusCode).toBe(400);
    });

    it('401 — sin token no puede verificar', async () => {
      const res = await request(app)
        .put('/api/user/validation')
        .send({ code: '123456' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── ONBOARDING PERSONAL ───────────────────────────────────────────────────
  describe('PUT /api/user/register (perfil personal)', () => {
    it('200 — actualiza nombre, apellido y NIF', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .put('/api/user/register')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Juan', lastName: 'García', nif: '12345678Z' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Juan');
      expect(res.body.data.lastName).toBe('García');
      // NIF debe guardarse en mayúsculas
      expect(res.body.data.nif).toBe('12345678Z');
    });

    it('200 — el virtual fullName se calcula correctamente', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .put('/api/user/register')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Ana', lastName: 'López', nif: '87654321A' });

      expect(res.body.data.fullName).toBe('Ana López');
    });

    it('400 — body vacío no puede actualizar perfil', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .put('/api/user/register')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('401 — sin token no puede actualizar el perfil', async () => {
      const res = await request(app)
        .put('/api/user/register')
        .send({ name: 'X', lastName: 'Y', nif: '00000000T' });

      expect(res.statusCode).toBe(401);
    });

    it('401 — email no verificado no puede actualizar el perfil', async () => {
      const user = await registerUser();

      const res = await request(app)
        .put('/api/user/register')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'X', lastName: 'Y', nif: '00000000T' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── PERFIL ────────────────────────────────────────────────────────────────
  describe('GET /api/user/me', () => {
    it('200 — devuelve el perfil del usuario autenticado', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.email).toBe(user.email);
    });

    it('401 — sin token devuelve 401', async () => {
      const res = await request(app).get('/api/user/me');
      expect(res.statusCode).toBe(401);
    });

    it('401 — token inválido devuelve 401', async () => {
      const res = await request(app)
        .get('/api/user/me')
        .set('Authorization', 'Bearer token-falso');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── ONBOARDING EMPRESA ────────────────────────────────────────────────────
  describe('PATCH /api/user/company', () => {
    it('201 — admin puede crear empresa', async () => {
      const user = await registerAndVerify();
      // Completar perfil primero
      await request(app)
        .put('/api/user/register')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Test', lastName: 'User', nif: '12345678A' });

      const res = await request(app)
        .patch('/api/user/company')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          isFreelance: false,
          name: 'Mi Empresa S.L.',
          cif: `B${Date.now().toString().slice(-8)}`,
          address: {
            street: 'Calle Test',
            number: '1',
            postal: '28001',
            city: 'Madrid',
            province: 'Madrid',
          },
        });

      expect(res.statusCode).toBe(201);
    });

    it('200 — company aparece como objeto cuando existe', async () => {
      const admin = await fullOnboarding();

      const res = await request(app)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.statusCode).toBe(200);
      expect(typeof res.body.data.company).toBe('object');
      expect(res.body.data.company.cif).toBeDefined();
    });

    it('200 — si el CIF ya existe el usuario se une como guest', async () => {
      const cif = `B${Date.now().toString().slice(-8)}`;

      // Admin crea la empresa
      const admin = await registerAndVerify();
      await request(app)
        .put('/api/user/register')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Admin', lastName: 'Test', nif: '12345678A' });
      await request(app)
        .patch('/api/user/company')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          isFreelance: false, name: 'Empresa Compartida S.L.', cif,
          address: {
            street: 'Calle Test', number: '1',
            postal: '28001', city: 'Madrid', province: 'Madrid',
          },
        });

      // Segundo usuario intenta registrar el mismo CIF
      const guest = await registerAndVerify();
      await request(app)
        .put('/api/user/register')
        .set('Authorization', `Bearer ${guest.token}`)
        .send({ name: 'Guest', lastName: 'Test', nif: '87654321B' });

      const res = await request(app)
        .patch('/api/user/company')
        .set('Authorization', `Bearer ${guest.token}`)
        .send({
          isFreelance: false, name: 'Empresa Compartida S.L.', cif,
          address: {
            street: 'Calle Test', number: '1',
            postal: '28001', city: 'Madrid', province: 'Madrid',
          },
        });

      expect(res.statusCode).toBe(200);

      const meRes = await request(app)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${guest.token}`);

      expect(meRes.body.data.role).toBe('guest');
    });

  it('400 — sin perfil previo no puede crear empresa', async () => {
    const user = await registerAndVerify();

    const res = await request(app)
      .patch('/api/user/company')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        isFreelance: false, name: 'Empresa', cif: 'B12345678',
        address: {
          street: 'Calle', number: '1',
          postal: '28001', city: 'Madrid', province: 'Madrid',
        },
      });

    expect(res.statusCode).toBe(400);
  });

    it('400 — sin perfil previo no puede crear empresa', async () => {
      const user = await registerAndVerify();
      // NO completamos el perfil

      const res = await request(app)
        .patch('/api/user/company')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          isFreelance: false,
          name: 'Empresa',
          cif: 'B12345678',
          address: {
            street: 'Calle',
            number: '1',
            postal: '28001',
            city: 'Madrid',
            province: 'Madrid',
          },
        });

      expect(res.statusCode).toBe(400);
    });

    it('401 — sin verificar no puede crear empresa', async () => {
      const user = await registerUser();

      const res = await request(app)
        .patch('/api/user/company')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ isFreelance: true });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── CAMBIO DE CONTRASEÑA ──────────────────────────────────────────────────
  describe('PUT /api/user/password', () => {
    it('200 — cambia la contraseña correctamente', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          currentPassword: user.password,
          newPassword: 'NuevaPass999!',
          confirmPassword: 'NuevaPass999!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('401 — contraseña actual incorrecta', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          currentPassword: 'Incorrecta!',
          newPassword: 'NuevaPass999!',
          confirmPassword: 'NuevaPass999!',
        });

      expect(res.statusCode).toBe(401);
    });

    it('401 — sin token no puede cambiar password', async () => {
      const res = await request(app)
        .put('/api/user/password')
        .send({
          currentPassword: 'ValidPass123!',
          newPassword: 'NuevaPass999!',
          confirmPassword: 'NuevaPass999!',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── REFRESH TOKEN ─────────────────────────────────────────────────────────
  describe('POST /api/user/refresh', () => {
    it('200 — devuelve nuevos tokens con refresh token válido', async () => {
      const user = await registerUser();

      const res = await request(app)
        .post('/api/user/refresh')
        .send({ refreshToken: user.refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('401 — el refresh token antiguo queda invalidado tras rotar', async () => {
      const user = await registerUser();

      await request(app)
        .post('/api/user/refresh')
        .send({ refreshToken: user.refreshToken });

      // Intentar usar el refresh token original otra vez
      const res = await request(app)
        .post('/api/user/refresh')
        .send({ refreshToken: user.refreshToken });

      expect(res.statusCode).toBe(401);
    });

    it('401 — rechaza refresh token inválido', async () => {
      const res = await request(app)
        .post('/api/user/refresh')
        .send({ refreshToken: 'token-falso' });

      expect(res.statusCode).toBe(401);
    });

    it('401 — sin body devuelve 401', async () => {
      const res = await request(app).post('/api/user/refresh').send({});

      expect(res.statusCode).toBe(401);
    });
  });

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  describe('POST /api/user/logout', () => {
    it('200 — cierra sesión correctamente', async () => {
      const user = await registerUser();

      const res = await request(app)
        .post('/api/user/logout')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.statusCode).toBe(200);
    });

    it('401 — el refresh token queda invalidado tras el logout', async () => {
      const user = await registerUser();

      await request(app)
        .post('/api/user/logout')
        .set('Authorization', `Bearer ${user.token}`);

      // Intentar usar el refresh token antiguo
      const res = await request(app)
        .post('/api/user/refresh')
        .send({ refreshToken: user.refreshToken });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── BORRADO DE USUARIO ────────────────────────────────────────────────────
  describe('DELETE /api/user', () => {
    it('200 — soft delete desactiva al usuario', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .delete('/api/user?soft=true')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.statusCode).toBe(200);
    });

    it('200 — hard delete elimina al usuario', async () => {
      const user = await registerAndVerify();

      const res = await request(app)
        .delete('/api/user?soft=false')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.statusCode).toBe(200);
    });

    it('401 — sin token no puede borrar cuenta', async () => {
      const res = await request(app).delete('/api/user?soft=true');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── INVITAR USUARIOS (Admin) ──────────────────────────────────────────────
  describe('POST /api/user/invite', () => {
    it('201 — admin puede invitar a un usuario nuevo', async () => {
      const admin = await fullOnboarding();

      const res = await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          email: `invited_${Date.now()}@test.com`,
          name: 'Invitado',
          lastName: 'Test',
          nif: '99887766K',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.role).toBe('guest');
    });

    it('403 — guest no puede invitar usuarios', async () => {
      const admin = await fullOnboarding();

      // admin.me.company viene del GET /me con populate
      const companyCif = admin.me.company.cif;
      const companyName = admin.me.company.name;
      const companyAddress = admin.me.company.address;

      const guest = await registerAndVerify();
      await request(app)
        .put('/api/user/register')
        .set('Authorization', `Bearer ${guest.token}`)
        .send({ name: 'Guest', lastName: 'Test', nif: '11111111H' });

      await request(app)
        .patch('/api/user/company')
        .set('Authorization', `Bearer ${guest.token}`)
        .send({
          isFreelance: false,
          name: companyName,
          cif: companyCif,
          address: companyAddress,
        });

      const res = await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${guest.token}`)
        .send({
          email: `shouldfail_${Date.now()}@test.com`,
          name: 'X',
          lastName: 'Y',
          nif: '22222222J',
        });

      expect(res.statusCode).toBe(403);
    });

    it('409 — no puede invitar un email ya registrado', async () => {
      const admin = await fullOnboarding();

      // Invitar la primera vez
      const email = `dup_invite_${Date.now()}@test.com`;
      await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ email, name: 'Inv', lastName: 'Test', nif: '11223344P' });

      // Segunda invitación con el mismo email
      const res = await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ email, name: 'Inv2', lastName: 'Test2', nif: '55667788Q' });

      expect(res.statusCode).toBe(409);
    });

    it('401 — sin token no puede invitar', async () => {
      const res = await request(app)
        .post('/api/user/invite')
        .send({ email: 'x@x.com', name: 'X', lastName: 'Y', nif: '00000000T' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── PAPELERA (Admin) ──────────────────────────────────────────────────────
  describe('GET /api/user/trash', () => {
    it('200 — admin puede ver la papelera', async () => {
      const admin = await fullOnboarding();

      const res = await request(app)
        .get('/api/user/trash')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('200 — usuario soft-deleted aparece en la papelera', async () => {
      const admin = await fullOnboarding();

      // Invitamos a un guest
      const email = `trash_${Date.now()}@test.com`;
      const inviteRes = await request(app)
        .post('/api/user/invite')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ email, name: 'ToDelete', lastName: 'Test', nif: '33445566R' });

      const guestId = inviteRes.body.data.id;

      // Admin hace soft delete del guest
      await request(app)
        .delete(`/api/user/${guestId}?soft=true`)
        .set('Authorization', `Bearer ${admin.token}`);

      const res = await request(app)
        .get('/api/user/trash')
        .set('Authorization', `Bearer ${admin.token}`);

      const deletedIds = res.body.data.map(u => u._id);
      expect(deletedIds).toContain(guestId);
    });

    it('401 — sin token no puede acceder a la papelera', async () => {
      const res = await request(app).get('/api/user/trash');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── HEALTH CHECK ──────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('200 — responde con estado ok y db connected', async () => {
      const res = await request(app).get('/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.db).toBe('connected');
      expect(res.body.uptime).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });
  });
});