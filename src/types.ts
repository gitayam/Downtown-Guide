
import { D1Database, R2Bucket, Ai } from '@cloudflare/workers-types';

export type Bindings = {
  DB: D1Database;
  RAW_DATA: R2Bucket;
  DISCORD_WEBHOOK_URL: string;
  OPENAI_API_KEY: string;
  AI: Ai; // Cloudflare Workers AI (alternative to OpenAI)
};
