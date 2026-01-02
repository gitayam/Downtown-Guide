
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
  
  // TODO: Insert into saved_dates
  const id = crypto.randomUUID();
  const shareId = crypto.randomUUID().slice(0, 8); // Short ID for sharing

  return c.json({ id, shareId, message: "Plan saved" });
});

// GET /api/date-planner/share/:shareId
// Retrieve a plan by its share ID (public link)
datePlanner.get('/share/:shareId', async (c) => {
  const shareId = c.req.param('shareId');
  const { DB } = c.env;

  const plan = await DB.prepare('SELECT * FROM saved_dates WHERE share_id = ?').bind(shareId).first();

  if (!plan) {
    return c.json({ error: 'Plan not found' }, 404);
  }

  return c.json({ data: plan });
});

export default datePlanner;
