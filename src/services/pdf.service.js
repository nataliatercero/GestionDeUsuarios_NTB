import PDFDocument from 'pdfkit';

const fmt = (date) =>
  date ? new Date(date).toLocaleDateString('es-ES') : '—';

const section = (doc, title) => {
  doc.moveDown(0.5)
    .fontSize(11).fillColor('#333333').font('Helvetica-Bold').text(title)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#cccccc').stroke()
    .moveDown(0.3);
};

const row = (doc, label, value) => {
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#555555').text(`${label}: `, { continued: true })
    .font('Helvetica').fillColor('#000000').text(String(value ?? '—'));
};

/**
 * Genera un PDF para un albarán y devuelve un Buffer.
 *
 * @param {object} note   - Documento DeliveryNote populado (user, client, project)
 * @param {object} company - Documento Company
 * @returns {Promise<Buffer>}
 */
export const generateDeliveryNotePdf = (note, company) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Cabecera ──────────────────────────────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text('ALBARÁN', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(`Nº ${note._id}`, { align: 'center' });
    doc.moveDown(1);

    // ── Empresa emisora ───────────────────────────────────────────────────────
    section(doc, 'Empresa');
    row(doc, 'Nombre', company?.name);
    row(doc, 'CIF', company?.cif);
    if (company?.address?.street) {
      const addr = company.address;
      row(doc, 'Dirección', `${addr.street} ${addr.number ?? ''}, ${addr.postal ?? ''} ${addr.city ?? ''} (${addr.province ?? ''})`);
    }

    // ── Responsable ───────────────────────────────────────────────────────────
    section(doc, 'Responsable');
    const user = note.user ?? {};
    row(doc, 'Nombre', `${user.name ?? ''} ${user.lastName ?? ''}`.trim());
    row(doc, 'Email', user.email);

    // ── Cliente ───────────────────────────────────────────────────────────────
    section(doc, 'Cliente');
    const client = note.client ?? {};
    row(doc, 'Nombre', client.name);
    row(doc, 'CIF', client.cif);
    if (client.email) row(doc, 'Email', client.email);

    // ── Proyecto ──────────────────────────────────────────────────────────────
    section(doc, 'Proyecto');
    const project = note.project ?? {};
    row(doc, 'Nombre', project.name);
    row(doc, 'Código', project.projectCode);

    // ── Datos del albarán ─────────────────────────────────────────────────────
    section(doc, 'Detalles del albarán');
    row(doc, 'Formato', note.format === 'material' ? 'Material' : 'Horas');
    row(doc, 'Fecha de trabajo', fmt(note.workDate));
    if (note.description) row(doc, 'Descripción', note.description);

    if (note.format === 'material') {
      row(doc, 'Material', note.material);
      row(doc, 'Cantidad', `${note.quantity} ${note.unit ?? ''}`);
    } else {
      if (note.hours != null) {
        row(doc, 'Horas', note.hours);
      }
      if (note.workers?.length) {
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#555555').text('Trabajadores:');
        note.workers.forEach((w) => {
          doc.fontSize(10).font('Helvetica').fillColor('#000000')
            .text(`  • ${w.name}: ${w.hours} h`);
        });
      }
    }

    // ── Firma ─────────────────────────────────────────────────────────────────
    if (note.signed) {
      section(doc, 'Firma');
      row(doc, 'Firmado el', fmt(note.signedAt));

      if (note.signatureUrl) {
        doc.moveDown(0.5);
        // La imagen de firma se incrusta desde URL — pdfkit acepta HTTP URLs
        try {
          doc.image(note.signatureUrl, { fit: [200, 100], align: 'left' });
        } catch {
          doc.fontSize(9).fillColor('#999999').text('(imagen de firma no disponible)');
        }
      }
    }

    // ── Pie de página ─────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#aaaaaa')
      .text(`Generado el ${fmt(new Date())}`, { align: 'center' });

    doc.end();
  });
