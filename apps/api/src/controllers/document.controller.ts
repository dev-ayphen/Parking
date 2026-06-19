import { Request, Response } from 'express';
import {
  uploadSpaceDocument,
  listSpaceDocuments,
  verifySpaceDocument,
  deleteSpaceDocument,
  getAllDocumentRules,
  checkDocumentCompliance,
} from '../services/document.service';
import { auditService } from '../services/audit.service';
import { adminService } from '../services/admin.service';
import { storageService } from '../services/storage.service';
import { db } from '../config/database';
import { emitToUser } from '../app';
import { sendError, BadRequest, Forbidden, assertAuth } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

function mimeToFileType(mime: string): string {
  return mime === 'application/pdf' ? 'PDF' : 'IMAGE';
}

const parseId = (raw: string, label: string) => {
  const n = parseInt(raw, 10);
  if (isNaN(n)) throw BadRequest(`Invalid ${label}`, ErrorCode.INVALID_INPUT);
  return n;
};

export const documentController = {
  /** GET /spaces/document-rules — return all space-type document rules */
  getAllRules: async (_req: Request, res: Response) => {
    res.json({ success: true, rules: getAllDocumentRules() });
  },

  /** GET /spaces/:id/documents — owner-or-admin only (private KYC documents). */
  list: async (req: Request, res: Response) => {
    try {
      const spaceId = parseId(req.params.id, 'space ID');
      assertAuth(req);
      // Only the space owner or an admin may see the (private) documents.
      const space = await db.space.findUnique({ where: { id: spaceId }, select: { ownerId: true } });
      if (!space) throw BadRequest('Space not found', ErrorCode.SPACE_NOT_FOUND);
      if (space.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
        return sendError(res, Forbidden('You do not have access to these documents', ErrorCode.AUTH_FORBIDDEN));
      }
      const docs = await listSpaceDocuments(spaceId);
      res.json({ success: true, documents: docs });
    } catch (e) {
      sendError(res, e);
    }
  },

  /** POST /spaces/:id/documents — multipart/form-data with `file` + `documentType` + `documentLabel` */
  upload: async (req: Request, res: Response) => {
    try {
      const spaceId = parseId(req.params.id, 'space ID');
      assertAuth(req);
      if (!req.file) throw BadRequest('No file uploaded', ErrorCode.DOC_UPLOAD_FAILED);

      const { documentType, documentLabel } = req.body;
      if (!documentType || !documentLabel) {
        throw BadRequest('documentType and documentLabel are required', ErrorCode.VALIDATION_ERROR);
      }

      // Documents are sensitive (KYC/RC) → private bucket; store the object KEY in the DB.
      const stored = await storageService.uploadPrivate({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder: `space-docs/${spaceId}`,
      });
      const fileType = mimeToFileType(req.file.mimetype);

      const doc = await uploadSpaceDocument(spaceId, req.user.id, documentType, documentLabel, stored.key, fileType, req.file.size);
      res.status(201).json({ success: true, document: doc });
    } catch (e) {
      sendError(res, e);
    }
  },

  /** DELETE /spaces/:id/documents/:docId */
  remove: async (req: Request, res: Response) => {
    try {
      const docId = parseId(req.params.docId, 'document ID');
      assertAuth(req);
      await deleteSpaceDocument(docId, req.user.id);
      res.json({ success: true });
    } catch (e) {
      sendError(res, e);
    }
  },

  /** GET /spaces/:id/document-compliance */
  compliance: async (req: Request, res: Response) => {
    try {
      const spaceId = parseId(req.params.id, 'space ID');
      const result = await checkDocumentCompliance(spaceId);
      res.json({ success: true, ...result });
    } catch (e) {
      sendError(res, e);
    }
  },

  /** PUT /admin/spaces/:id/documents/:docId/verify — admin action */
  adminVerify: async (req: Request, res: Response) => {
    try {
      const docId = parseId(req.params.docId, 'document ID');
      assertAuth(req);
      const { action, rejectionReason } = req.body;
      if (!['VERIFIED', 'REJECTED'].includes(action)) {
        throw BadRequest('action must be VERIFIED or REJECTED', ErrorCode.DOC_INVALID_ACTION);
      }

      const doc = await verifySpaceDocument(docId, req.user.id, action, rejectionReason);
      await auditService.logAdminAction({
        adminId: req.user.id,
        action: action === 'VERIFIED' ? 'DOC_VERIFIED' : 'DOC_REJECTED',
        targetType: 'DOCUMENT',
        targetId: docId,
        reason: rejectionReason,
        payload: { spaceId: parseInt(req.params.id) },
        req,
      });

      // Notify the space owner that their document was reviewed (DB + push + live
      // socket) so they don't have to refetch to find out.
      const space = await db.space.findUnique({
        where: { id: (doc as any).spaceId },
        select: { ownerId: true, name: true },
      });
      if (space?.ownerId) {
        const verified = action === 'VERIFIED';
        emitToUser(space.ownerId, 'space:status', { spaceId: (doc as any).spaceId, docReviewed: action });
        await adminService.notifyUser(space.ownerId, {
          title: verified ? 'Document Verified' : 'Document Rejected',
          message: verified
            ? `A document for "${space.name}" was verified.`
            : `A document for "${space.name}" was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''} Please re-upload it.`,
          category: 'SPACE',
          metadata: { spaceId: (doc as any).spaceId },
        });
      }

      res.json({ success: true, document: doc });
    } catch (e) {
      sendError(res, e);
    }
  },

  /** GET /admin/spaces/:id/documents — admin view */
  adminListForSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseId(req.params.id, 'space ID');
      const docs = await listSpaceDocuments(spaceId);
      const compliance = await checkDocumentCompliance(spaceId);
      res.json({ success: true, documents: docs, compliance });
    } catch (e) {
      sendError(res, e);
    }
  },
};
