const HOST = 'vanshvriksha.web.app';
const KEY = 'a7e4c9b218f64d0395e1a8c4b7d260f9';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const URL_LIST = [
  `https://${HOST}/`,
  `https://${HOST}/?view=tree`
];

async function submitIndexNow() {
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: URL_LIST
  };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });

  const body = await res.text().catch(() => '');
  console.log(`IndexNow response: HTTP ${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
  if (!res.ok) {
    process.exitCode = 1;
  }
}

submitIndexNow().catch((err) => {
  console.error('IndexNow submission failed:', err?.message || err);
  process.exitCode = 1;
});
