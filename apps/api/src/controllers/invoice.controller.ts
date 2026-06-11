import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../config/database';

export const invoiceController = {
  /** GET /bookings/:id/invoice — streams a PDF invoice for a completed booking */
  download: async (req: Request, res: Response) => {
    try {
      // authenticate middleware already validated the token (supports ?token= query param too)
      const userId = req.user!.id;
      const bookingId = req.params.id;

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: {
          parker: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          space: {
            select: {
              name: true, address: true,
              owner: { select: { firstName: true, lastName: true, phone: true } },
            },
          },
          vehicle: { select: { brandModel: true, licensePlate: true, vehicleType: true } },
        },
      });

      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }

      // Only the parker or the space owner can download this invoice
      const isParker = booking.parkerId === userId;
      const isOwner = booking.space.owner && booking.parkerId !== userId;
      if (!isParker && !isOwner) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const parkerName = [booking.parker.firstName, booking.parker.lastName].filter(Boolean).join(' ') || booking.parker.phone;
      const ownerName = [booking.space.owner?.firstName, booking.space.owner?.lastName].filter(Boolean).join(' ') || '—';
      const shortId = `#${bookingId.slice(-8).toUpperCase()}`;
      const invoiceNo = `INV-${bookingId.slice(-6).toUpperCase()}`;
      const issuedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const bookingDate = new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const sessionStart = booking.sessionStartedAt
        ? new Date(booking.sessionStartedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';
      const sessionEnd = booking.sessionEndedAt
        ? new Date(booking.sessionEndedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';

      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${shortId}.pdf"`);
      doc.pipe(res);

      // ── Brand header ────────────────────────────────────────────────────
      doc.fontSize(28).fillColor('#DC0159').font('Helvetica-Bold').text('ParkSwift', 50, 50);
      doc.fontSize(10).fillColor('#888888').font('Helvetica').text('Smart Parking Platform', 50, 82);

      // Invoice title + number (right side)
      doc.fontSize(22).fillColor('#1a1a1a').font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).fillColor('#555555').font('Helvetica').text(invoiceNo, 400, 78, { align: 'right' });
      doc.fontSize(9).fillColor('#888888').text(`Issued: ${issuedDate}`, 400, 92, { align: 'right' });

      // Divider
      doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#DC0159').lineWidth(2).stroke();

      // ── Booking details ──────────────────────────────────────────────────
      const col1 = 50, col2 = 300;
      let y = 140;

      const label = (txt: string, x: number, yy: number) => {
        doc.fontSize(8).fillColor('#999999').font('Helvetica').text(txt.toUpperCase(), x, yy);
      };
      const value = (txt: string, x: number, yy: number, opts: any = {}) => {
        doc.fontSize(11).fillColor('#1a1a1a').font('Helvetica-Bold').text(txt, x, yy, { width: 220, ...opts });
      };

      label('Booking ID', col1, y);
      value(shortId, col1, y + 12);

      label('Booking Date', col2, y);
      value(bookingDate, col2, y + 12);

      y += 50;

      label('Parker Name', col1, y);
      value(parkerName, col1, y + 12);

      label('Space Owner', col2, y);
      value(ownerName, col2, y + 12);

      y += 50;

      label('Contact', col1, y);
      doc.fontSize(10).fillColor('#333333').font('Helvetica')
        .text(booking.parker.phone || '—', col1, y + 12);

      label('Booking Status', col2, y);
      const statusColor = booking.status === 'COMPLETED' ? '#16a34a' : '#dc2626';
      doc.fontSize(11).fillColor(statusColor).font('Helvetica-Bold').text(booking.status, col2, y + 12);

      y += 55;

      // ── Space & Vehicle ──────────────────────────────────────────────────
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#eeeeee').lineWidth(1).stroke();
      y += 15;

      label('Parking Space', col1, y);
      value(booking.space.name, col1, y + 12);

      label('Vehicle', col2, y);
      value(`${booking.vehicle.brandModel} (${booking.vehicle.licensePlate})`, col2, y + 12);

      y += 50;

      label('Address', col1, y);
      doc.fontSize(10).fillColor('#333333').font('Helvetica')
        .text(booking.space.address, col1, y + 12, { width: 220 });

      label('Vehicle Type', col2, y);
      doc.fontSize(10).fillColor('#333333').font('Helvetica').text(booking.vehicle.vehicleType, col2, y + 12);

      y += 55;

      // ── Session info ─────────────────────────────────────────────────────
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#eeeeee').lineWidth(1).stroke();
      y += 15;

      label('Session Start', col1, y);
      value(sessionStart, col1, y + 12);

      label('Session End', col2, y);
      value(sessionEnd, col2, y + 12);

      y += 50;

      label('Duration (Booked)', col1, y);
      value(`${booking.duration} hour${booking.duration !== 1 ? 's' : ''}`, col1, y + 12);

      label('Payment Mode', col2, y);
      value(booking.paymentMode.replace(/_/g, ' '), col2, y + 12);

      y += 60;

      // ── Amount box ───────────────────────────────────────────────────────
      doc.rect(50, y, 495, 65).fillColor('#fdf2f8').fill();
      doc.rect(50, y, 495, 65).strokeColor('#DC0159').lineWidth(1).stroke();

      doc.fontSize(12).fillColor('#555555').font('Helvetica').text('Total Amount', 70, y + 15);
      doc.fontSize(10).fillColor('#888888').font('Helvetica').text('(inclusive of platform fee)', 70, y + 32);

      doc.fontSize(26).fillColor('#DC0159').font('Helvetica-Bold')
        .text(`₹${booking.totalAmount.toFixed(2)}`, 50, y + 14, { align: 'right', width: 480 });

      y += 90;

      // ── Footer ───────────────────────────────────────────────────────────
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#eeeeee').lineWidth(1).stroke();
      y += 15;

      doc.fontSize(9).fillColor('#aaaaaa').font('Helvetica')
        .text('This is a system-generated invoice. No signature required.', 50, y, { align: 'center', width: 495 });
      doc.text('ParkSwift — Smart Parking Platform | support@parkswift.in', 50, y + 14, { align: 'center', width: 495 });

      doc.end();
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(err.statusCode || 500).json({ error: err.message || 'Failed to generate invoice' });
      }
    }
  },
};
