/**
 * blogDb.ts — server-side DB queries for blog pages (Astro SSR)
 * Falls back to static blogPosts data if DB is empty or unavailable.
 */
import pg from 'pg';
import { blogPosts as staticPosts } from '../data/blogPosts';

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

/** Convert static blogPost format → BlogPost interface */
function staticToPost(p: typeof staticPosts[0], idx: number): BlogPost {
  return {
    id: idx + 1,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle ?? '',
    date: p.date,
    excerpt: p.excerpt,
    category: p.category ?? '',
    read_time: p.readTime ?? '',
    author: p.author,
    author_bio: p.authorBio ?? '',
    author_credential: p.authorCredential ?? '',
    author_expertise: p.authorExpertise ?? [],
    image: p.image ?? '',
    content: p.content,
    seo_title: '',
    seo_description: '',
    seo_og_image: '',
    canonical_url: '',
    focus_keyword: '',
    status: 'published',
    sort_order: idx,
    published_at: '',
    created_at: '',
    updated_at: '',
  };
}

export async function getAllPublishedPosts(): Promise<BlogPost[]> {
  try {
    if (!process.env.DATABASE_URL) throw new Error('No DATABASE_URL');
    const result = await getPool().query<BlogPost>(`
      SELECT id, slug, title, subtitle, date, excerpt, category, read_time,
             author, author_bio, author_credential, author_expertise, image,
             seo_title, seo_description, seo_og_image, canonical_url, focus_keyword,
             status, sort_order, published_at
      FROM blog_posts
      WHERE status = 'published'
      ORDER BY sort_order ASC, published_at DESC
    `);
    // If DB is empty, fall back to static posts
    if (result.rows.length === 0) {
      return staticPosts.map(staticToPost);
    }
    return result.rows;
  } catch {
    // DB unavailable — use static posts
    return staticPosts.map(staticToPost);
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    if (!process.env.DATABASE_URL) throw new Error('No DATABASE_URL');
    const result = await getPool().query<BlogPost>(
      `SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published'`,
      [slug]
    );
    if (result.rows[0]) return result.rows[0];
    // Fallback to static
    const sp = staticPosts.find(p => p.slug === slug);
    return sp ? staticToPost(sp, staticPosts.indexOf(sp)) : null;
  } catch {
    const sp = staticPosts.find(p => p.slug === slug);
    return sp ? staticToPost(sp, staticPosts.indexOf(sp)) : null;
  }
}
