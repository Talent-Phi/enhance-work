/**
 * blogDb.ts — server-side DB queries for blog pages (Astro SSR)
 */
import pg from 'pg';

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  excerpt: string;
  category: string;
  read_time: string;
  author: string;
  author_bio: string;
  author_credential: string;
  author_expertise: string[];
  image: string;
  content: string;
  seo_title: string;
  seo_description: string;
  seo_og_image: string;
  canonical_url: string;
  focus_keyword: string;
  status: string;
  sort_order: number;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export async function getAllPublishedPosts(): Promise<BlogPost[]> {
  try {
    const result = await getPool().query<BlogPost>(`
      SELECT id, slug, title, subtitle, date, excerpt, category, read_time,
             author, author_bio, author_credential, author_expertise, image,
             seo_title, seo_description, seo_og_image, canonical_url, focus_keyword,
             status, sort_order, published_at
      FROM blog_posts
      WHERE status = 'published'
      ORDER BY sort_order ASC, published_at DESC
    `);
    return result.rows;
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const result = await getPool().query<BlogPost>(
      `SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published'`,
      [slug]
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}
