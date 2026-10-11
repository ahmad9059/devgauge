# DevGauge landing page

A single-page, static hero section for DevGauge. There is no build step and no dependencies.

```text
landing/
  index.html         Markup, SEO meta tags, Open Graph/Twitter cards, JSON-LD
  styles.css         All styling, hover effects and entrance animation
  script.js          Dropdown menus and subtle phone parallax
  robots.txt         Crawler rules and sitemap pointer
  sitemap.xml        Single-URL sitemap
  site.webmanifest   Icons and theme colour
  _headers           Security and cache headers (Netlify / Cloudflare Pages)
  vercel.json        Same headers for Vercel
  assets/            Black logo, favicons, social image, phone captures
  fonts/         Self-hosted Inter fallback font; add licensed BB Anonym Pro .woff2 here
```

## Fonts

The page uses **BB Anonym Pro** by [Bold Studio](https://www.myfonts.com/collections/bb-anonym-pro-font-bold-studio), a paid typeface. Only the **Medium** style is installed (`fonts/BBAnonymPro-Medium.woff2`, converted from the licensed TTF). It is declared across the full weight range in `styles.css`, so headings, buttons and body text all render in Medium without faux-bold. Inter (`fonts/inter-latin-wght-normal.woff2`) remains as the fallback.

To add heavier styles, convert them to `.woff2`, drop them in `fonts/`, and add one `@font-face` per file in `styles.css` with its weight (for example SemiBold at 600 and Bold at 700), then narrow the Medium declaration to `font-weight: 500`.

The licensed font file is committed so hosts that build from git (such as Vercel) can serve it. It is not covered by this repository's MIT license; keep it under your BB Anonym Pro license.

## Preview

```sh
cd landing
python3 -m http.server 4173
```

Open <http://localhost:4173>. Any static server works.

## Deploy

Publish the `landing/` directory as-is to any static host (GitHub Pages, Cloudflare Pages, Netlify, Vercel).

## Notes

- Layout is designed at 1440px wide and sized in `rem`, with `html` font-size scaling to the viewport (clamped to 10–18px). Below 860px it switches to a fixed mobile layout.
- Phone screens use the real device captures from `marketing/public/captures/` (illustrative sample data), resized to WebP.
- `assets/logo.png` is `assets/readme-logo.png` recoloured to near-black for the white background.
- The primary buttons link to the latest GitHub release, since DevGauge is distributed as a sideloaded Android APK.
- This folder is excluded from the app's ESLint run in `eslint.config.mjs`.

## Interaction

All motion is CSS `transform`/`opacity` only: staggered entrance, underline-on-hover for nav links, logo tilt, button lift with icon pop, menu item nudge, and a cursor-follow parallax on the phones (mouse devices only). Everything is disabled under `prefers-reduced-motion`.

## SEO checklist

- One `<h1>`, descriptive `<title>` (54 chars) and meta description (145 chars), canonical URL, `robots` meta, `lang`.
- Open Graph + Twitter large-image card using `assets/og-image.jpg` (1200x630, generated from the page).
- JSON-LD `WebSite` and `SoftwareApplication` (free, Android, MIT, download URL, screenshots). No fabricated ratings or reviews.
- Descriptive alt text on the phone screenshots, explicit image dimensions (no layout shift), preloaded font, self-hosted assets with no third-party requests.
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, favicons (48px `.ico`, 32/192/512 PNG, Apple touch icon).
- Text contrast meets WCAG AA (subtext is `#767676` on white).

### Site URL

The canonical URL is `https://devgauge.devshub.xyz/`. It appears in `index.html` (canonical, Open Graph, Twitter, JSON-LD), `robots.txt` and `sitemap.xml`. To move to another domain, replace it everywhere:

```sh
grep -rl "devgauge.devshub.xyz" . | xargs sed -i 's#https://devgauge.devshub.xyz#https://YOUR-DOMAIN#g'
```

After deploying, submit `https://devgauge.devshub.xyz/sitemap.xml` in Google Search Console and Bing Webmaster Tools. If you change the headline or screenshots, regenerate `assets/og-image.jpg`.

### Serving notes

- `robots.txt` and `sitemap.xml` must sit at the site root, so serve `landing/` as the root of the host.
- `_headers` is honoured by Netlify and Cloudflare Pages. Vercel reads `vercel.json` instead (included). GitHub Pages ignores both and cannot set custom headers.
