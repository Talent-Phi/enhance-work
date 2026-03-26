/**
 * BLOG POSTS — enhance.work
 * ============================================================
 * Single source of truth for all blog posts.
 * Add new posts at the TOP of this array.
 *
 * REQUIRED FIELDS:
 *   slug      - URL-friendly identifier, e.g. "jobs-in-aesthetics-miami"
 *   title     - Full post title
 *   subtitle  - Short tagline shown below title in post page
 *   date      - Display date, e.g. "May 22, 2026"
 *   excerpt   - 1-2 sentence preview shown on listing cards
 *   category  - e.g. "Career", "Industry", "Tips", "Miami"
 *   readTime  - e.g. "5 min"
 *   author    - Author name
 *   authorBio - Short bio shown in sidebar
 *   authorCredential - e.g. "Verified Aesthetician"
 *   image     - URL or path to cover image (optional)
 *   content   - HTML content of the post body
 *
 * CONTENT STRUCTURE (HTML):
 *   - Intro paragraph: <p>...</p>
 *   - Pull quote: <blockquote>...</blockquote>
 *   - Section: <h2>Section title</h2><p>...</p>
 *   - Image: <img src="..." alt="..." />
 *   - Treatments box: <div class="treatments-box"><h3>Treatments available</h3>...</div>
 *
 * TABLE OF CONTENTS is auto-generated from <h2> tags in content.
 * ============================================================
 */

export interface BlogPost {
  slug: string;
  title: string;
  subtitle?: string;
  date: string;
  excerpt: string;
  category: string;
  readTime: string;
  author: string;
  authorBio?: string;
  authorCredential?: string;
  authorExpertise?: string[];
  image?: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  // ← ADD NEW POSTS HERE (at the top)
];
