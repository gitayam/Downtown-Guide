/**
 * Add Venue-Specific Events
 *
 * This script adds events that are tied to specific venues and should NOT appear
 * on the main events feed. These events will:
 * - Be marked with venue_only = 1
 * - Be linked to a specific venue via venue_id
 * - Only show up when viewing that venue's details or in date planning
 *
 * Usage:
 *   # Add events from JSON file
 *   npx tsx scripts/add-venue-events.ts --file=events.json --db
 *
 *   # Add a single event interactively
 *   npx tsx scripts/add-venue-events.ts --venue=dad_bod_district --db
 *
 *   # Dry run (preview without writing)
 *   npx tsx scripts/add-venue-events.ts --file=events.json
 *
 *   # Using Apify Facebook Events Scraper (requires APIFY_TOKEN env var)
 *   npx tsx scripts/add-venue-events.ts --apify --venue=dad_bod_district --db
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// =============================================================================
// Types
// =============================================================================

interface VenueEvent {
  title: string;
  description?: string;
  startDateTime: string;  // ISO 8601 format
  endDateTime?: string;   // ISO 8601, defaults to startDateTime + 2 hours
  url?: string;
  imageUrl?: string;
  categories?: string[];
}

interface VenueEventInput {
  venueId: string;
  sourceName: string;
  events: VenueEvent[];
}

// =============================================================================
// Database Functions
// =============================================================================

async function runD1Command(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', [
      'wrangler', 'd1', 'execute', 'downtown-events',
      '--remote',
      '--command', command
    ], {
      cwd: path.join(__dirname, '..'),
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`D1 command failed: ${stderr}`));
      }
    });
  });
}

async function getVenueInfo(venueId: string): Promise<{ name: string; address: string } | null> {
  try {
    const result = await runD1Command(`SELECT name, address FROM venues WHERE id = '${venueId}'`);
    const match = result.match(/"name":\s*"([^"]+)".*"address":\s*"([^"]+)"/);
    if (match) {
      return { name: match[1], address: match[2] };
    }
    return null;
  } catch (error) {
    console.error('Error fetching venue:', error);
    return null;
  }
}

async function insertVenueEvent(event: VenueEvent, venueId: string, sourceId: string, dryRun: boolean): Promise<boolean> {
  const eventId = `${sourceId}_${generateSlug(event.title)}_${new Date(event.startDateTime).getTime()}`;
  const externalId = `${venueId}_${Date.now()}`;

  // Default end time to 2 hours after start if not provided
  const startDt = new Date(event.startDateTime);
  const endDt = event.endDateTime
    ? new Date(event.endDateTime)
    : new Date(startDt.getTime() + 2 * 60 * 60 * 1000);

  const categories = JSON.stringify(event.categories || ['Nightlife']);

  const sql = `
    INSERT OR REPLACE INTO events (
      id, source_id, external_id, title, description,
      start_datetime, end_datetime, venue_id, location_name,
      url, image_url, categories, status, section, venue_only
    ) VALUES (
      '${escapeSQL(eventId)}',
      '${escapeSQL(sourceId)}',
      '${escapeSQL(externalId)}',
      '${escapeSQL(event.title)}',
      '${escapeSQL(event.description || '')}',
      '${startDt.toISOString()}',
      '${endDt.toISOString()}',
      '${escapeSQL(venueId)}',
      NULL,
      '${escapeSQL(event.url || '')}',
      '${escapeSQL(event.imageUrl || '')}',
      '${escapeSQL(categories)}',
      'confirmed',
      'downtown',
      1
    )
  `.replace(/\n/g, ' ').trim();

  console.log(`\n📅 Event: ${event.title}`);
  console.log(`   Start: ${startDt.toLocaleString()}`);
  console.log(`   End: ${endDt.toLocaleString()}`);
  console.log(`   ID: ${eventId}`);

  if (dryRun) {
    console.log('   [DRY RUN - not inserted]');
    return true;
  }

  try {
    await runD1Command(sql);
    console.log('   ✅ Inserted');
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error}`);
    return false;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

// =============================================================================
// Apify Integration (for future use)
// =============================================================================

async function fetchFromApify(facebookPageId: string): Promise<VenueEvent[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_TOKEN environment variable required for Facebook scraping');
  }

  console.log('🔍 Fetching events from Apify Facebook Events Scraper...');

  // This would use Apify's API to fetch events
  // For now, return empty array as placeholder
  console.log('⚠️  Apify integration not yet implemented. Please add events manually.');
  console.log('   See: https://apify.com/data-slayer/facebook-search-events');

  return [];
}

// =============================================================================
// Interactive Mode
// =============================================================================

async function promptForEvent(): Promise<VenueEvent | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log('\n📝 Enter event details (Ctrl+C to cancel):\n');

  try {
    const title = await question('Event title: ');
    if (!title.trim()) {
      rl.close();
      return null;
    }

    const description = await question('Description (optional): ');

    const dateStr = await question('Start date (YYYY-MM-DD): ');
    const timeStr = await question('Start time (HH:MM, 24hr): ');
    const startDateTime = `${dateStr}T${timeStr}:00`;

    const endTimeStr = await question('End time (HH:MM, optional): ');
    const endDateTime = endTimeStr ? `${dateStr}T${endTimeStr}:00` : undefined;

    const url = await question('Event URL (optional): ');
    const imageUrl = await question('Image URL (optional): ');
    const categoriesStr = await question('Categories (comma-separated, default: Nightlife): ');
    const categories = categoriesStr ? categoriesStr.split(',').map(c => c.trim()) : ['Nightlife'];

    rl.close();

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      startDateTime,
      endDateTime,
      url: url.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      categories
    };
  } catch (error) {
    rl.close();
    return null;
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const flags = {
    file: args.find(a => a.startsWith('--file='))?.split('=')[1],
    venue: args.find(a => a.startsWith('--venue='))?.split('=')[1],
    db: args.includes('--db'),
    apify: args.includes('--apify'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (flags.help) {
    console.log(`
Add Venue-Specific Events
=========================

Usage:
  npx tsx scripts/add-venue-events.ts [options]

Options:
  --file=<path>    JSON file with events to add
  --venue=<id>     Venue ID (e.g., dad_bod_district)
  --db             Write to database (without this, dry run mode)
  --apify          Use Apify Facebook Events Scraper (requires APIFY_TOKEN)
  --help, -h       Show this help message

Examples:
  # Interactive mode - add events one at a time
  npx tsx scripts/add-venue-events.ts --venue=dad_bod_district --db

  # From JSON file
  npx tsx scripts/add-venue-events.ts --file=events.json --db

JSON Format:
  {
    "venueId": "dad_bod_district",
    "sourceName": "dad_bod_facebook",
    "events": [
      {
        "title": "Live Music Friday",
        "description": "Local bands playing all night",
        "startDateTime": "2026-01-10T20:00:00",
        "endDateTime": "2026-01-10T23:00:00",
        "categories": ["Live Music", "Nightlife"]
      }
    ]
  }
    `);
    return;
  }

  const dryRun = !flags.db;

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to database');
    console.log('   Add --db flag to write to database\n');
  }

  let events: VenueEvent[] = [];
  let venueId = flags.venue;
  let sourceId = 'dad_bod_facebook';  // Default source

  // Load from file
  if (flags.file) {
    const filePath = path.resolve(flags.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    const data: VenueEventInput = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    events = data.events;
    venueId = data.venueId;
    sourceId = data.sourceName || sourceId;

    console.log(`📁 Loaded ${events.length} events from ${flags.file}`);
  }
  // Fetch from Apify
  else if (flags.apify) {
    if (!venueId) {
      console.error('❌ --venue flag required with --apify');
      process.exit(1);
    }
    events = await fetchFromApify(venueId);
  }
  // Interactive mode
  else if (venueId) {
    console.log('🎯 Interactive mode - add events one at a time');

    while (true) {
      const event = await promptForEvent();
      if (!event) break;
      events.push(event);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      const another = await new Promise<string>((resolve) => {
        rl.question('\nAdd another event? (y/n): ', resolve);
      });
      rl.close();

      if (another.toLowerCase() !== 'y') break;
    }
  }
  else {
    console.error('❌ Please specify --file, --venue, or use --help');
    process.exit(1);
  }

  if (!venueId) {
    console.error('❌ Venue ID required');
    process.exit(1);
  }

  // Verify venue exists
  const venue = await getVenueInfo(venueId);
  if (!venue) {
    console.error(`❌ Venue not found: ${venueId}`);
    process.exit(1);
  }

  console.log(`\n🏢 Venue: ${venue.name}`);
  console.log(`   Address: ${venue.address}`);
  console.log(`   Source: ${sourceId}`);
  console.log(`   Events to add: ${events.length}`);

  if (events.length === 0) {
    console.log('\n⚠️  No events to add');
    return;
  }

  // Insert events
  let success = 0;
  let failed = 0;

  for (const event of events) {
    const result = await insertVenueEvent(event, venueId, sourceId, dryRun);
    if (result) success++;
    else failed++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (dryRun) {
    console.log('\n💡 To write to database, add --db flag');
  }
}

main().catch(console.error);
