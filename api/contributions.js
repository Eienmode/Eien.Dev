// Vercel serverless function: GET /api/contributions
// Returns the GitHub contribution calendar as JSON for the About card.
//
// 1. If the GITHUB_TOKEN environment variable is set in Vercel, it asks GitHub's
//    official GraphQL API. That is up to date and includes private
//    contributions when "Private contributions" is enabled on the profile.
// 2. Otherwise (or if that fails) it reads the public calendar page, which
//    GitHub refreshes for logged-out visitors with a delay.
//
// Vercel's edge cache keeps the result for 5 minutes, so GitHub is hit rarely.

const USER = 'Eienmode';
const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

async function fromGraphQL(token) {
  const query = `query($login:String!){ user(login:$login){ contributionsCollection{ contributionCalendar{
    totalContributions weeks{ contributionDays{ date contributionCount contributionLevel } } } } } }`;
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'eien.dev-portfolio' },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  if (!r.ok) throw new Error('GitHub API responded ' + r.status);
  const j = await r.json();
  const cal = j && j.data && j.data.user && j.data.user.contributionsCollection.contributionCalendar;
  if (!cal) throw new Error('GitHub API: ' + JSON.stringify(j.errors || j).slice(0, 200));
  const days = cal.weeks.flatMap(w => w.contributionDays).map(d => ({
    date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] || 0,
  }));
  return { total: { lastYear: cal.totalContributions }, contributions: days, source: 'api' };
}

async function fromPublicPage() {
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
  return { total: { lastYear }, contributions: days, source: 'page' };
}

module.exports = async (req, res) => {
  try {
    let data;
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      try { data = await fromGraphQL(token); } catch (e) { data = null; }
    }
    if (!data) data = await fromPublicPage();

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify(data));
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: String((err && err.message) || err) });
  }
};
