import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { validateEnv } from './config/env-validator.js';
import { summarizationRouter } from './api/summarization.js';

const config = validateEnv();
const app = express();

if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

app.use(helmet());
app.use(cors({
  origin: config.ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(limiter);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1', summarizationRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || err.statusCode,
    path: req.path,
    method: req.method
  });

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message || 'Bad request'
  });
});

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

export { config };
