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

module.exports = function handler(req, res) {
  const siteUrl = getSiteUrl(req);
  const disallowPaths = [
    '/admin',
    '/staff',
    '/login',
    '/register',
    '/forgot-password',
    '/profile',
    '/settings',
    '/checkout',
    '/cart',
    '/payment-result',
    '/lesson',
    '/lesson-material',
    '/my-courses',
    '/api',
  ];

  const localePrefixes = ['', '/ar', '/en'];
  const lines = ['User-agent: *', 'Allow: /'];

  localePrefixes.forEach((prefix) => {
    disallowPaths.forEach((path) => {
      lines.push(`Disallow: ${prefix}${path}`);
    });
  });

  lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(lines.join('\n'));
};
