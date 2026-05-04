import { generateDeliveryNotePdf } from '../src/services/pdf.service.js';

// PDFKit funciona 100% en memoria — no necesita servicios externos

const makeNote = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  format: 'material',
  workDate: new Date('2025-06-15'),
  description: 'Entrega de materiales',
  material: 'Cemento Portland',
  quantity: 50,
  unit: 'kg',
  signed: false,
  user:    { name: 'Juan', lastName: 'García', email: 'juan@test.com' },
  client:  { name: 'Constructora SL', cif: 'B12345678', email: 'client@test.com' },
  project: { name: 'Reforma Oficina', projectCode: 'PRJ001' },
  ...overrides,
});

const makeCompany = (overrides = {}) => ({
  name: 'Test Corp S.L.',
  cif: 'A87654321',
  address: { street: 'Calle Test', number: '1', postal: '28001', city: 'Madrid', province: 'Madrid' },
  ...overrides,
});

describe('generateDeliveryNotePdf', () => {

  it('devuelve un Buffer', async () => {
    const buf = await generateDeliveryNotePdf(makeNote(), makeCompany());
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('el buffer empieza con la cabecera PDF (%PDF)', async () => {
    const buf = await generateDeliveryNotePdf(makeNote(), makeCompany());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('genera PDF de formato material', async () => {
    const buf = await generateDeliveryNotePdf(
      makeNote({ format: 'material', material: 'Arena fina', quantity: 200, unit: 'kg' }),
      makeCompany()
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('genera PDF de formato horas simples', async () => {
    const buf = await generateDeliveryNotePdf(
      makeNote({ format: 'hours', hours: 8, material: undefined, quantity: undefined, unit: undefined }),
      makeCompany()
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('genera PDF de horas con múltiples trabajadores', async () => {
    const buf = await generateDeliveryNotePdf(
      makeNote({
        format: 'hours',
        hours: null,
        workers: [
          { name: 'Ana López', hours: 6 },
          { name: 'Pedro Sánchez', hours: 4 },
        ],
      }),
      makeCompany()
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('genera PDF de albarán firmado sin imagen de firma (signatureUrl null)', async () => {
    const buf = await generateDeliveryNotePdf(
      makeNote({ signed: true, signedAt: new Date('2025-07-01'), signatureUrl: null }),
      makeCompany()
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('genera PDF con imagen de firma inválida — el catch muestra el texto de fallback', async () => {
    // doc.image() lanzará porque el path no existe; el catch lo captura y añade texto
    const buf = await generateDeliveryNotePdf(
      makeNote({ signed: true, signedAt: new Date(), signatureUrl: './nonexistent-signature.png' }),
      makeCompany()
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('genera PDF con cliente sin email (rama opcional de client.email)', async () => {
    const buf = await generateDeliveryNotePdf(
      makeNote({ client: { name: 'Cliente Básico', cif: 'C11111111' } }),
      makeCompany()
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('genera PDF con fecha de trabajo nula — fmt devuelve guión', async () => {
    const buf = await generateDeliveryNotePdf(
      makeNote({ workDate: null }),
      makeCompany()
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('genera PDF con empresa sin dirección', async () => {
    const buf = await generateDeliveryNotePdf(
      makeNote(),
      makeCompany({ address: null })
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('genera PDF con empresa y nota completamente vacíos (valores mínimos)', async () => {
    const buf = await generateDeliveryNotePdf(
      makeNote({ user: {}, client: {}, project: {}, description: null }),
      {}
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});
