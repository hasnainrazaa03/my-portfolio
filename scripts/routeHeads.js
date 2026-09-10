/**
 * routeHeads.js — one HTML file per route, each with its own <head>.
 *
 * A single-page app serves the same index.html for every URL, so every route
 * carried the home page's <title>, description, Open Graph tags and canonical
 * link. Social scrapers and most indexing passes never run the script that
 * later sets document.title, so a shared case study previewed as the home
 * page — and, since its canonical pointed at "/", declared itself a duplicate
 * of the home page to crawlers.
 *
 * After the bundle is written this copies the built index.html once per route
 * (src/utils/routeMeta.ts), swapping only the head values, to
 * `dist/<route>.html`. Vercel serves that file at the extensionless URL via
 * `cleanUrls`, and `vite preview` does the same natively, so the E2E suite
 * sees the real thing locally. Everything else in the file — the hashed asset
 * names, the theme bootstrap, the JSON-LD whose sha256 the CSP pins — is byte
 * for byte the shell, so nothing can drift.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const escapeAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Pixel size of a PNG or JPEG read from its header; null for anything else. */
export function imageSize(buf) {
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    // Walk the segments to the first Start-Of-Frame: precision, height, width.
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i += 1;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2; // standalone marker, no length
        continue;
      }
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/**
 * Social cards are landscape and get cropped to ~1.91:1. A small image is
 * shown as a thumbnail and a very wide one loses its sides, so either falls
 * back to the site card rather than shipping a bad preview.
 */
export function usableAsCard(size) {
  if (!size || !size.width || !size.height) return false;
  const aspect = size.width / size.height;
  return size.width >= 1000 && aspect >= 1.4 && aspect <= 2.6;
}

function setMeta(html, attr, key, content) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`index.html has no <meta ${attr}="${key}"> to fill in`);
  return html.replace(re, `$1${escapeAttr(content)}$2`);
}

function dropMeta(html, attr, key) {
  return html.replace(new RegExp(`[ \\t]*<meta\\s+${attr}="${key}"[^>]*>\\r?\\n?`), '');
}

/**
 * The shell with one route's head values swapped in.
 *
 * `image` is the resolved social image (`{ url, alt, width?, height? }`) or
 * undefined to keep the site card the shell already declares.
 */
export function renderRouteHead(html, route, { origin, image }) {
  const url = `${origin}${route.path}`;

  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeText(route.title)}</title>`);
  if (out === html) throw new Error('index.html has no <title> to fill in');
  out = setMeta(out, 'name', 'title', route.title);
  out = setMeta(out, 'name', 'description', route.description);

  const canonical = /(<link\s+rel="canonical"\s+href=")[^"]*(")/;
  if (!canonical.test(out)) throw new Error('index.html has no canonical link to fill in');
  out = out.replace(canonical, `$1${escapeAttr(url)}$2`);

  out = setMeta(out, 'property', 'og:type', route.type);
  out = setMeta(out, 'property', 'og:url', url);
  out = setMeta(out, 'property', 'og:title', route.title);
  out = setMeta(out, 'property', 'og:description', route.description);
  out = setMeta(out, 'property', 'twitter:url', url);
  out = setMeta(out, 'property', 'twitter:title', route.title);
  out = setMeta(out, 'property', 'twitter:description', route.description);

  if (image) {
    out = setMeta(out, 'property', 'og:image', image.url);
    out = setMeta(out, 'property', 'twitter:image', image.url);
    out = setMeta(out, 'property', 'og:image:alt', image.alt);
    out = setMeta(out, 'property', 'twitter:image:alt', image.alt);
    if (image.width && image.height) {
      out = setMeta(out, 'property', 'og:image:width', String(image.width));
      out = setMeta(out, 'property', 'og:image:height', String(image.height));
    } else {
      // A wrong size is worse than none: scrapers trust it over the file.
      out = dropMeta(out, 'property', 'og:image:width');
      out = dropMeta(out, 'property', 'og:image:height');
    }
  }
  return out;
}

/** True when `publicPath` names a file that would make a good social card. */
export function imageWorksAsCard(dir, publicPath) {
  if (!publicPath) return false;
  const file = resolve(dir, `.${publicPath}`);
  if (!existsSync(file)) return false;
  return usableAsCard(imageSize(readFileSync(file)));
}

/**
 * The social image for a route, in order of preference:
 *
 *   1. the project's own artwork, when it works as a card — a real screenshot
 *      of the thing beats any generated panel;
 *   2. the card generated for it (scripts/buildOgCards.js), for projects whose
 *      artwork is the wrong shape — a 3.6:1 banner loses its sides, a 331x383
 *      thumbnail renders as a stamp;
 *   3. nothing, meaning the shell's site-wide card stands.
 *
 * Step 2 exists because step 3 used to catch three different projects, which
 * then previewed identically and told a reader nothing about the link.
 */
export function resolveCardImage(outDir, origin, route) {
  if (imageWorksAsCard(outDir, route.image)) {
    const size = imageSize(readFileSync(resolve(outDir, `.${route.image}`)));
    return { url: `${origin}${route.image}`, alt: route.imageAlt ?? route.title, ...size };
  }
  if (route.generatedCard && existsSync(resolve(outDir, `.${route.generatedCard}`))) {
    return {
      url: `${origin}${route.generatedCard}`,
      alt: route.imageAlt ?? route.title,
      width: 1200,
      height: 630,
    };
  }
  return undefined;
}

/** @returns {import('vite').Plugin} */
export function routeHeadsPlugin({ routes, origin }) {
  let outDir = '';
  return {
    name: 'route-heads',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexPath = resolve(outDir, 'index.html');
      if (!existsSync(indexPath)) return;
      const html = readFileSync(indexPath, 'utf8');
      for (const route of routes) {
        const image = resolveCardImage(outDir, origin, route);
        // '/projects/x' -> dist/projects/x.html
        const file = resolve(outDir, `.${route.path}.html`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, renderRouteHead(html, route, { origin, image }));
      }
    },
  };
}
