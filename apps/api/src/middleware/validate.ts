import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Zod validation middleware.
 *
 * Usage:
 *   router.post('/', validate(createSpaceSchema), spaceController.createSpace);
 *   router.get('/:id', validate(idParamSchema, 'params'), handler);
 *
 * On failure, returns the standard error shape:
 *   { success: false, error: { message, code: 'VALIDATION_ERROR', status: 400, details: [...] } }
 *
 * On success, replaces req[source] with the parsed (and coerced) value so downstream
 * handlers receive cleaned input.
 */
export const validate = (schema: ZodSchema<any>, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const err = result.error as ZodError;
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
      return;
    }
    // Replace with parsed (coerced) data so downstream handlers get cleaned input
    (req as any)[source] = result.data;
    next();
  };
