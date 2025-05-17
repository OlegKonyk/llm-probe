import { z } from 'zod';

const envSchema = z.object({
  // LLM Provider Configuration
  LLM_PROVIDER: z
    .enum(['ollama', 'bedrock'])
    .default('ollama'),

  // Ollama Configuration
  OLLAMA_HOST: z
    .string()
    .url('OLLAMA_HOST must be a valid URL')
    .default('http://localhost:11434'),

  OLLAMA_MODEL: z
    .string()
    .min(1, 'OLLAMA_MODEL cannot be empty')
    .default('llama3.2:latest'),

  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(90000).optional(),

  // AWS Bedrock Configuration
  AWS_REGION: z
    .string()
    .min(1, 'AWS_REGION cannot be empty')
    .default('us-east-2')
    .optional(),

  AWS_PROFILE: z
    .string()
    .min(1, 'AWS_PROFILE cannot be empty')
    .optional(),

  BEDROCK_MODEL: z
    .string()
    .min(1, 'BEDROCK_MODEL cannot be empty')
    .default('us.amazon.nova-lite-v1:0')
    .optional(),

  BEDROCK_TIMEOUT_MS: z.coerce.number().int().positive().default(90000).optional(),

  // API Key Authentication Configuration
  API_KEY_PROVIDER: z
    .enum(['env', 'secrets-manager'])
    .default('env')
    .optional(),

  API_KEY: z
    .string()
    .min(1, 'API_KEY cannot be empty')
    .optional(),

  API_KEYS_SECRET_NAME: z
    .string()
    .min(1, 'API_KEYS_SECRET_NAME cannot be empty')
    .optional(),

  API_KEYS_CACHE_TTL_MS: z.coerce.number().int().positive().default(300000).optional(),

  // Server Configuration
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

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

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),

  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Set to true when behind reverse proxy (Nginx, ALB, etc.)
  TRUST_PROXY: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

export function validateEnv(): ValidatedEnv {
  try {
    const validated = envSchema.parse({
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      OLLAMA_HOST: process.env.OLLAMA_HOST,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL,
      OLLAMA_TIMEOUT_MS: process.env.OLLAMA_TIMEOUT_MS,
      AWS_REGION: process.env.AWS_REGION,
      AWS_PROFILE: process.env.AWS_PROFILE,
      BEDROCK_MODEL: process.env.BEDROCK_MODEL,
      BEDROCK_TIMEOUT_MS: process.env.BEDROCK_TIMEOUT_MS,
      API_KEY_PROVIDER: process.env.API_KEY_PROVIDER,
      API_KEY: process.env.API_KEY,
      API_KEYS_SECRET_NAME: process.env.API_KEYS_SECRET_NAME,
      API_KEYS_CACHE_TTL_MS: process.env.API_KEYS_CACHE_TTL_MS,
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
      TRUST_PROXY: process.env.TRUST_PROXY,
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
