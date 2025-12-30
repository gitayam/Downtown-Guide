# Discord Event Reminder Integration

## Overview

This document describes how to send automated event reminders to Discord via webhook. Reminders are sent:
- **1 week before** an event
- **1 day before** an event

**Webhook URL:** `https://discord.com/api/webhooks/1455420203122032876/2hGfKju2UPhWOBqGG4c2F4NzxMoyYOp9psr_5vGMrpYsZHMtzU06clcA_OqDwJpBQ3tW`

---

## Discord Webhook Basics

### Endpoint
```
POST https://discord.com/api/webhooks/{webhook.id}/{webhook.token}
```

### Content Types
- `application/json` - Standard JSON payload
- `multipart/form-data` - For file uploads

### Rate Limits
- **5 requests per 2 seconds** per webhook
- **30 requests per 60 seconds** sustained
- Returns `429 Too Many Requests` if exceeded

---

## Message Payload Structure

### Simple Message
```json
{
  "content": "🎉 Event reminder: Downtown Festival starts tomorrow!"
}
```

### Rich Embed Message (Recommended)
```json
{
  "username": "Fayetteville Events",
  "avatar_url": "https://example.com/calendar-icon.png",
  "embeds": [
    {
      "title": "🗓️ Event Reminder",
      "description": "Don't miss this upcoming event!",
      "color": 5814783,
      "fields": [
        {
          "name": "📌 Event",
          "value": "Downtown Festival",
          "inline": false
        },
        {
          "name": "📅 Date",
          "value": "Saturday, January 15, 2025",
          "inline": true
        },
        {
          "name": "⏰ Time",
          "value": "10:00 AM - 6:00 PM",
          "inline": true
        },
        {
          "name": "📍 Location",
          "value": "Downtown Fayetteville",
          "inline": false
        }
      ],
      "url": "https://example.com/event/123",
      "thumbnail": {
        "url": "https://example.com/event-image.jpg"
      },
      "footer": {
        "text": "Fayetteville Central Calendar"
      },
      "timestamp": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## Embed Color Reference

| Color | Hex | Decimal | Use Case |
|-------|-----|---------|----------|
| Blue | `#58B9BF` | `5814783` | Default/Info |
| Red | `#E74C3C` | `15158332` | Urgent/1-day |
| Orange | `#F39C12` | `15965202` | Warning/1-week |
| Green | `#2ECC71` | `3066993` | Success |
| Purple | `#9B59B6` | `10181046` | Special events |

---

## Reminder Types

### 1-Week Reminder (Orange)
```json
{
  "username": "📅 Fayetteville Events",
  "embeds": [{
    "title": "🗓️ Coming Up Next Week",
    "color": 15965202,
    "description": "Mark your calendar!",
    "fields": [...]
  }]
}
```

### 1-Day Reminder (Red - Urgent)
```json
{
  "username": "📅 Fayetteville Events",
  "embeds": [{
    "title": "⏰ Tomorrow's Event!",
    "color": 15158332,
    "description": "Don't forget - this is happening tomorrow!",
    "fields": [...]
  }]
}
```

---

## Implementation

### Environment Variables

```bash
# .env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1455420203122032876/2hGfKju2UPhWOBqGG4c2F4NzxMoyYOp9psr_5vGMrpYsZHMtzU06clcA_OqDwJpBQ3tW
```

### TypeScript Interface

```typescript
interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}
```

---

## Cron Schedule

### Recommended Schedule

| Check | Cron Expression | Description |
|-------|-----------------|-------------|
| Daily 9 AM | `0 9 * * *` | Check for 1-week and 1-day reminders |
| Daily 6 PM | `0 18 * * *` | Evening reminder for tomorrow's events |

### GitHub Actions Example

```yaml
name: Event Reminders
on:
  schedule:
    - cron: '0 14 * * *'  # 9 AM EST (14:00 UTC)
  workflow_dispatch:

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npx tsx scripts/send-discord-reminders.ts
        env:
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

---

## Error Handling

### Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| `204` | Success (no content) | Message sent |
| `400` | Bad Request | Check payload format |
| `401` | Unauthorized | Invalid webhook token |
| `404` | Not Found | Webhook deleted |
| `429` | Rate Limited | Wait and retry |

### Retry Logic

```typescript
async function sendWithRetry(
  url: string,
  payload: DiscordWebhookPayload,
  maxRetries = 3
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 204) return true;

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const wait = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      console.log(`Rate limited, waiting ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    console.error(`Webhook failed: ${response.status}`);
    return false;
  }
  return false;
}
```

---

## Tracking Sent Reminders

To avoid duplicate reminders, track what's been sent in the D1 database:

### D1 Schema (reminder_log table)

```sql
CREATE TABLE reminder_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id),
  reminder_type TEXT NOT NULL,   -- '1_week', '1_day', 'new_event'
  channel TEXT NOT NULL,         -- 'discord', 'email', 'sms'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,          -- 'sent', 'failed'
  message_id TEXT,               -- Discord message ID for reference
  error_message TEXT,
  UNIQUE(event_id, reminder_type, channel)
);
```

### Query to Check If Reminder Was Sent

```sql
SELECT * FROM reminder_log
WHERE event_id = 'distinctly_12345'
  AND reminder_type = '1_week'
  AND channel = 'discord';
```

---

## Message Templates

### Category Icons

| Category | Emoji |
|----------|-------|
| Concerts & Music | 🎵 |
| Festivals | 🎪 |
| Sports | ⚾ |
| Arts | 🎨 |
| Food & Drink | 🍽️ |
| Family | 👨‍👩‍👧‍👦 |
| Holiday | 🎄 |
| Nightlife | 🌙 |
| Outdoor | 🌲 |
| Default | 📅 |

### Source Badges

| Source | Badge |
|--------|-------|
| Visit Downtown | `🏙️ Downtown` |
| Segra Stadium | `⚾ Segra` |
| Distinctly Fayetteville | `🎭 CVB` |
| Dogwood Festival | `🌸 Dogwood` |
| Fort Liberty MWR | `🎖️ Fort Liberty` |

---

## Testing

### Test Webhook (curl)

```bash
curl -X POST \
  "https://discord.com/api/webhooks/1455420203122032876/2hGfKju2UPhWOBqGG4c2F4NzxMoyYOp9psr_5vGMrpYsZHMtzU06clcA_OqDwJpBQ3tW" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🧪 Test message from Fayetteville Central Calendar",
    "username": "Event Bot Test"
  }'
```

### Dry Run Mode

The script supports `--dry-run` to preview messages without sending:

```bash
npx tsx scripts/send-discord-reminders.ts --dry-run
```

---

## Security Notes

1. **Never commit webhook URLs** - Use environment variables
2. **Webhook URLs are secrets** - Anyone with the URL can post
3. **Rotate if compromised** - Delete and recreate the webhook
4. **Rate limit your sends** - Max 5/2s, 30/minute

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-30 | Added Fort Liberty source badge, updated schema for D1 |
| 2025-12-29 | Initial documentation |
