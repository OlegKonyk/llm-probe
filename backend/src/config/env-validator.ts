import { z } from 'zod';

const envSchema = z.object({
  // Ollama Configuration
  OLLAMA_HOST: z
    .string()
    .url('OLLAMA_HOST must be a valid URL')
    .default('http://localhost:11434'),

  OLLAMA_MODEL: z
    .string()
    .min(1, 'OLLAMA_MODEL cannot be empty')
    .default('llama3.2:latest'),

  // Server Configuration
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // CORS Configuration
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((origins) => origins.split(',').map((origin) => origin.trim()))
    .refine(
      (origins) => origins.every((origin) => {
        try {
          new URL(origin);
          return true;
        } catch {
          return false;
        }
      }),
      'ALLOWED_ORIGINS must be comma-separated valid URLs'
    ),

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),

  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(): ValidatedEnv {
  try {
    const validated = envSchema.parse({
      OLLAMA_HOST: process.env.OLLAMA_HOST,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL,
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    });

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Environment variable validation failed:\n');
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        console.error(`  ${path}: ${err.message}`);
      });
      console.error('\nPlease check your .env file or environment variables.\n');
    }
    throw error;
  }
}
