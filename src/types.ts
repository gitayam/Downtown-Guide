
import { D1Database, R2Bucket } from '@cloudflare/workers-types';

export type Bindings = {
  DB: D1Database;
  RAW_DATA: R2Bucket;
  DISCORD_WEBHOOK_URL: string;
};
