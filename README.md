# eien.dev — Jan Saquilayan

One self-contained page: `index.html`. Open it in a browser or with VS Code Live Server.

## Add your photo
Save it as `assets/portrait.jpg` (portrait crop, about 4:5). The About section shows it automatically; without it, the frame is hidden.

## Libraries (loaded from CDNs)
- GSAP 3.12.5 + ScrollTrigger (animation)
- Lenis 1.1.13 (smooth scroll)
- Three.js r128 (hero shader)
- Fonts: Geist, Geist Mono (Google Fonts)

## Deploy to Vercel
This is a static site — no build step, no framework. Vercel serves the files as-is.

### Option A: GitHub + Vercel dashboard (recommended, auto-deploys on every push)
1. Create an empty repo on GitHub (e.g. `Eienmode/portfolio`).
2. In this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/Eienmode/portfolio.git
   git push -u origin main
   ```
3. Go to https://vercel.com/new, import the repo.
   Framework Preset: **Other**. Leave Build Command and Output Directory empty. Click **Deploy**.

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel          # first run: links the project, gives a preview URL
vercel --prod   # publishes to production
```

### Custom domain
Project → Settings → Domains → add your domain and follow the DNS instructions.

**If your domain is not `eien.dev`**, replace `https://eien.dev` in these files:
- `index.html` (canonical + `og:` / `twitter:` tags in `<head>`)
- `robots.txt`
- `sitemap.xml`

## Files
| File | Purpose |
|---|---|
| `index.html` | The site |
| `404.html` | Shown by Vercel for unknown URLs |
| `vercel.json` | Clean URLs, security headers, asset caching |
| `favicon.svg`, `site.webmanifest` | Browser tab icon / install metadata |
| `robots.txt`, `sitemap.xml` | Search engine indexing |
| `assets/portrait.jpg` | Portrait (also used as the link-preview image) |
