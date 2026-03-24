import express from 'express';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initGoogleSheets, appendApplicationRow, getSpreadsheetUrl } from './googleSheets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

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
    const allowed = ['.pdf', '.doc', '.docx'];
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
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Database initialized');
}

// ── Meta Conversions API (server-side) ──────────────────────────────────────
const META_PIXEL_ID   = '322421330936674';
const META_CAPI_TOKEN = 'EAALEAH8OJZCMBPGmzaGr2zdjJepi4PjX9rzmt6vgNZB6gekjG0XNqEBZAihdxCMH4x993DbCsQVjVRqvY2VuSFqok2BiARwOPWkdeZBcAaqqsFM9JXwdCCPJIzCZBTyfLdgj6C8BnpJWPJ5OZBZAXImC3tz30LHDWE4Kxx6muo29EuUui26Da8smT7Pm1cHpgZDZD';
const META_TEST_CODE  = 'TEST18883';

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

    const resumeFilename = req.file ? req.file.filename : null;

    const result = await pool.query(
      `INSERT INTO applications (
        role, first_name, last_name, gender, date_of_birth, email, phone,
        address1, address2, state, city, zip,
        language, language_level, language_other,
        language_2, language_level_2, language_3, language_level_3,
        language_4, language_level_4, language_5, language_level_5,
        licenses, license_other,
        years_experience, skills, start_date, employed,
        salary, pay_type, injector_msg_read, terms_agreed, resume_filename
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25,
        $26, $27, $28, $29,
        $30, $31, $32, $33, $34
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
        resumeFilename
      ]
    );

    const appId = result.rows[0].id;

    // Fire-and-forget: send to Zapier webhook (non-blocking, won't fail the response)
    // Field names match what Monday.com / Zapier mapping expects (Title Case)
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
      'Resume Filename':      resumeFilename || '',
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
      resume_filename: resumeFilename || ''
    }).catch(() => {});

    res.json({ success: true, id: appId });
  } catch (err) {
    console.error('Error saving application:', err);
    res.status(500).json({ success: false, error: 'Failed to save application' });
  }
});

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('/{*splat}', (req, res) => {
    const splatParam = req.params.splat;
    const reqPath = Array.isArray(splatParam) ? splatParam.join('/') : (splatParam || '');
    const htmlFile = path.join(distDir, reqPath, 'index.html');
    if (fs.existsSync(htmlFile)) {
      return res.sendFile(htmlFile);
    }
    const directFile = path.join(distDir, reqPath + '.html');
    if (fs.existsSync(directFile)) {
      return res.sendFile(directFile);
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
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
