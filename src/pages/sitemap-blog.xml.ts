export const prerender = false;

import type { APIRoute } from 'astro';
import { getAllPublishedPosts } from '../lib/blogDb';

export const GET: APIRoute = async () => {
  const posts = await getAllPublishedPosts();

  const urls = posts
    .map(post => {
      const lastmod = post.published_at
        ? new Date(post.published_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      return `  <url>
    <loc>https://enhance.work/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
