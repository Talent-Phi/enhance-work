import pg from 'pg';
import { blogPosts } from '../src/data/blogPosts.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log(`Seeding ${blogPosts.length} blog posts...`);

  for (let i = 0; i < blogPosts.length; i++) {
    const p = blogPosts[i];
    const expertise = p.authorExpertise ?? [];
    const sortOrder = blogPosts.length - i;

    await pool.query(
      `INSERT INTO blog_posts
        (slug, title, subtitle, date, excerpt, category, read_time,
         author, author_bio, author_credential, author_expertise,
         image, content, status, sort_order, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'published',$14,NOW())
       ON CONFLICT (slug) DO UPDATE SET
         title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
         excerpt=EXCLUDED.excerpt, content=EXCLUDED.content,
         status='published', sort_order=EXCLUDED.sort_order,
         updated_at=NOW()`,
      [
        p.slug, p.title, p.subtitle ?? '', p.date, p.excerpt,
        p.category, p.readTime, p.author, p.authorBio ?? '',
        p.authorCredential ?? '', expertise,
        p.image ?? '', p.content, sortOrder,
      ]
    );
    console.log(`  ✓ ${p.slug}`);
  }

  await pool.end();
  console.log('Done.');
}

seed().catch((err) => { console.error(err); process.exit(1); });
