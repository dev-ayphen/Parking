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

async function nextTxnNumber(): Promise<string> {
  const last = await db.transaction.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  const next = (last?.id ?? 0) + 1;
  return `TXN-${String(next).padStart(4, '0')}`;
}

export const transactionService = {
  record: async (opts: RecordOpts) => {
    return db.transaction.create({
      data: {
        txnNumber: await nextTxnNumber(),
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
  },
};
