export const prerender = false;

import type { APIRoute } from 'astro';

const STATIC_PAGES = [
  { loc: 'https://enhance.work/',            priority: '1.0', changefreq: 'weekly'  },
  { loc: 'https://enhance.work/blog',        priority: '0.9', changefreq: 'daily'   },
  { loc: 'https://enhance.work/apply',       priority: '0.8', changefreq: 'monthly' },
];

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().split('T')[0];

  const urls = STATIC_PAGES.map(p => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
