import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { BookingStatus } from '@prisma/client';
import { db } from '../config/database';
import { redis } from '../config/redis';

const INVOICE_TOKEN_TTL = 60; // seconds — single-use, expires in 1 minute

export const invoiceController = {
  /**
   * POST /bookings/:id/invoice-token
   * Issues a short-lived (60s), single-use signed download token.
   * The mobile client exchanges its session JWT for this token, then opens
   * the invoice URL with ?signed_token= — the session JWT never hits a URL.
   */
  issueToken: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const bookingId = req.params.id;

      // Verify the booking exists and the caller is the parker or owner
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        select: { parkerId: true, space: { select: { ownerId: true } } },
      });
      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }
      const isParker = booking.parkerId === userId;
      const isOwner = booking.space.ownerId === userId;
      const isAdmin = req.user!.role === 'ADMIN';
      if (!isParker && !isOwner && !isAdmin) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Generate a cryptographically random token and store its SHA-256 hash
      // in Redis with a TTL. The plaintext token goes to the client; only the
      // hash lives server-side so a Redis breach doesn't expose usable tokens.
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
      const redisKey = `invoice_token:${tokenHash}`;

      await redis.set(redisKey, `${userId}:${bookingId}`, 'EX', INVOICE_TOKEN_TTL);

      res.json({ token: plainToken, expiresIn: INVOICE_TOKEN_TTL });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /** GET /bookings/:id/invoice — streams a PDF invoice for a completed booking */
  download: async (req: Request, res: Response) => {
    try {
      let userId: number;
      const bookingId = req.params.id;

      // Prefer the short-lived signed_token over the session JWT in ?token=.
      // signed_token is single-use: consumed from Redis before the PDF is streamed.
      const signedToken = req.query.signed_token as string | undefined;
      if (signedToken) {
        const tokenHash = crypto.createHash('sha256').update(signedToken).digest('hex');
        const redisKey = `invoice_token:${tokenHash}`;
        let stored: string | null;
        try {
          stored = await redis.get(redisKey);
        } catch {
          res.status(503).json({ error: 'Service temporarily unavailable' });
          return;
        }
        if (!stored) {
          res.status(401).json({ error: 'Invalid or expired download token' });
          return;
        }
        // Consume immediately — single use. Fire-and-forget del; if it fails the
        // 60s TTL will still expire the token naturally.
        redis.del(redisKey).catch(() => {});
        const [storedUserId, storedBookingId] = stored.split(':');
        if (storedBookingId !== bookingId) {
          res.status(403).json({ error: 'Token is not valid for this booking' });
          return;
        }
        userId = parseInt(storedUserId, 10);
      } else {
        // Legacy path: session JWT via ?token= query param (still supported for
        // backward compat but deprecated — mobile should use signed_token).
        if (!req.user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }
        userId = req.user.id;
      }

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: {
          parker: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          space: {
            select: {
              name: true, address: true, ownerId: true,
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

      // Only the parker, the actual space owner, or an admin can download this invoice.
      // (Previously this checked `parkerId !== userId`, which let ANY logged-in
      // user who wasn't the parker pull the invoice — an info-disclosure bug.)
      const isParker = booking.parkerId === userId;
      const isOwner = booking.space.ownerId === userId;
      const callerRole = (req as any).user?.role;
      const isAdmin = callerRole === 'ADMIN';
      if (!isParker && !isOwner && !isAdmin) {
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
      const statusColor = booking.status === BookingStatus.COMPLETED ? '#16a34a' : '#dc2626';
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

      label('Payment Method', col2, y);
      value('Direct Payment to Space Owner', col2, y + 12);

      y += 50;

      const paymentStatus = (booking as any).parkerMarkedPaidAt
        ? 'Confirmed by Owner'
        : 'Pending Owner Confirmation';
      label('Payment Status', col1, y);
      value(paymentStatus, col1, y + 12);

      y += 40;

      // ── Amount box ───────────────────────────────────────────────────────
      doc.rect(50, y, 495, 65).fillColor('#fdf2f8').fill();
      doc.rect(50, y, 495, 65).strokeColor('#DC0159').lineWidth(1).stroke();

      doc.fontSize(12).fillColor('#555555').font('Helvetica').text('Total Amount', 70, y + 15);
      doc.fontSize(10).fillColor('#888888').font('Helvetica').text('(inclusive of platform fee)', 70, y + 32);

      // Use "Rs." not the ₹ glyph — PDFKit's built-in Helvetica has no rupee
      // glyph (U+20B9), so ₹ rendered as a broken "¹". "Rs." renders everywhere
      // and is a standard convention on Indian invoices.
      doc.fontSize(26).fillColor('#DC0159').font('Helvetica-Bold')
        .text(`Rs. ${booking.totalAmount.toFixed(2)}`, 50, y + 14, { align: 'right', width: 480 });

      y += 90;

      // ── Footer ───────────────────────────────────────────────────────────
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#eeeeee').lineWidth(1).stroke();
      y += 15;

      doc.fontSize(9).fillColor('#aaaaaa').font('Helvetica')
        .text('This is a system-generated invoice. No signature required.', 50, y, { align: 'center', width: 495 });
      doc.text('ParkSwift — Smart Parking Platform | support@parkswift.in', 50, y + 14, { align: 'center', width: 495 });

      doc.end();
    } catch (err: unknown) {
      if (!res.headersSent) {
        const status = (err as any)?.statusCode || 500;
        res.status(status).json({ error: 'Failed to generate invoice' });
      }
    }
  },
};
