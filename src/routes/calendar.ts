
import { Hono } from 'hono';
import { Bindings } from '../types';

const calendar = new Hono<{ Bindings: Bindings }>();

// Calendar names by section
const CALENDAR_NAMES: Record<string, string> = {
  downtown: 'Fayetteville Downtown Events',
  crown: 'Crown Complex Events',
  fort_bragg: 'Fort Bragg Events',
  holidays: 'Fort Bragg Training Holidays',
  all: 'Fayetteville Events (All)',
};

// GET /cal/events.ics - iCal Feed
calendar.get('/events.ics', async (c) => {
  const { DB } = c.env;

  const section = c.req.query('section');
  const source = c.req.query('source'); 
  const category = c.req.query('category');
  const categories = c.req.query('categories');
  const now = new Date().toISOString();

  let query = `
    SELECT * FROM events
    WHERE datetime(end_datetime) >= datetime(?)
      AND status IN ('confirmed', 'active')
  `;
  const params: any[] = [now];

  if (section && section !== 'all') {
    query += ' AND section = ?';
    params.push(section);
  }

  if (source) {
    query += ' AND source_id = ?';
    params.push(source);
  }

  if (category && category !== 'all') {
    query += ' AND categories LIKE ?';
    params.push(`%"${category}"%`);
  }

  if (categories && categories.trim()) {
    const categoryList = categories.split(',').map(c => c.trim()).filter(c => c);
    if (categoryList.length > 0) {
      const categoryConditions = categoryList.map(() => 'categories LIKE ?');
      query += ` AND (${categoryConditions.join(' OR ')})`;
      categoryList.forEach(cat => params.push(`%"${cat}"%`));
    }
  }

  query += ' ORDER BY featured DESC, start_datetime ASC LIMIT 500';

  const result = await DB.prepare(query).bind(...params).all();
  const events = result.results || [];

  // Determine calendar name
  let calendarName = CALENDAR_NAMES.all;
  if (source === 'fort_liberty_holidays') {
    calendarName = CALENDAR_NAMES.holidays;
  } else if (category) {
    calendarName = `Fayetteville ${category} Events`;
  } else if (categories) {
    const catList = categories.split(',').map(c => c.trim()).slice(0, 3);
    calendarName = `Fayetteville ${catList.join(', ')} Events`;
  } else if (section && CALENDAR_NAMES[section]) {
    calendarName = CALENDAR_NAMES[section];
  }

  // Determine filename
  let filename = 'fayetteville-events.ics';
  if (source === 'fort_liberty_holidays') {
    filename = 'fort-liberty-holidays.ics';
  } else if (category) {
    filename = `fayetteville-${category.toLowerCase().replace(/\s+/g, '-')}-events.ics`;
  } else if (categories) {
    filename = `fayetteville-custom-events.ics`;
  } else if (section && section !== 'all') {
    filename = `fayetteville-${section.replace('_', '-')}-events.ics`;
  }

  const ical = generateICalFeed(events, calendarName);

  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`, // Corrected: escaped quote within filename string
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

function generateICalFeed(events: any[], calendarName: string = 'Fayetteville Events'): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fayetteville Central Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:America/New_York',
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZNAME:EDT',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZNAME:EST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const event of events) {
    const uid = `${event.id}@fayetteville-calendar`;
    const dtstart = formatICalDate(event.start_datetime);
    const dtend = formatICalDate(event.end_datetime);
    const dtstamp = formatICalDate(now.toISOString());
    const summary = escapeICalText(event.title);
    const description = escapeICalText(event.description || '');
    const location = escapeICalText(event.location_name || '');
    const url = event.url || '';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `DTSTAMP:${dtstamp}`,
      `SUMMARY:${summary}`,
    );

    if (description) lines.push(`DESCRIPTION:${description}`);
    if (location) lines.push(`LOCATION:${location}`);
    if (url) lines.push(`URL:${url}`);

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICalDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    return isoDate.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace(' ', 'T');
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\') // Corrected: escaped backslash for regex
    .replace(/;/g, '\;')
    .replace(/,/g, '\,')
    .replace(/\n/g, '\\n'); // Corrected: escaped backslash for regex
}

export default calendar;
