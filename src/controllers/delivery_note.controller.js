import PDFDocument from 'pdfkit';

export const returnPdf = async (req, res) => {
    var doc = new PDFDocument();
    doc.pipe(res)

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="albaransinfirma.pdf"');
    doc.text('Aprendiendo a usar pdfkit y cloudinary', 100, 450)
    doc.circle(280, 200, 50).fill('#6600FF');

    doc.end();
}

