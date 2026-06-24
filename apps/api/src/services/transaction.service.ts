import { db } from '../config/database';

type TxnType = 'SUBSCRIPTION' | 'BOOKING_PAYMENT' | 'OWNER_PAYOUT' | 'REFUND';
type TxnStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

interface RecordOpts {
  type: TxnType;
  amount: number; // positive for inflow, negative for outflow
  status?: TxnStatus;
  paymentMethod?: string;
  description?: string;
  userId?: number | null;
  entityLabel?: string | null;
  subscriptionId?: number | null;
  bookingId?: string | null;
}

export const transactionService = {
  // The txnNumber is derived from the row's OWN auto-increment id (race-free),
  // not from a read-max-then-+1 (which two concurrent writers could duplicate).
  // We create with a guaranteed-unique placeholder, then stamp the final number
  // from the real id — both steps in one transaction.
  record: async (opts: RecordOpts) => {
    return db.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          // Unique placeholder until we know the row id (cuid-ish uniqueness).
          txnNumber: `PENDING-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
          type: opts.type,
          amount: opts.amount,
          status: opts.status ?? 'SUCCESS',
          paymentMethod: opts.paymentMethod ?? 'UPI',
          description: opts.description,
          userId: opts.userId ?? undefined,
          entityLabel: opts.entityLabel ?? undefined,
          subscriptionId: opts.subscriptionId ?? undefined,
          bookingId: opts.bookingId ?? undefined,
        },
      });
      return tx.transaction.update({
        where: { id: created.id },
        data: { txnNumber: `TXN-${String(created.id).padStart(4, '0')}` },
      });
    });
  },
};
