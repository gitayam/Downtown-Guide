
import * as fs from 'fs';

const url = process.argv[2];
if (!url) {
  console.error('Please provide a URL');
  process.exit(1);
}

async function inspect() {
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log('--- HTML Start ---');
    console.log(text.substring(0, 2000));
    console.log('--- HTML End ---');
  } catch (err) {
    console.error(err);
  }
}

inspect();
