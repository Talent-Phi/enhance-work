/**
 * migrate-blog-posts.mjs
 * Migrates static blogPosts array → blog_posts table in PostgreSQL.
 * Run once: node scripts/migrate-blog-posts.mjs
 */
import pg from 'pg';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Parse blogPosts from TS file (strip TypeScript syntax)
const raw = readFileSync(path.join(__dirname, '../src/data/blogPosts.ts'), 'utf-8');

// Very basic TS→JS stripping for this specific file
const js = raw
  .replace(/export interface[\s\S]*?^}/gm, '')
  .replace(/export const blogPosts: BlogPost\[\]/g, 'const blogPosts')
  .replace(/: string/g, '')
  .replace(/: boolean/g, '')
  .replace(/\?: string/g, '')
  .replace(/export \{[^}]*\}/g, '')
  .replace(/^export /gm, '');

// Eval to extract the array (safe, local file only)
let blogPosts;
try {
  const fn = new Function(js + '\n return blogPosts;');
  blogPosts = fn();
} catch (e) {
  console.error('Failed to parse blogPosts.ts:', e.message);
  process.exit(1);
}

async function run() {
  console.log(`Migrating ${blogPosts.length} posts…`);

  for (let i = 0; i < blogPosts.length; i++) {
    const p = blogPosts[i];
    const expertise = Array.isArray(p.authorExpertise) ? p.authorExpertise : [];

    await pool.query(`
      INSERT INTO blog_posts (
        slug, title, subtitle, date, excerpt, category, read_time,
        author, author_bio, author_credential, author_expertise,
        image, content, status, sort_order, published_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'published',$14,NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title              = EXCLUDED.title,
        subtitle           = EXCLUDED.subtitle,
        date               = EXCLUDED.date,
        excerpt            = EXCLUDED.excerpt,
        category           = EXCLUDED.category,
        read_time          = EXCLUDED.read_time,
        author             = EXCLUDED.author,
        author_bio         = EXCLUDED.author_bio,
        author_credential  = EXCLUDED.author_credential,
        author_expertise   = EXCLUDED.author_expertise,
        image              = EXCLUDED.image,
        content            = EXCLUDED.content,
        sort_order         = EXCLUDED.sort_order,
        updated_at         = NOW()
    `, [
      p.slug, p.title, p.subtitle || '', p.date, p.excerpt,
      p.category || '', p.readTime || '',
      p.author, p.authorBio || '', p.authorCredential || '',
      expertise, p.image || '', p.content,
      i  // sort_order = position in array
    ]);
    console.log(`  ✓ ${p.slug}`);
  }

  console.log('Migration complete.');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
