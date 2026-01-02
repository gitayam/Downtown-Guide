
import { Hono } from 'hono';
import { Bindings } from '../types';
import { generateDatePlan } from '../services/date-generator';

const datePlanner = new Hono<{ Bindings: Bindings }>();

// GET /api/date-planner/suggestions
// Get suggestions for form dropdowns or initial ideas
datePlanner.get('/suggestions', async (c) => {
  // TODO: Query D1 for distinct categories, vibes, etc.
  return c.json({
    event_types: ["Date Night", "First Date", "Friends Night", "Anniversary", "Family"],
    vibes: ["Romantic", "Fun", "Relaxed", "Adventurous", "Cultural", "Budget-Friendly"],
    budget_ranges: ["$", "$$", "$$$"]
  });
});

// POST /api/date-planner/generate
// Generate a date plan based on user preferences
datePlanner.post('/generate', async (c) => {
  const body = await c.req.json();
  const { DB } = c.env;
  
  try {
    const plan = await generateDatePlan(DB, body);
    return c.json({
      status: 'success',
      plan
    });
  } catch (error) {
    console.error('Date generation error:', error);
    return c.json({ error: 'Failed to generate plan' }, 500);
  }
});

// GET /api/date-planner/plan/:id
// Retrieve a specific plan by ID
datePlanner.get('/plan/:id', async (c) => {
  const id = c.req.param('id');
  const { DB } = c.env;
  
  // TODO: Fetch from date_plans or saved_dates table
  const plan = await DB.prepare('SELECT * FROM saved_dates WHERE id = ?').bind(id).first();
  
  if (!plan) {
    return c.json({ error: 'Plan not found' }, 404);
  }

  return c.json({ data: plan });
});

// POST /api/date-planner/save
// Save a generated plan
datePlanner.post('/save', async (c) => {
  const body = await c.req.json();
  const { DB } = c.env;
  
  const id = crypto.randomUUID();
  const shareId = crypto.randomUUID().split('-')[0]; // Short ID for sharing (first 8 chars)
  const now = new Date().toISOString();

  // Validate body structure (basic)
  if (!body.title || !body.stops) {
    return c.json({ error: 'Invalid plan data' }, 400);
  }

  try {
    await DB.prepare(`
      INSERT INTO saved_dates (id, share_id, title, venues, events, notes, budget, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      shareId,
      body.title,
      JSON.stringify(body.stops.map((s: any) => s.venue?.id || null).filter(Boolean)), // Extract venue IDs
      JSON.stringify([]), // Events not yet fully linked in MVP
      JSON.stringify(body), // Store full plan JSON in notes for now to reconstruct easily
      body.estimatedCost,
      now
    ).run();

    return c.json({ id, shareId, message: "Plan saved" });
  } catch (error) {
    console.error('Save plan error:', error);
    return c.json({ error: 'Failed to save plan' }, 500);
  }
});

// GET /api/date-planner/share/:shareId
// Retrieve a plan by its share ID (public link)
datePlanner.get('/share/:shareId', async (c) => {
  const shareId = c.req.param('shareId');
  const { DB } = c.env;

  const row = await DB.prepare('SELECT * FROM saved_dates WHERE share_id = ?').bind(shareId).first();

  if (!row) {
    return c.json({ error: 'Plan not found' }, 404);
  }

  // Reconstruct plan object
  // In MVP we stored the full JSON in 'notes' for simplicity
  let planData;
  try {
    planData = JSON.parse(row.notes as string);
  } catch {
    planData = { title: row.title, stops: [] };
  }

  return c.json({ data: planData });
});

export default datePlanner;
