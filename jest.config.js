export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js'],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  forceExit: true,

  // setupFilesAfterEnv: se ejecuta DENTRO del entorno Jest (tiene acceso a beforeAll/afterAll)
  // Es para conectar/desconectar mongodb-memory-server
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};