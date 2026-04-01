# Enhance.work Blog API — External Access

Base URL: `https://enhance.work`

## Authentication

All endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <BLOG_API_TOKEN>
```

The token is set via the `BLOG_API_TOKEN` environment variable on the server.

---

## Endpoints

### POST /api/blog/external/posts
Create a new blog post.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (JSON):**

| Field | Type | Required | Description |
|---|---|---|---|
| `slug` | string | ✅ | URL-friendly ID. Lowercase, numbers, hyphens only. E.g. `my-blog-post` |
| `title` | string | ✅ | Post title |
| `content` | string | ✅ | Full HTML content of the post body |
| `subtitle` | string | — | Optional subtitle / tagline |
| `excerpt` | string | — | Short summary shown in listings (plain text, ~160 chars) |
| `date` | string | — | Display date, e.g. `April 1, 2026` |
| `category` | string | — | Category label, e.g. `Med Spa`, `Aesthetics` |
| `read_time` | string | — | E.g. `5 min read` |
| `author` | string | — | Author full name |
| `author_bio` | string | — | Short author bio |
| `author_credential` | string | — | Credential / title, e.g. `RN, BSN` |
| `author_expertise` | string[] | — | Array of expertise tags, e.g. `["Injectables","Laser"]` |
| `image` | string | — | Hero image URL or path, e.g. `/images/blog/my-image.jpg` |
| `status` | string | — | `"published"` or `"draft"` (default: `"draft"`) |
| `sort_order` | integer | — | Manual sort order, lower = first (default: 0) |
| `seo_title` | string | — | `<title>` tag override (50–60 chars ideal) |
| `seo_description` | string | — | Meta description (140–160 chars ideal) |
| `seo_og_image` | string | — | Open Graph image URL |
| `canonical_url` | string | — | Canonical URL if different from default |
| `focus_keyword` | string | — | Primary SEO keyword |

**Example request:**
```json
{
  "slug": "best-treatments-for-skin-tightening-2026",
  "title": "Best Treatments for Skin Tightening in 2026",
  "subtitle": "A complete guide from our medical aesthetics team",
  "excerpt": "Discover the top non-surgical skin tightening treatments available in 2026, from radiofrequency to ultrasound-based therapies.",
  "date": "April 1, 2026",
  "category": "Skin Care",
  "read_time": "6 min read",
  "author": "Dr. Sarah Mitchell",
  "author_bio": "Board-certified dermatologist with 12 years in aesthetic medicine.",
  "author_credential": "MD, FAAD",
  "author_expertise": ["Skin Tightening", "RF Treatments", "Ultherapy"],
  "image": "/images/blog/skin-tightening-2026.jpg",
  "content": "<p>Skin laxity is one of the most common concerns...</p><h2>Radiofrequency</h2><p>...</p>",
  "status": "published",
  "seo_title": "Best Skin Tightening Treatments 2026 | Enhance.work",
  "seo_description": "Explore the most effective non-surgical skin tightening options in 2026. Expert guide from certified aesthetics professionals.",
  "seo_og_image": "https://enhance.work/images/blog/skin-tightening-2026.jpg",
  "focus_keyword": "skin tightening treatments 2026"
}
```

**Success response (201):**
```json
{
  "success": true,
  "post": {
    "id": 42,
    "slug": "best-treatments-for-skin-tightening-2026",
    "title": "Best Treatments for Skin Tightening in 2026",
    "status": "published",
    "published_at": "2026-04-01T18:45:00.000Z",
    "created_at": "2026-04-01T18:45:00.000Z"
  }
}
```

**Error responses:**
| Code | Meaning |
|---|---|
| 400 | Missing required fields or invalid slug format |
| 401 | Missing or invalid Bearer token |
| 409 | Slug already exists — use a different slug |
| 500 | Server error |

---

### GET /api/blog/external/posts
List all posts (published + drafts).

**Headers:**
```
Authorization: Bearer <token>
```

**Success response (200):**
```json
{
  "success": true,
  "posts": [
    {
      "id": 42,
      "slug": "best-treatments-for-skin-tightening-2026",
      "title": "Best Treatments for Skin Tightening in 2026",
      "status": "published",
      "date": "April 1, 2026",
      "sort_order": 0,
      "published_at": "2026-04-01T18:45:00.000Z",
      "updated_at": "2026-04-01T18:45:00.000Z"
    }
  ]
}
```

---

## Content guidelines

### HTML content (`content` field)
Send full HTML. Supported tags:
- Headings: `<h2>`, `<h3>`, `<h4>`
- Paragraphs: `<p>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Formatting: `<strong>`, `<em>`, `<blockquote>`
- Images: `<img src="..." alt="...">`
- Links: `<a href="...">`

### SEO best practices
- `seo_title`: 50–60 characters, include the focus keyword
- `seo_description`: 140–160 characters, compelling summary
- `focus_keyword`: single phrase (3–5 words), appears naturally in title, h2, and content
- `slug`: matches the focus keyword, e.g. `skin-tightening-treatments-2026`

---

## Environment variable required on server

```
BLOG_API_TOKEN=<token>
```

Store securely. Do not expose in logs or public repositories.
