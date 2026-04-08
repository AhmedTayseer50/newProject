const { getFirebaseAdmin } = require('./_lib/firebaseAdmin');

function getSiteUrl(req) {
  const raw =
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    'localhost:3000';

  const normalized = String(raw).trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const protocol = normalized.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${normalized}`;
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeBasePath(basePath) {
  const normalized = `/${String(basePath || '').trim().replace(/^\/+/, '')}`;
  return normalized === '/' ? '/' : normalized.replace(/\/+$/, '');
}

function localizedUrl(siteUrl, locale, basePath) {
  const normalizedPath = normalizeBasePath(basePath);
  if (normalizedPath === '/') {
    return `${siteUrl}/${locale}/`;
  }

  return `${siteUrl}/${locale}${normalizedPath}`;
}

function toIsoDate(value) {
  const numeric = Number(value || 0);
  if (!numeric) {
    return new Date().toISOString();
  }

  const date = new Date(numeric);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function buildEntry(siteUrl, basePath, lastmod) {
  const arUrl = localizedUrl(siteUrl, 'ar', basePath);
  const enUrl = localizedUrl(siteUrl, 'en', basePath);

  return `
  <url>
    <loc>${escapeXml(arUrl)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arUrl)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(arUrl)}" />
  </url>
  <url>
    <loc>${escapeXml(enUrl)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arUrl)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(arUrl)}" />
  </url>`;
}

async function loadPublishedContentPaths() {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.database();

    const [coursesSnap, diplomasSnap] = await Promise.all([
      db.ref('courses').get(),
      db.ref('diplomas').get(),
    ]);

    const entries = [];
    const courses = coursesSnap.exists() ? coursesSnap.val() : {};
    const diplomas = diplomasSnap.exists() ? diplomasSnap.val() : {};

    Object.entries(courses || {}).forEach(([id, item]) => {
      if (!item || item.published !== true) return;
      entries.push({
        basePath: `/courses/${encodeURIComponent(id)}`,
        lastmod: toIsoDate(item.updatedAt || item.createdAt),
      });
    });

    Object.entries(diplomas || {}).forEach(([id, item]) => {
      if (!item || item.published !== true) return;
      entries.push({
        basePath: `/diplomas/${encodeURIComponent(id)}`,
        lastmod: toIsoDate(item.updatedAt || item.createdAt),
      });
    });

    return entries;
  } catch (error) {
    console.warn('[sitemap.xml] Falling back to static sitemap only:', error.message);
    return [];
  }
}

module.exports = async function handler(req, res) {
  const siteUrl = getSiteUrl(req);
  const now = new Date().toISOString();
  const staticPaths = [
    '/',
    '/about',
    '/courses',
    '/faq',
    '/consultations',
    '/contact',
    '/book-session',
    '/diplomas',
  ];

  const dynamicPaths = await loadPublishedContentPaths();
  const xmlBody = [
    ...staticPaths.map((path) => buildEntry(siteUrl, path, now)),
    ...dynamicPaths.map((entry) => buildEntry(siteUrl, entry.basePath, entry.lastmod)),
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${xmlBody}
</urlset>`);
};
