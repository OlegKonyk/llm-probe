import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { validateEnv } from './config/env-validator.js';

const config = validateEnv();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // If headers already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log full error details server-side only
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || err.statusCode,
    path: req.path,
    method: req.method
  });

  // Preserve status code from Express errors (e.g., 400 for invalid JSON)
  // Otherwise default to 500
  const statusCode = err.status || err.statusCode || 500;

  // Return generic message to prevent information leakage
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message || 'Bad request'
  });
});

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

export { config };
