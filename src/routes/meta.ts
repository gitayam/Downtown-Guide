
import { Hono } from 'hono';
import { Bindings } from '../types';

const meta = new Hono<{ Bindings: Bindings }>();

// GET /api/sources - List event sources
meta.get('/sources', async (c) => {
  const { DB } = c.env;

  const result = await DB.prepare(`
    SELECT
      id,
      name,
      url,
      type,
      section,
      sync_interval_minutes,
      last_sync,
      last_sync_status,
      last_sync_count,
      is_active
    FROM sources
    ORDER BY section, name
  `).all();

  return c.json({
    data: result.results,
    count: result.results?.length || 0,
  });
});

// GET /api/categories - List distinct event categories
meta.get('/categories', async (c) => {
  const { DB } = c.env;

  // Get all categories from current and future events
  const result = await DB.prepare(`
    SELECT categories FROM events
    WHERE end_datetime >= ? AND categories IS NOT NULL AND categories != '[]'
  `).bind(new Date().toISOString()).all();

  const categorySet = new Set<string>();
  for (const row of result.results || []) {
    try {
      const cats = JSON.parse((row as { categories: string }).categories);
      if (Array.isArray(cats)) {
        cats.forEach((cat: string) => categorySet.add(cat));
      }
    } catch {
      // Skip invalid JSON
    }
  }

  const categories = Array.from(categorySet).sort();

  return c.json({
    data: categories,
    count: categories.length,
  });
});

export default meta;
