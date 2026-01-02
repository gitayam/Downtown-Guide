
import { D1Database } from '@cloudflare/workers-types';

// Helper: Fetch Events Logic
export async function fetchEvents(DB: D1Database, params: {
  section?: string;
  source?: string;
  from?: string;
  to?: string;
  search?: string;
  category?: string;
  categories?: string;
  featured?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const queryParams: any[] = [];

  // Only show confirmed or active events
  conditions.push("e.status IN ('confirmed', 'active')");

  // Date filters
  const now = new Date().toISOString();
  if (!params.from) {
    // Default: show events active now or in future
    conditions.push('datetime(e.end_datetime) >= datetime(?)');
    queryParams.push(now);
  } else {
    conditions.push('datetime(e.start_datetime) >= datetime(?)');
    queryParams.push(params.from);
  }

  if (params.to) {
    conditions.push('datetime(e.start_datetime) <= datetime(?)');
    queryParams.push(params.to);
  }

  if (params.section && params.section !== 'all') {
    conditions.push('e.section = ?');
    queryParams.push(params.section);
  }

  if (params.source) {
    conditions.push('e.source_id = ?');
    queryParams.push(params.source);
  }

  // Text search on title and description
  if (params.search && params.search.trim()) {
    conditions.push('(e.title LIKE ? OR e.description LIKE ?)');
    queryParams.push(`%${params.search.trim()}%`, `%${params.search.trim()}%`);
  }

  // Single category filter (JSON array contains)
  if (params.category && params.category !== 'all') {
    conditions.push('e.categories LIKE ?');
    queryParams.push(`%"${params.category}"%`);
  }

  // Multi-category filter (comma-separated, event must match ANY of the categories)
  if (params.categories && params.categories.trim()) {
    const categoryList = params.categories.split(',').map(c => c.trim()).filter(c => c);
    if (categoryList.length > 0) {
      const categoryConditions = categoryList.map(() => 'e.categories LIKE ?');
      conditions.push(`(${categoryConditions.join(' OR ')})`);
      categoryList.forEach(cat => queryParams.push(`%"${cat}"%`));
    }
  }

  // Featured filter
  if (params.featured === 'true') {
    conditions.push('e.featured = 1');
  } else if (params.featured === 'false') {
    conditions.push('(e.featured = 0 OR e.featured IS NULL)');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Count total (if needed, but for list we just fetch)
  // We can return total if we do a separate query, but for now we stick to the original signature
  // which returned result.results. 
  
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  
  queryParams.push(limit, offset);
  
  const result = await DB.prepare(`
    SELECT
      e.id, e.title, e.start_datetime, e.end_datetime, 
      e.location_name, e.categories, e.image_url, e.description,
      e.source_id, e.external_id, e.url, e.ticket_url, e.section, e.status, e.featured,
      v.name as venue_name, v.address as venue_address,
      v.image_url as venue_image_url,
      v.latitude as venue_latitude, v.longitude as venue_longitude,
      s.name as source_name
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    LEFT JOIN sources s ON e.source_id = s.id
    ${whereClause}
    ORDER BY e.start_datetime ASC
    LIMIT ? OFFSET ?
  `).bind(...queryParams).all();

  return result.results || [];
}

// Helper: Count events logic
export async function countEvents(DB: D1Database, params: {
  section?: string;
  source?: string;
  from?: string;
  to?: string;
  search?: string;
  category?: string;
  categories?: string;
  featured?: string;
}) {
  const conditions: string[] = [];
  const queryParams: any[] = [];

  conditions.push("e.status IN ('confirmed', 'active')");

  const now = new Date().toISOString();
  if (!params.from) {
    conditions.push('datetime(e.end_datetime) >= datetime(?)');
    queryParams.push(now);
  } else {
    conditions.push('datetime(e.start_datetime) >= datetime(?)');
    queryParams.push(params.from);
  }

  if (params.to) {
    conditions.push('datetime(e.start_datetime) <= datetime(?)');
    queryParams.push(params.to);
  }

  if (params.section && params.section !== 'all') {
    conditions.push('e.section = ?');
    queryParams.push(params.section);
  }

  if (params.source) {
    conditions.push('e.source_id = ?');
    queryParams.push(params.source);
  }

  if (params.search && params.search.trim()) {
    conditions.push('(e.title LIKE ? OR e.description LIKE ?)');
    queryParams.push(`%${params.search.trim()}%`, `%${params.search.trim()}%`);
  }

  if (params.category && params.category !== 'all') {
    conditions.push('e.categories LIKE ?');
    queryParams.push(`%"${params.category}"%`);
  }

  if (params.categories && params.categories.trim()) {
    const categoryList = params.categories.split(',').map(c => c.trim()).filter(c => c);
    if (categoryList.length > 0) {
      const categoryConditions = categoryList.map(() => 'e.categories LIKE ?');
      conditions.push(`(${categoryConditions.join(' OR ')})`);
      categoryList.forEach(cat => queryParams.push(`%"${cat}"%`));
    }
  }

  if (params.featured === 'true') {
    conditions.push('e.featured = 1');
  } else if (params.featured === 'false') {
    conditions.push('(e.featured = 0 OR e.featured IS NULL)');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await DB.prepare(`
    SELECT COUNT(*) as total FROM events e ${whereClause}
  `).bind(...queryParams).first<{ total: number }>();

  return result?.total || 0;
}
