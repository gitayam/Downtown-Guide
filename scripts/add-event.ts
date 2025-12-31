#!/usr/bin/env npx tsx
/**
 * Fayetteville Central Calendar - Manual Event Addition
 *
 * Add events directly to the database via CLI.
 * Events added this way are marked with source 'manual' and persist through syncs.
 *
 * Usage:
 *   # Interactive mode
 *   npx tsx scripts/add-event.ts
 *
 *   # With parameters
 *   npx tsx scripts/add-event.ts \
 *     --title "Event Name" \
 *     --start "2025-01-15T19:00:00" \
 *     --section downtown \
 *     --category "Community" \
 *     --location "Cool Spring Downtown District"
 *
 *   # From JSON file
 *   npx tsx scripts/add-event.ts --file events.json
 *
 *   # List manual events
 *   npx tsx scripts/add-event.ts --list
 *
 *   # Delete a manual event
 *   npx tsx scripts/add-event.ts --delete <event-id>
 */

import { execSync } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';

// =============================================================================
// Types
// =============================================================================

interface ManualEvent {
  title: string;
  description?: string;
  start_datetime: string;  // ISO format
  end_datetime?: string;   // ISO format
  section: 'downtown' | 'crown' | 'fort_bragg';
  categories?: string[];
  location_name?: string;
  url?: string;
  ticket_url?: string;
  image_url?: string;
  featured?: boolean;
}

// =============================================================================
// Database Functions
// =============================================================================

function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `manual-${timestamp}-${random}`;
}

function escapeSQL(str: string): string {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

async function addEventToDatabase(event: ManualEvent): Promise<string> {
  const id = generateEventId();
  const now = new Date().toISOString();

  // Default end time to 2 hours after start if not provided
  const endDateTime = event.end_datetime ||
    new Date(new Date(event.start_datetime).getTime() + 2 * 60 * 60 * 1000).toISOString();

  // Properly format categories as JSON array
  // Need to escape for both SQL and shell
  const categoriesArray = event.categories || [];
  const categories = JSON.stringify(categoriesArray)
    .replace(/"/g, '\\"')  // Escape double quotes for shell
    .replace(/'/g, "''");  // Escape single quotes for SQL

  const sql = `
    INSERT INTO events (
      id, source_id, external_id, title, description,
      start_datetime, end_datetime, location_name,
      url, ticket_url, image_url, categories,
      status, section, featured, created_at, updated_at
    ) VALUES (
      '${escapeSQL(id)}',
      'manual',
      '${escapeSQL(id)}',
      '${escapeSQL(event.title)}',
      '${escapeSQL(event.description || '')}',
      '${escapeSQL(event.start_datetime)}',
      '${escapeSQL(endDateTime)}',
      '${escapeSQL(event.location_name || '')}',
      '${escapeSQL(event.url || '')}',
      '${escapeSQL(event.ticket_url || '')}',
      '${escapeSQL(event.image_url || '')}',
      '${categories}',
      'active',
      '${escapeSQL(event.section)}',
      ${event.featured ? 1 : 0},
      '${now}',
      '${now}'
    );
  `.trim();

  try {
    execSync(`npx wrangler d1 execute downtown-events --remote --command="${sql}"`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return id;
  } catch (error: any) {
    throw new Error(`Failed to add event: ${error.message}`);
  }
}

async function listManualEvents(): Promise<void> {
  const sql = `
    SELECT id, title, start_datetime, section, categories, location_name, featured
    FROM events
    WHERE source_id = 'manual'
    ORDER BY start_datetime ASC
    LIMIT 50;
  `;

  try {
    const result = execSync(
      `npx wrangler d1 execute downtown-events --remote --command="${sql}" --json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const parsed = JSON.parse(result);
    const events = parsed[0]?.results || [];

    if (events.length === 0) {
      console.log('\nNo manual events found.\n');
      return;
    }

    console.log('\n📅 Manual Events:\n');
    console.log('─'.repeat(80));

    for (const event of events) {
      const date = new Date(event.start_datetime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const section = event.section === 'downtown' ? '🏙️' :
                      event.section === 'crown' ? '🏟️' : '🎖️';

      // Handle malformed JSON gracefully
      let categories = '';
      if (event.categories) {
        try {
          const parsed = JSON.parse(event.categories);
          categories = Array.isArray(parsed) ? parsed.join(', ') : event.categories;
        } catch {
          // If not valid JSON, try to parse as comma-separated in brackets
          categories = event.categories.replace(/^\[|\]$/g, '').replace(/"/g, '');
        }
      }

      const featured = event.featured ? '⭐ ' : '';
      console.log(`${featured}${section} ${event.title}`);
      console.log(`   📆 ${date}`);
      if (event.location_name) console.log(`   📍 ${event.location_name}`);
      if (categories) console.log(`   🏷️  ${categories}`);
      if (event.featured) console.log(`   ✨ FEATURED`);
      console.log(`   🔑 ${event.id}`);
      console.log('─'.repeat(80));
    }

    console.log(`\nTotal: ${events.length} manual event(s)\n`);
  } catch (error: any) {
    console.error('Failed to list events:', error.message);
  }
}

async function deleteEvent(eventId: string): Promise<void> {
  const sql = `DELETE FROM events WHERE id = '${escapeSQL(eventId)}' AND source_id = 'manual';`;

  try {
    execSync(`npx wrangler d1 execute downtown-events --remote --command="${sql}"`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    console.log(`✅ Event ${eventId} deleted successfully.`);
  } catch (error: any) {
    console.error('Failed to delete event:', error.message);
  }
}

async function featureEvent(eventId: string, featured: boolean): Promise<void> {
  const sql = `UPDATE events SET featured = ${featured ? 1 : 0} WHERE id = '${escapeSQL(eventId)}';`;

  try {
    execSync(`npx wrangler d1 execute downtown-events --remote --command="${sql}"`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    console.log(`✅ Event ${eventId} ${featured ? 'featured' : 'unfeatured'} successfully.`);
  } catch (error: any) {
    console.error('Failed to update event:', error.message);
  }
}

// =============================================================================
// Interactive Mode
// =============================================================================

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function interactiveMode(): Promise<void> {
  const rl = createReadlineInterface();

  console.log('\n🌸 Fayetteville Events - Add New Event\n');
  console.log('─'.repeat(50));

  try {
    // Required fields
    const title = await prompt(rl, '📌 Event Title: ');
    if (!title) {
      console.log('❌ Title is required.');
      rl.close();
      return;
    }

    const startDateStr = await prompt(rl, '📅 Start Date (YYYY-MM-DD): ');
    const startTimeStr = await prompt(rl, '🕐 Start Time (HH:MM, 24h format): ');

    if (!startDateStr || !startTimeStr) {
      console.log('❌ Start date and time are required.');
      rl.close();
      return;
    }

    const start_datetime = `${startDateStr}T${startTimeStr}:00`;

    // Validate date
    if (isNaN(new Date(start_datetime).getTime())) {
      console.log('❌ Invalid date/time format.');
      rl.close();
      return;
    }

    console.log('\n📍 Section:');
    console.log('   1. Downtown (🏙️)');
    console.log('   2. Crown Complex (🏟️)');
    console.log('   3. Fort Bragg (🎖️)');
    const sectionChoice = await prompt(rl, 'Choose (1-3): ');

    const sectionMap: Record<string, 'downtown' | 'crown' | 'fort_bragg'> = {
      '1': 'downtown',
      '2': 'crown',
      '3': 'fort_bragg',
    };
    const section = sectionMap[sectionChoice] || 'downtown';

    // Optional fields
    const description = await prompt(rl, '📝 Description (optional): ');
    const location_name = await prompt(rl, '📍 Location/Venue (optional): ');

    console.log('\n🏷️  Categories (comma-separated, or press Enter to skip):');
    console.log('   Examples: Community, Sports, Music, Festivals, Military');
    const categoriesStr = await prompt(rl, 'Categories: ');
    const categories = categoriesStr
      ? categoriesStr.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    const url = await prompt(rl, '🔗 Event URL (optional): ');
    const ticket_url = await prompt(rl, '🎟️  Ticket URL (optional): ');
    const image_url = await prompt(rl, '🖼️  Image URL (optional): ');

    const endDateStr = await prompt(rl, '📅 End Date (YYYY-MM-DD, optional): ');
    const endTimeStr = endDateStr ? await prompt(rl, '🕐 End Time (HH:MM, optional): ') : '';
    const end_datetime = endDateStr && endTimeStr ? `${endDateStr}T${endTimeStr}:00` : undefined;

    rl.close();

    // Build event object
    const event: ManualEvent = {
      title,
      start_datetime,
      section,
      description: description || undefined,
      location_name: location_name || undefined,
      categories: categories.length > 0 ? categories : undefined,
      url: url || undefined,
      ticket_url: ticket_url || undefined,
      image_url: image_url || undefined,
      end_datetime,
    };

    // Confirm
    console.log('\n📋 Event Summary:');
    console.log('─'.repeat(50));
    console.log(`Title: ${event.title}`);
    console.log(`Date: ${new Date(event.start_datetime).toLocaleString()}`);
    console.log(`Section: ${section}`);
    if (event.description) console.log(`Description: ${event.description.slice(0, 100)}...`);
    if (event.location_name) console.log(`Location: ${event.location_name}`);
    if (event.categories?.length) console.log(`Categories: ${event.categories.join(', ')}`);
    console.log('─'.repeat(50));

    const rl2 = createReadlineInterface();
    const confirm = await prompt(rl2, '\nAdd this event? (y/n): ');
    rl2.close();

    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Cancelled.');
      return;
    }

    // Add to database
    console.log('\n⏳ Adding event to database...');
    const eventId = await addEventToDatabase(event);
    console.log(`\n✅ Event added successfully!`);
    console.log(`   ID: ${eventId}`);
    console.log(`   View: https://fayetteville-events.pages.dev/events/${eventId}\n`);

  } catch (error: any) {
    console.error('Error:', error.message);
    rl.close();
  }
}

// =============================================================================
// Command Line Parsing
// =============================================================================

function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        args[key] = value;
      } else {
        args[arg.slice(2)] = true;
      }
    }
  }

  return args;
}

async function addFromArgs(args: Record<string, string | boolean>): Promise<void> {
  const title = args.title as string;
  const start = args.start as string;
  const section = (args.section as string) || 'downtown';

  if (!title || !start) {
    console.error('❌ Required: --title and --start');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/add-event.ts --title="Event Name" --start="2025-01-15T19:00:00" --section=downtown');
    process.exit(1);
  }

  // Parse categories - handle string or undefined
  let categories: string[] | undefined;
  if (typeof args.category === 'string' && args.category) {
    categories = args.category.split(',').map(c => c.trim());
  }

  const event: ManualEvent = {
    title,
    start_datetime: start,
    section: section as 'downtown' | 'crown' | 'fort_bragg',
    description: typeof args.description === 'string' ? args.description : undefined,
    location_name: typeof args.location === 'string' ? args.location : undefined,
    categories,
    url: typeof args.url === 'string' ? args.url : undefined,
    ticket_url: typeof args['ticket-url'] === 'string' ? args['ticket-url'] : undefined,
    image_url: typeof args['image-url'] === 'string' ? args['image-url'] : undefined,
    end_datetime: typeof args.end === 'string' ? args.end : undefined,
    featured: args.featured === true || args.featured === 'true',
  };

  console.log(`⏳ Adding event: ${title}...`);
  const eventId = await addEventToDatabase(event);
  console.log(`✅ Event added: ${eventId}`);
}

async function addFromFile(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const events: ManualEvent[] = JSON.parse(content);

  if (!Array.isArray(events)) {
    console.error('❌ JSON file must contain an array of events');
    process.exit(1);
  }

  console.log(`⏳ Adding ${events.length} events from ${filePath}...`);

  for (const event of events) {
    try {
      const eventId = await addEventToDatabase(event);
      console.log(`  ✅ ${event.title} (${eventId})`);
    } catch (error: any) {
      console.error(`  ❌ ${event.title}: ${error.message}`);
    }
  }

  console.log('\n✅ Done!');
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.list) {
    await listManualEvents();
  } else if (args.delete) {
    await deleteEvent(args.delete as string);
  } else if (args.feature) {
    await featureEvent(args.feature as string, true);
  } else if (args.unfeature) {
    await featureEvent(args.unfeature as string, false);
  } else if (args.file) {
    await addFromFile(args.file as string);
  } else if (args.title) {
    await addFromArgs(args);
  } else {
    await interactiveMode();
  }
}

main().catch(console.error);
