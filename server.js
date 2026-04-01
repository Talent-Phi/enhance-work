import express from 'express';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { initGoogleSheets, appendApplicationRow, getSpreadsheetUrl } from './googleSheets.js';
import { seedBlogPosts } from './scripts/blog-seed-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));


const app = express();
app.use(express.json());

// ── Session middleware ────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'enhance-admin-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax',
  },
}));

// ── Auth middleware (session-based, for admin panel) ─────────
function requireAuth(req, res, next) {
  if (req.session && req.session.adminUser) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin/login');
}

// ── Token auth middleware (for external API) ─────────────────
function requireToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const validToken = process.env.BLOG_API_TOKEN;
  if (!validToken) {
    return res.status(500).json({ error: 'Server misconfigured: BLOG_API_TOKEN not set' });
  }
  if (!token || token !== validToken) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing Bearer token' });
  }
  next();
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + '-' + file.originalname);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.heic', '.svg', '.odt', '.rtf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      role VARCHAR(100) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      gender VARCHAR(50),
      date_of_birth DATE,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      address1 VARCHAR(255),
      address2 VARCHAR(255),
      state VARCHAR(100),
      city VARCHAR(100),
      zip VARCHAR(20),
      language VARCHAR(100),
      language_level VARCHAR(50),
      language_other VARCHAR(100),
      language_2 VARCHAR(100),
      language_level_2 VARCHAR(50),
      language_3 VARCHAR(100),
      language_level_3 VARCHAR(50),
      language_4 VARCHAR(100),
      language_level_4 VARCHAR(50),
      language_5 VARCHAR(100),
      language_level_5 VARCHAR(50),
      licenses TEXT[],
      license_other VARCHAR(255),
      years_experience VARCHAR(20),
      skills TEXT[],
      start_date VARCHAR(50),
      employed VARCHAR(10),
      salary VARCHAR(50),
      pay_type VARCHAR(50),
      injector_msg_read BOOLEAN DEFAULT FALSE,
      terms_agreed BOOLEAN DEFAULT FALSE,
      resume_filename VARCHAR(255),
      utm_source VARCHAR(255),
      utm_medium VARCHAR(255),
      utm_campaign VARCHAR(255),
      utm_term VARCHAR(255),
      utm_content VARCHAR(255),
      utm_id VARCHAR(255),
      utm_creative_format VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // ── UTM columns migration (safe: ADD COLUMN IF NOT EXISTS) ──
  const utmCols = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','utm_creative_format'];
  for (const col of utmCols) {
    await pool.query(
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS ${col} VARCHAR(255)`
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resumes (
      id SERIAL PRIMARY KEY,
      application_id INTEGER REFERENCES applications(id),
      original_name VARCHAR(255),
      content_type VARCHAR(100),
      file_data BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Blog posts table ────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id                SERIAL PRIMARY KEY,
      slug              VARCHAR(255) UNIQUE NOT NULL,
      title             TEXT NOT NULL,
      subtitle          TEXT DEFAULT '',
      date              VARCHAR(100) DEFAULT '',
      excerpt           TEXT DEFAULT '',
      category          VARCHAR(100) DEFAULT '',
      read_time         VARCHAR(50) DEFAULT '',
      author            VARCHAR(200) DEFAULT '',
      author_bio        TEXT DEFAULT '',
      author_credential VARCHAR(255) DEFAULT '',
      author_expertise  TEXT[] DEFAULT '{}',
      image             TEXT DEFAULT '',
      content           TEXT DEFAULT '',
      status            VARCHAR(20) DEFAULT 'draft',
      sort_order        INTEGER DEFAULT 0,
      seo_title         TEXT DEFAULT '',
      seo_description   TEXT DEFAULT '',
      seo_og_image      TEXT DEFAULT '',
      canonical_url     TEXT DEFAULT '',
      focus_keyword     VARCHAR(255) DEFAULT '',
      published_at      TIMESTAMP,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Admin users table ────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);

  const adminUsers = [
    { name: 'Rafael',   email: 'rafael@perfectb.com',           password: 'Enhancerafael1!' },
    { name: 'Santiago', email: 'santiago.loaiza@talentphi.com', password: 'Enhancesantiago1!' },
  ];
  for (const u of adminUsers) {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (exists.rows.length === 0) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
        [u.name, u.email, hash]
      );
      console.log(`Admin user seeded: ${u.email}`);
    }
  }

  // ── Seed blog posts if table is empty ────────────────────────
  const blogCount = await pool.query('SELECT COUNT(*) FROM blog_posts');
  if (parseInt(blogCount.rows[0].count, 10) === 0 && seedBlogPosts.length > 0) {
    console.log(`Seeding ${seedBlogPosts.length} blog posts…`);
    for (const p of seedBlogPosts) {
      await pool.query(`
        INSERT INTO blog_posts (
          slug, title, subtitle, date, excerpt, category, read_time,
          author, author_bio, author_credential, author_expertise,
          image, content, status, sort_order,
          seo_title, seo_description, seo_og_image, canonical_url, focus_keyword,
          published_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        ON CONFLICT (slug) DO NOTHING
      `, [
        p.slug, p.title, p.subtitle||'', p.date||'', p.excerpt||'',
        p.category||'', p.read_time||'',
        p.author||'', p.author_bio||'', p.author_credential||'',
        p.author_expertise || [],
        p.image||'', p.content||'', p.status||'draft', p.sort_order||0,
        p.seo_title||'', p.seo_description||'', p.seo_og_image||'',
        p.canonical_url||'', p.focus_keyword||'',
        p.published_at || null,
      ]);
    }
    console.log('Blog posts seeded ✓');
  }

  console.log('Database initialized');
}

// ── Meta Conversions API (server-side) ──────────────────────────────────────
const META_PIXEL_ID   = '322421330936674';
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN || '';
const META_TEST_CODE  = process.env.META_CAPI_TEST_CODE || '';

async function sha256(str) {
  if (!str) return null;
  const { createHash } = await import('crypto');
  return createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
}

app.post('/api/meta-capi', async (req, res) => {
  try {
    const { event_name, event_id, event_source_url, user_data } = req.body;
    if (!event_name || !event_id) {
      return res.status(400).json({ error: 'Missing event_name or event_id' });
    }

    const hashedUserData = {
      client_ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
      client_user_agent: req.headers['user-agent'] || ''
    };

    if (user_data) {
      if (user_data.fbp) hashedUserData.fbp = user_data.fbp;
      if (user_data.fbc) hashedUserData.fbc = user_data.fbc;
      if (user_data.email)      hashedUserData.em = await sha256(user_data.email);
      if (user_data.phone)      hashedUserData.ph = await sha256(user_data.phone.replace(/\D/g, ''));
      if (user_data.first_name) hashedUserData.fn = await sha256(user_data.first_name);
      if (user_data.last_name)  hashedUserData.ln = await sha256(user_data.last_name);
      if (user_data.dob)        hashedUserData.db = await sha256(user_data.dob.replace(/\D/g, ''));
    }

    const payload = {
      data: [{
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        event_source_url: event_source_url || '',
        action_source: 'website',
        user_data: hashedUserData
      }]
    };
    if (META_TEST_CODE) payload.test_event_code = META_TEST_CODE;

    const url = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`;
    const metaRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const metaData = await metaRes.json();
    console.log('[MetaCAPI Server]', event_name, metaData);
    res.json({ success: true, meta: metaData });
  } catch (err) {
    console.error('[MetaCAPI Server] Error:', err);
    res.status(500).json({ error: 'CAPI error' });
  }
});

app.post('/api/apply', upload.single('resume'), async (req, res) => {
  try {
    const data = req.body;

    if (!data.first_name || !data.last_name || !data.email || !data.role) {
      return res.status(400).json({ success: false, error: 'Missing required fields: first_name, last_name, email, role' });
    }

    const licenses = data.licenses ? (Array.isArray(data.licenses) ? data.licenses : [data.licenses]) : [];
    const skills = data.skills ? (Array.isArray(data.skills) ? data.skills : [data.skills]) : [];

    let dob = null;
    if (data.dob_month && data.dob_day && data.dob_year) {
      const m = String(data.dob_month).padStart(2, '0');
      const d = String(data.dob_day).padStart(2, '0');
      const y = String(data.dob_year);
      const dateStr = `${y}-${m}-${d}`;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        dob = dateStr;
      }
    }

    let resumeFilename = null;
    let resumeFileData = null;
    if (req.file) {
      resumeFilename = req.file.originalname;
      resumeFileData = fs.readFileSync(req.file.path);
      fs.unlink(req.file.path, () => {});
    }

    const result = await pool.query(
      `INSERT INTO applications (
        role, first_name, last_name, gender, date_of_birth, email, phone,
        address1, address2, state, city, zip,
        language, language_level, language_other,
        language_2, language_level_2, language_3, language_level_3,
        language_4, language_level_4, language_5, language_level_5,
        licenses, license_other,
        years_experience, skills, start_date, employed,
        salary, pay_type, injector_msg_read, terms_agreed, resume_filename,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        utm_id, utm_creative_format
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25,
        $26, $27, $28, $29,
        $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39,
        $40, $41
      ) RETURNING id`,
      [
        data.role,
        data.first_name,
        data.last_name,
        data.gender || null,
        dob,
        data.email,
        data.phone || null,
        data.address1 || null,
        data.address2 || null,
        data.state || null,
        data.city || null,
        data.zip || null,
        data.language || null,
        data.language_level || null,
        data.language_other || null,
        data.language_2 || null,
        data.language_level_2 || null,
        data.language_3 || null,
        data.language_level_3 || null,
        data.language_4 || null,
        data.language_level_4 || null,
        data.language_5 || null,
        data.language_level_5 || null,
        licenses,
        data.license_other || null,
        data.years_experience || null,
        skills,
        data.start_date || null,
        data.employed || null,
        data.salary || null,
        data.pay_type || null,
        data.injector_msg_read === 'true' || data.injector_msg_read === true,
        data.terms_agreed === 'true' || data.terms_agreed === true,
        resumeFilename,
        data.utm_source || null,
        data.utm_medium || null,
        data.utm_campaign || null,
        data.utm_term || null,
        data.utm_content || null,
        data.utm_id || null,
        data.utm_creative_format || null,
      ]
    );

    const appId = result.rows[0].id;

    let resumeLink = '';
    if (resumeFileData && resumeFilename) {
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.tiff': 'image/tiff',
        '.heic': 'image/heic',
        '.svg': 'image/svg+xml',
        '.odt': 'application/vnd.oasis.opendocument.text',
        '.rtf': 'application/rtf',
        '.txt': 'text/plain'
      };
      const ext = path.extname(resumeFilename).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const resumeResult = await pool.query(
        `INSERT INTO resumes (application_id, original_name, content_type, file_data) VALUES ($1, $2, $3, $4) RETURNING id`,
        [appId, resumeFilename, contentType, resumeFileData]
      );
      resumeLink = `https://enhance.work/api/resume/${resumeResult.rows[0].id}`;
      await pool.query(`UPDATE applications SET resume_filename = $1 WHERE id = $2`, [resumeLink, appId]);
    }

    const zapPayload = {
      // --- Item Name (required by Monday.com) ---
      'Item Name':            `${data.first_name} ${data.last_name}`,
      // --- Identity ---
      'First Name':           data.first_name,
      'Last Name':            data.last_name,
      'Email':                data.email,
      'Phone Number':         data.phone || '',
      'Gender':               data.gender || '',
      'Date of Birth':        dob || '',
      // --- Position ---
      'Role':                 data.role,
      // --- Address ---
      'Address':              data.address1 || '',
      'Apt / Suite':          data.address2 || '',
      'City':                 data.city || '',
      'State':                data.state || '',
      'Zip Code':             data.zip || '',
      // --- Competences ---
      'Language':             data.language || '',
      'Language Level':       data.language_level || '',
      'Language (Other)':     data.language_other || '',
      'Language 2':           data.language_2 || '',
      'Language Level 2':     data.language_level_2 || '',
      'Language 3':           data.language_3 || '',
      'Language Level 3':     data.language_level_3 || '',
      'Language 4':           data.language_4 || '',
      'Language Level 4':     data.language_level_4 || '',
      'Language 5':           data.language_5 || '',
      'Language Level 5':     data.language_level_5 || '',
      'Licenses':             licenses.join(', '),
      'License (Other)':      data.license_other || '',
      // --- Experience ---
      'Years of Experience':  data.years_experience || '',
      'Skills':               skills.join(', '),
      'Start Date':           data.start_date || '',
      'Currently Employed':   data.employed || '',
      // --- Salary / Resume ---
      'Salary Expectations':  data.salary || '',
      'Salary Type':          data.pay_type || '',
      'Resume Filename':      resumeLink || '',
      // --- UTMs ---
      'UTM Source':           data.utm_source || '',
      'UTM Medium':           data.utm_medium || '',
      'UTM Campaign':         data.utm_campaign || '',
      'UTM Term':             data.utm_term || '',
      'UTM Content':          data.utm_content || '',
      'UTM ID':               data.utm_id || '',
      'UTM Creative Format':  data.utm_creative_format || '',
      // --- Meta ---
      'Application ID':       appId,
      'Submitted At':         new Date().toISOString(),
      'Form Name':            'Enhance.work Application',
      'Page URL':             'https://enhance.work',
    };

    fetch('https://hooks.zapier.com/hooks/catch/12621312/37nxjvq/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zapPayload),
    }).catch(err => console.error('[Zapier] Webhook error:', err.message));

    appendApplicationRow({
      appId,
      submittedAt: new Date().toISOString(),
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone || '',
      gender: data.gender || '',
      dob: dob || '',
      role: data.role,
      address1: data.address1 || '',
      address2: data.address2 || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      language: data.language || '',
      language_level: data.language_level || '',
      language_2: data.language_2 || '',
      language_level_2: data.language_level_2 || '',
      language_3: data.language_3 || '',
      language_level_3: data.language_level_3 || '',
      language_4: data.language_4 || '',
      language_level_4: data.language_level_4 || '',
      language_5: data.language_5 || '',
      language_level_5: data.language_level_5 || '',
      licenses: licenses.join(', '),
      license_other: data.license_other || '',
      years_experience: data.years_experience || '',
      skills: skills.join(', '),
      start_date: data.start_date || '',
      employed: data.employed || '',
      salary: data.salary || '',
      pay_type: data.pay_type || '',
      resume_filename: resumeLink || '',
      utm_source: data.utm_source || '',
      utm_medium: data.utm_medium || '',
      utm_campaign: data.utm_campaign || '',
      utm_term: data.utm_term || '',
      utm_content: data.utm_content || '',
      utm_id: data.utm_id || '',
      utm_creative_format: data.utm_creative_format || '',
    }).catch(() => {});

    res.json({ success: true, id: appId });
  } catch (err) {
    console.error('Error saving application:', err);
    res.status(500).json({ success: false, error: 'Failed to save application' });
  }
});

// ════════════════════════════════════════════════════════════
//  BLOG ADMIN PANEL  (auth-protected)
// ════════════════════════════════════════════════════════════

// ── Login page ───────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.adminUser) return res.redirect('/admin/blog');
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// ── Login POST ───────────────────────────────────────────────
app.post('/admin/login', express.urlencoded({ extended: false }), async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [(email || '').toLowerCase().trim()]
    );
    const user = result.rows[0];
    if (!user) return res.redirect('/admin/login?error=1');
    const valid = await bcrypt.compare(password || '', user.password_hash);
    if (!valid) return res.redirect('/admin/login?error=1');
    req.session.adminUser = { id: user.id, name: user.name, email: user.email };
    res.redirect('/admin/blog');
  } catch (err) {
    console.error('Login error:', err);
    res.redirect('/admin/login?error=1');
  }
});

// ── Logout ───────────────────────────────────────────────────
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── Admin panel (protected) ───────────────────────────────────
app.get('/admin/blog', requireAuth, (req, res) => {
  const candidates = [
    path.join(__dirname, 'dist', 'client', 'admin', 'blog.html'),
    path.join(__dirname, 'dist', 'admin', 'blog.html'),
    path.join(__dirname, 'public', 'admin', 'blog.html'),
    path.join(__dirname, 'admin', 'blog.html'),
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) return res.sendFile(f);
  }
  res.status(404).send('Admin panel not found');
});

// Image upload for blog (reuse multer, save to public/images/blog/)
const blogImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, 'public', 'images', 'blog');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = path.basename(file.originalname, ext)
        .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60);
      cb(null, `${name}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// Protect ALL /api/blog/admin/* routes
app.use('/api/blog/admin', requireAuth);

app.post('/api/blog/admin/upload-image', blogImageUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/images/blog/${req.file.filename}` });
});

// ── Blog CRUD API ────────────────────────────────────────────

// GET all posts (admin — includes drafts)
app.get('/api/blog/admin/posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, slug, title, status, date, sort_order, published_at, updated_at
      FROM blog_posts
      ORDER BY sort_order ASC, published_at DESC NULLS LAST, created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Blog admin GET list:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single post (admin)
app.get('/api/blog/admin/posts/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM blog_posts WHERE id = $1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
app.post('/api/blog/admin/posts', async (req, res) => {
  try {
    const {
      slug, title, subtitle, date, excerpt, category, read_time,
      author, author_bio, author_credential, author_expertise,
      image, content, status, sort_order,
      seo_title, seo_description, seo_og_image, canonical_url, focus_keyword
    } = req.body;

    const published_at = status === 'published' ? new Date() : null;

    const result = await pool.query(`
      INSERT INTO blog_posts (
        slug, title, subtitle, date, excerpt, category, read_time,
        author, author_bio, author_credential, author_expertise,
        image, content, status, sort_order,
        seo_title, seo_description, seo_og_image, canonical_url, focus_keyword,
        published_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id, slug, title, status
    `, [
      slug, title, subtitle||'', date||'', excerpt||'', category||'', read_time||'',
      author||'', author_bio||'', author_credential||'',
      author_expertise || [],
      image||'', content||'', status||'draft', sort_order||0,
      seo_title||'', seo_description||'', seo_og_image||'', canonical_url||'', focus_keyword||'',
      published_at
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Blog POST:', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT update
app.put('/api/blog/admin/posts/:id', async (req, res) => {
  try {
    const {
      slug, title, subtitle, date, excerpt, category, read_time,
      author, author_bio, author_credential, author_expertise,
      image, content, status, sort_order,
      seo_title, seo_description, seo_og_image, canonical_url, focus_keyword
    } = req.body;

    // Only set published_at if transitioning to published and not already set
    const existingResult = await pool.query(
      `SELECT published_at FROM blog_posts WHERE id = $1`, [req.params.id]
    );
    const existing = existingResult.rows[0];
    const published_at = (status === 'published' && !existing?.published_at)
      ? new Date()
      : (existing?.published_at || null);

    const result = await pool.query(`
      UPDATE blog_posts SET
        slug = $1, title = $2, subtitle = $3, date = $4, excerpt = $5,
        category = $6, read_time = $7,
        author = $8, author_bio = $9, author_credential = $10, author_expertise = $11,
        image = $12, content = $13, status = $14, sort_order = $15,
        seo_title = $16, seo_description = $17, seo_og_image = $18,
        canonical_url = $19, focus_keyword = $20,
        published_at = $21, updated_at = NOW()
      WHERE id = $22
      RETURNING id, slug, title, status
    `, [
      slug, title, subtitle||'', date||'', excerpt||'', category||'', read_time||'',
      author||'', author_bio||'', author_credential||'',
      author_expertise || [],
      image||'', content||'', status||'draft', sort_order||0,
      seo_title||'', seo_description||'', seo_og_image||'', canonical_url||'', focus_keyword||'',
      published_at, req.params.id
    ]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Blog PUT:', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE
app.delete('/api/blog/admin/posts/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM blog_posts WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Public blog API (for SSR fallback if needed) ─────────────
app.get('/api/blog/posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, slug, title, subtitle, date, excerpt, category, read_time,
             author, author_bio, author_credential, author_expertise, image,
             seo_title, seo_description, seo_og_image, canonical_url, focus_keyword,
             status, sort_order, published_at
      FROM blog_posts
      WHERE status = 'published'
      ORDER BY sort_order ASC, published_at DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/posts/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published'`,
      [req.params.slug]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  EXTERNAL BLOG API  (token-auth, for agents / integrations)
// ════════════════════════════════════════════════════════════

// POST /api/blog/external/posts — Create a blog post via token
app.post('/api/blog/external/posts', requireToken, async (req, res) => {
  try {
    const {
      slug,
      title,
      subtitle,
      date,
      excerpt,
      category,
      read_time,
      author,
      author_bio,
      author_credential,
      author_expertise,
      image,
      content,
      status,
      sort_order,
      seo_title,
      seo_description,
      seo_og_image,
      canonical_url,
      focus_keyword,
    } = req.body;

    // Required fields
    if (!slug || !title || !content) {
      return res.status(400).json({
        error: 'Missing required fields: slug, title, content',
      });
    }

    // Basic slug validation
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({
        error: 'Invalid slug: use lowercase letters, numbers and hyphens only (e.g. my-blog-post)',
      });
    }

    const postStatus = ['published', 'draft'].includes(status) ? status : 'draft';
    const published_at = postStatus === 'published' ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO blog_posts (
        slug, title, subtitle, date, excerpt, category, read_time,
        author, author_bio, author_credential, author_expertise,
        image, content, status, sort_order,
        seo_title, seo_description, seo_og_image, canonical_url, focus_keyword,
        published_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id, slug, title, status, published_at, created_at`,
      [
        slug,
        title,
        subtitle || '',
        date || '',
        excerpt || '',
        category || '',
        read_time || '',
        author || '',
        author_bio || '',
        author_credential || '',
        Array.isArray(author_expertise) ? author_expertise : [],
        image || '',
        content,
        postStatus,
        sort_order || 0,
        seo_title || '',
        seo_description || '',
        seo_og_image || '',
        canonical_url || '',
        focus_keyword || '',
        published_at,
      ]
    );

    res.status(201).json({ success: true, post: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      // Unique constraint on slug
      return res.status(409).json({ error: `Slug already exists: ${req.body.slug}` });
    }
    console.error('External blog POST:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/blog/external/posts — List posts (published + draft) via token
app.get('/api/blog/external/posts', requireToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, slug, title, status, date, sort_order, published_at, updated_at
      FROM blog_posts
      ORDER BY sort_order ASC, published_at DESC NULLS LAST, created_at DESC
    `);
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  ERROR HANDLER
// ════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: `File upload error: ${err.message}` });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.get('/api/zip/:code', async (req, res) => {
  try {
    const code = req.params.code.replace(/\D/g, '');
    if (code.length !== 5) {
      return res.status(400).json({ success: false, error: 'Invalid zip code' });
    }
    const response = await fetch(`https://api.zippopotam.us/us/${code}`);
    if (!response.ok) {
      return res.status(404).json({ success: false, error: 'Zip code not found' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Zip lookup error:', err);
    res.status(500).json({ success: false, error: 'Zip lookup failed' });
  }
});

app.get('/api/resume/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT original_name, content_type, file_data FROM resumes WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    const { original_name, content_type, file_data } = result.rows[0];
    res.setHeader('Content-Type', content_type);
    res.setHeader('Content-Disposition', `inline; filename="${original_name}"`);
    res.send(file_data);
  } catch (err) {
    console.error('Resume fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  // Serve static assets from dist/client (hybrid mode)
  const clientDir = path.join(distDir, 'client');
  const hasClient = fs.existsSync(clientDir);
  app.use(express.static(hasClient ? clientDir : distDir));

  // Try to load Astro SSR middleware (hybrid mode)
  const ssrEntryServer = path.join(distDir, 'server', 'entry.mjs');
  const ssrEntryMiddleware = path.join(distDir, 'server', 'entry.mjs');
  let astroMiddleware = null;
  try {
    const ssrPath = fs.existsSync(ssrEntryServer) ? ssrEntryServer : null;
    if (ssrPath) {
      const { handler } = await import(pathToFileURL(ssrPath).href);
      astroMiddleware = handler;
    }
  } catch (e) {
    console.warn('Astro SSR middleware not loaded:', e.message);
  }

  if (astroMiddleware) {
    app.use(astroMiddleware);
  } else {
    // Fallback: static file serving
    app.get('/{*splat}', (req, res) => {
      const splatParam = req.params.splat;
      const reqPath = Array.isArray(splatParam) ? splatParam.join('/') : (splatParam || '');
      const base = hasClient ? clientDir : distDir;
      const htmlFile = path.join(base, reqPath, 'index.html');
      if (fs.existsSync(htmlFile)) return res.sendFile(htmlFile);
      const directFile = path.join(base, reqPath + '.html');
      if (fs.existsSync(directFile)) return res.sendFile(directFile);
      const indexFile = path.join(base, 'index.html');
      if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
      res.status(404).send('Not found');
    });
  }
}

const PORT = process.env.PORT || 3000;

initDatabase().then(async () => {
  await initGoogleSheets();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
