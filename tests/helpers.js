import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose';

export const registerUser = async (overrides = {}) => {
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

export const getVerificationCode = async (userId) => {
  const doc = await mongoose.connection
    .collection('users')
    .findOne({ _id: new mongoose.Types.ObjectId(userId) });
  return doc?.verificationCode;
};

export const registerAndVerify = async (overrides = {}) => {
  const user = await registerUser(overrides);
  const code = await getVerificationCode(user.userId);
  await request(app)
    .put('/api/user/validation')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ code });
  return user;
};

export const fullOnboarding = async () => {
  const user = await registerAndVerify();

  await request(app)
    .put('/api/user/register')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ name: 'Test', lastName: 'User', nif: '12345678A' });

  const cif = `B${Date.now().toString().slice(-8)}`;
  await request(app)
    .patch('/api/user/company')
    .set('Authorization', `Bearer ${user.token}`)
    .send({
      isFreelance: false,
      name: 'Test Corp S.L.',
      cif,
      address: { street: 'Calle Test', number: '1', postal: '28001', city: 'Madrid', province: 'Madrid' },
    });

  const meRes = await request(app).get('/api/user/me').set('Authorization', `Bearer ${user.token}`);
  return { ...user, me: meRes.body.data };
};

export const makeClient = (overrides = {}) => ({
  name: 'Constructora López S.L.',
  cif: `A${Math.random().toString().slice(2, 10)}`,
  ...overrides,
});

export const makeProject = (clientId, overrides = {}) => ({
  name: 'Reforma Oficina',
  projectCode: `PRJ${Math.random().toString().slice(2, 9)}`,
  client: clientId,
  ...overrides,
});
