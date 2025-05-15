import type { Request, Response, NextFunction } from 'express';
import { ApiKeyFactory } from '../auth/api-key-factory.js';
import { logger } from '../utils/logger.js';

async function getProvider() {
  return await ApiKeyFactory.getProvider();
}

export interface AuthenticatedRequest extends Request {
  apiKeyId?: string;
}

export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Missing Authorization header', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Invalid Authorization header format', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Authorization header format. Expected: Bearer <api-key>',
      });
      return;
    }

    const apiKey = parts[1];

    const keyProvider = await getProvider();
    const result = await keyProvider.validateApiKey(apiKey);

    if (!result.valid) {
      logger.warn('Invalid API key', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        error: result.error,
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: result.error || 'Invalid API key',
      });
      return;
    }

    (req as AuthenticatedRequest).apiKeyId = result.keyId;

    next();
  } catch (error) {
    logger.error('API key authentication error', error as Error, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}
