import { db } from '../config/database';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export const logEvent = async (
  level: LogLevel,
  source: string,
  message: string,
  metadata?: Record<string, any>,
  actorId?: number,
) => {
  try {
    await db.systemLog.create({
      data: { level, source, message, metadata: metadata ?? {}, actorId: actorId ?? null },
    });
  } catch (e) {
    console.error('[log.service] failed to write log:', (e as Error).message);
  }
};
