// Vercel serverless function: GET /api/contributions
// Reads the public contribution calendar straight from GitHub (the same data
// shown on github.com/Eienmode) and returns it as JSON for the About card.
// Vercel's edge cache keeps it for 5 minutes, so GitHub is hit rarely.

const USER = 'Eienmode';

module.exports = async (req, res) => {
  try {
    const r = await fetch(`https://github.com/users/${USER}/contributions`, {
      headers: { 'User-Agent': 'eien.dev-portfolio', Accept: 'text/html' },
    });
    if (!r.ok) throw new Error('GitHub responded ' + r.status);
    const html = await r.text();

    // Tooltip text holds the exact count: "11 contributions on October 30th."
    const counts = {};
    const tipRe = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
    let m;
    while ((m = tipRe.exec(html))) {
      const n = m[2].match(/^\s*(\d[\d,]*)\s+contribution/);
      counts[m[1]] = n ? parseInt(n[1].replace(/,/g, ''), 10) : 0;
    }

    // Each day cell carries its date, id and intensity level (0–4).
    const days = [];
    const tdRe = /<td\b[^>]*\bclass="ContributionCalendar-day"[^>]*>/g;
    while ((m = tdRe.exec(html))) {
      const tag = m[0];
      const date = (tag.match(/data-date="([\d-]+)"/) || [])[1];
      const id = (tag.match(/\bid="([^"]+)"/) || [])[1];
      const level = +((tag.match(/data-level="(\d)"/) || [])[1] || 0);
      if (date) days.push({ date, count: counts[id] || 0, level });
    }
    if (!days.length) throw new Error('No calendar found in GitHub response');
    days.sort((a, b) => (a.date < b.date ? -1 : 1));

    const t = html.replace(/\s+/g, ' ').match(/([\d,]+) contributions? in the last year/);
    const lastYear = t ? parseInt(t[1].replace(/,/g, ''), 10) : days.reduce((s, d) => s + d.count, 0);

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify({ total: { lastYear }, contributions: days }));
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String((err && err.message) || err) });
  }
};
