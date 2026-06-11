import { db } from '../config/database';
import { redis } from '../config/redis';
import path from 'path';
import fs from 'fs';

const REDIS_DOC_TTL = 60 * 60; // 1 hour

// ────────────────────────────────────────────────────────────────────────────
// Space-type → required document rules
// Source: COMPLIANCE_AND_TERMS.md
// ────────────────────────────────────────────────────────────────────────────

export interface DocRequirement {
  type: string;        // enum key stored in DB
  label: string;       // displayed to user
  accept: string[];    // mime types allowed
  required: boolean;
  group?: string;      // docs in same group satisfy each other (OR logic)
}

export interface SpaceTypeRule {
  spaceType: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresAdminReview: boolean;
  docs: DocRequirement[];
  note?: string;       // extra info shown to user
}

export const SPACE_TYPE_RULES: Record<string, SpaceTypeRule> = {
  'Independent House': {
    spaceType: 'Independent House',
    riskLevel: 'LOW',
    requiresAdminReview: false,
    docs: [
      { type: 'EB_BILL',      label: 'EB Bill',       accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true,  group: 'ownership' },
      { type: 'PROPERTY_TAX', label: 'Property Tax',  accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: false, group: 'ownership' },
      { type: 'WATER_BILL',   label: 'Water Bill',    accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: false, group: 'ownership' },
    ],
    note: 'Upload any ONE of EB Bill, Property Tax, or Water Bill',
  },
  'Rented House': {
    spaceType: 'Rented House',
    riskLevel: 'MEDIUM',
    requiresAdminReview: false,
    docs: [
      { type: 'RENTAL_AGREEMENT', label: 'Rental Agreement', accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true,  group: 'rental_proof' },
      { type: 'OWNER_PERMISSION', label: 'Owner Permission',  accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: false, group: 'rental_proof' },
      { type: 'EB_BILL',          label: 'EB Bill',           accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: false, group: 'rental_proof' },
    ],
    note: 'Upload Rental Agreement OR (EB Bill + Owner Permission)',
  },
  'Apartment Owner Slot': {
    spaceType: 'Apartment Owner Slot',
    riskLevel: 'LOW',
    requiresAdminReview: false,
    docs: [
      { type: 'MAINTENANCE_BILL',        label: 'Maintenance Bill',         accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true,  group: 'slot_ownership' },
      { type: 'PARKING_ALLOCATION_PHOTO', label: 'Parking Allocation Photo', accept: ['image/jpeg','image/jpg','image/png'],                   required: false, group: 'slot_ownership' },
    ],
    note: 'Upload Maintenance Bill OR Parking Allocation Photo',
  },
  'Apartment Tenant Slot': {
    spaceType: 'Apartment Tenant Slot',
    riskLevel: 'MEDIUM',
    requiresAdminReview: false,
    docs: [
      { type: 'RENTAL_AGREEMENT',  label: 'Rental Agreement',  accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true },
      { type: 'PARKING_PERMISSION', label: 'Parking Permission', accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true },
    ],
    note: 'Both Rental Agreement AND Parking Permission are required',
  },
  'Gated Villa': {
    spaceType: 'Gated Villa',
    riskLevel: 'LOW',
    requiresAdminReview: false,
    docs: [
      { type: 'PROPERTY_TAX', label: 'Property Tax', accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true,  group: 'villa_proof' },
      { type: 'EB_BILL',      label: 'EB Bill',       accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: false, group: 'villa_proof' },
    ],
    note: 'Upload Property Tax or EB Bill',
  },
  'Shop Front Parking': {
    spaceType: 'Shop Front Parking',
    riskLevel: 'MEDIUM',
    requiresAdminReview: false,
    docs: [
      { type: 'SHOP_LICENSE',      label: 'Shop License',      accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true,  group: 'commercial' },
      { type: 'GST_CERTIFICATE',   label: 'GST Certificate',   accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: false, group: 'commercial' },
      { type: 'RENTAL_AGREEMENT',  label: 'Rental Agreement',  accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: false, group: 'commercial' },
    ],
    note: 'Upload any ONE of Shop License, GST, or Rental Agreement',
  },
  'Office Parking': {
    spaceType: 'Office Parking',
    riskLevel: 'LOW',
    requiresAdminReview: false,
    docs: [
      { type: 'COMPANY_ID',        label: 'Company ID',        accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true },
      { type: 'PARKING_PERMISSION', label: 'Parking Permission', accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true },
    ],
    note: 'Both Company ID AND Parking Permission are required',
  },
  'Vacant Private Land': {
    spaceType: 'Vacant Private Land',
    riskLevel: 'LOW',
    requiresAdminReview: false,
    docs: [
      { type: 'LAND_TAX_RECEIPT', label: 'Land Tax Receipt', accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true,  group: 'land_proof' },
      { type: 'PATTA_COPY',        label: 'Patta Copy',        accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: false, group: 'land_proof' },
    ],
    note: 'Upload Land Tax Receipt or Patta Copy',
  },
  'Inside Compound': {
    spaceType: 'Inside Compound',
    riskLevel: 'MEDIUM',
    requiresAdminReview: false,
    docs: [
      { type: 'ADDRESS_PROOF',   label: 'Address Proof',   accept: ['image/jpeg','image/jpg','image/png','application/pdf'], required: true },
      { type: 'COMPOUND_PHOTO',  label: 'Compound Photo',  accept: ['image/jpeg','image/jpg','image/png'],                   required: true },
    ],
    note: 'Address Proof AND Compound Photos are required',
  },
  'Open Frontage Area': {
    spaceType: 'Open Frontage Area',
    riskLevel: 'HIGH',
    requiresAdminReview: true,
    docs: [
      { type: 'AREA_PHOTO', label: 'Area Photo (multiple)',  accept: ['image/jpeg','image/jpg','image/png'], required: true },
    ],
    note: 'Upload clear area photos. This space type requires mandatory admin review.',
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Redis helpers
// ────────────────────────────────────────────────────────────────────────────

const docStatusKey = (spaceId: number) => `doc_status:${spaceId}`;

export const invalidateDocCache = (spaceId: number) =>
  redis.del(docStatusKey(spaceId)).catch(() => {});

// ────────────────────────────────────────────────────────────────────────────
// Service functions
// ────────────────────────────────────────────────────────────────────────────

export const getDocumentRules = (spaceType: string): SpaceTypeRule | null =>
  SPACE_TYPE_RULES[spaceType] ?? null;

export const getAllDocumentRules = () =>
  Object.values(SPACE_TYPE_RULES).map(({ spaceType, riskLevel, requiresAdminReview, docs, note }) => ({
    spaceType, riskLevel, requiresAdminReview, docs, note,
  }));

/** Upload a document for a space. Returns the created SpaceDocument record. */
export const uploadSpaceDocument = async (
  spaceId: number,
  ownerId: number,
  documentType: string,
  documentLabel: string,
  fileUrl: string,
  fileType: string,
  fileSizeBytes?: number,
) => {
  // Verify space ownership
  const space = await db.space.findFirst({ where: { id: spaceId, ownerId } });
  if (!space) throw { status: 403, message: 'Space not found or access denied' };

  const doc = await db.spaceDocument.create({
    data: { spaceId, documentType, documentLabel, fileUrl, fileType, fileSizeBytes: fileSizeBytes ?? null },
  });

  await invalidateDocCache(spaceId);
  return doc;
};

/** List documents for a space. Uses Redis to cache the result. */
export const listSpaceDocuments = async (spaceId: number) => {
  const cacheKey = docStatusKey(spaceId);
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached);

  const docs = await db.spaceDocument.findMany({
    where: { spaceId },
    orderBy: { createdAt: 'desc' },
  });

  await redis.set(cacheKey, JSON.stringify(docs), 'EX', REDIS_DOC_TTL).catch(() => {});
  return docs;
};

/** Admin: verify or reject a document. */
export const verifySpaceDocument = async (
  docId: number,
  adminId: number,
  action: 'VERIFIED' | 'REJECTED',
  rejectionReason?: string,
) => {
  const doc = await db.spaceDocument.findUnique({ where: { id: docId } });
  if (!doc) throw { status: 404, message: 'Document not found' };

  const updated = await db.spaceDocument.update({
    where: { id: docId },
    data: {
      status: action,
      verifiedAt: action === 'VERIFIED' ? new Date() : null,
      verifiedById: adminId,
      rejectionReason: action === 'REJECTED' ? (rejectionReason ?? 'Rejected by admin') : null,
    },
  });

  await invalidateDocCache(doc.spaceId);
  return updated;
};

/** Delete an uploaded document file + DB record (owner only). */
export const deleteSpaceDocument = async (docId: number, ownerId: number) => {
  const doc = await db.spaceDocument.findFirst({
    where: { id: docId },
    include: { space: { select: { ownerId: true } } },
  });
  if (!doc || doc.space.ownerId !== ownerId) throw { status: 403, message: 'Not found or access denied' };

  // Remove file from disk
  const filePath = path.join(process.cwd(), doc.fileUrl.replace(/^\//, ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.spaceDocument.delete({ where: { id: docId } });
  await invalidateDocCache(doc.spaceId);
};

/** Check if all required documents for a space's type have been uploaded and not rejected. */
export const checkDocumentCompliance = async (spaceId: number): Promise<{
  compliant: boolean;
  missingDocs: string[];
  rule: SpaceTypeRule | null;
}> => {
  const space = await db.space.findUnique({ where: { id: spaceId }, select: { spaceType: true } });
  if (!space) return { compliant: false, missingDocs: ['Space not found'], rule: null };

  const rule = SPACE_TYPE_RULES[space.spaceType];
  if (!rule) return { compliant: true, missingDocs: [], rule: null };

  const docs = await db.spaceDocument.findMany({
    where: { spaceId, status: { not: 'REJECTED' } },
    select: { documentType: true },
  });
  const uploadedTypes = new Set(docs.map(d => d.documentType));

  // Group-based OR logic: a group is satisfied if ANY doc in that group is uploaded
  const satisfiedGroups = new Set<string>();
  const satisfiedRequired = new Set<string>();

  for (const req of rule.docs) {
    if (req.group) {
      if (uploadedTypes.has(req.type)) satisfiedGroups.add(req.group);
    } else if (req.required && uploadedTypes.has(req.type)) {
      satisfiedRequired.add(req.type);
    }
  }

  const missingDocs: string[] = [];
  const requiredGroups = new Set<string>();
  const requiredNonGroup: DocRequirement[] = [];

  for (const req of rule.docs) {
    if (req.required) {
      if (req.group) requiredGroups.add(req.group);
      else requiredNonGroup.push(req);
    }
  }

  for (const group of requiredGroups) {
    if (!satisfiedGroups.has(group)) {
      const groupDocs = rule.docs.filter(d => d.group === group).map(d => d.label);
      missingDocs.push(`One of: ${groupDocs.join(' / ')}`);
    }
  }
  for (const req of requiredNonGroup) {
    if (!satisfiedRequired.has(req.type)) missingDocs.push(req.label);
  }

  return { compliant: missingDocs.length === 0, missingDocs, rule };
};
