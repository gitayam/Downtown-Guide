
import { Bindings } from '../types';

interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  thumbnail?: { url: string };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

const SECTION_COLORS: Record<string, number> = {
  downtown: 0xA65D57,  // brick
  crown: 0x2D6A4F,     // capefear
  fort_bragg: 0x1E3A5F, // liberty
  default: 0x4A5568,   // gray
};

const SECTION_EMOJIS: Record<string, string> = {
  downtown: '🏙️',
  crown: '🏟️',
  fort_bragg: '🎖️',
};

function formatEventTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export async function sendDiscordMessage(webhookUrl: string, payload: DiscordWebhookPayload): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

export async function sendDailyDigest(env: Bindings): Promise<{ success: boolean; eventCount: number }> {
  if (!env.DISCORD_WEBHOOK_URL) {
    console.log('Discord webhook URL not configured');
    return { success: false, eventCount: 0 };
  }

  // Get today's events (Eastern Time)
  const now = new Date();
  const estOffset = -5 * 60; // EST offset in minutes
  const utcOffset = now.getTimezoneOffset();
  const estTime = new Date(now.getTime() + (utcOffset + estOffset) * 60000);

  const startOfDay = new Date(estTime.getFullYear(), estTime.getMonth(), estTime.getDate());
  const endOfDay = new Date(estTime.getFullYear(), estTime.getMonth(), estTime.getDate() + 1);

  // Convert back to UTC for DB query
  const startUTC = new Date(startOfDay.getTime() - (utcOffset + estOffset) * 60000).toISOString();
  const endUTC = new Date(endOfDay.getTime() - (utcOffset + estOffset) * 60000).toISOString();

  // Show events that start today OR are still ongoing (end_datetime >= now)
  const nowUTC = new Date().toISOString();
  const result = await env.DB.prepare(`
    SELECT e.*, s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE ((datetime(e.start_datetime) >= datetime(?) AND datetime(e.start_datetime) < datetime(?))
       OR (datetime(e.start_datetime) < datetime(?) AND datetime(e.end_datetime) >= datetime(?))) 
      AND e.status IN ('confirmed', 'active')
    ORDER BY e.featured DESC, e.start_datetime ASC
    LIMIT 25
  `).bind(startUTC, endUTC, startUTC, nowUTC).all();

  const events = result.results || [];

  if (events.length === 0) {
    // Send "no events" message
    await sendDiscordMessage(env.DISCORD_WEBHOOK_URL, {
      username: 'Fayetteville Events',
      avatar_url: 'https://fayetteville-events.pages.dev/logo.png',
      embeds: [{
        title: '📅 No Events Today',
        description: 'There are no scheduled events for today. Check back tomorrow!',
        color: 0x4A5568,
        footer: { text: 'Fayetteville Central Calendar' },
        timestamp: new Date().toISOString(),
      }],
    });
    return { success: true, eventCount: 0 };
  }

  // Group events by section
  const eventsBySection: Record<string, any[]> = {
    downtown: [],
    crown: [],
    fort_bragg: [],
  };

  for (const event of events) {
    const section = (event as any).section || 'downtown';
    if (eventsBySection[section]) {
      eventsBySection[section].push(event);
    } else {
      eventsBySection.downtown.push(event);
    }
  }

  // Create embeds for each section with events
  const embeds: DiscordEmbed[] = [];
  const dateStr = estTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });

  // Header embed
  embeds.push({
    title: `📅 Events for ${dateStr}`,
    description: `**${events.length}** event${events.length !== 1 ? 's' : ''} happening today in Fayetteville!`,
    color: 0xA65D57,
    url: 'https://fayetteville-events.pages.dev',
  });

  // Create embed for each section with events
  for (const [section, sectionEvents] of Object.entries(eventsBySection)) {
    if (sectionEvents.length === 0) continue;

    const emoji = SECTION_EMOJIS[section] || '📍';
    const sectionName = section === 'downtown' ? 'Downtown' :
                       section === 'crown' ? 'Crown Complex' :
                       section === 'fort_bragg' ? 'Fort Bragg' : section;

    const fields = sectionEvents.slice(0, 6).map((event: any) => ({
      name: `${formatEventTime(event.start_datetime)}`,
      value: `**[${truncateText(event.title, 50)}](${event.url || 'https://fayetteville-events.pages.dev/events/' + event.id})**${event.location_name ? `\n📍 ${truncateText(event.location_name, 40)}` : ''}`,
      inline: false,
    }));

    embeds.push({
      title: `${emoji} ${sectionName} (${sectionEvents.length})`,
      color: SECTION_COLORS[section] || SECTION_COLORS.default,
      fields,
    });
  }

  // Footer embed
  embeds.push({
    description: '🔗 [View All Events](https://fayetteville-events.pages.dev) | [Subscribe to Calendar](https://fayetteville-events.pages.dev/calendar)',
    color: 0x4A5568,
    footer: { text: 'Fayetteville Central Calendar • Updated daily at 8 AM' },
    timestamp: new Date().toISOString(),
  });

  // Send to Discord (max 10 embeds per message)
  const success = await sendDiscordMessage(env.DISCORD_WEBHOOK_URL, {
    username: 'Fayetteville Events',
    avatar_url: 'https://fayetteville-events.pages.dev/logo.png',
    embeds: embeds.slice(0, 10),
  });

  return { success, eventCount: events.length };
}
