import express from 'express';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
        language, language_level, language_other, licenses, license_other,
        years_experience, skills, start_date, employed,
        salary, pay_type, injector_msg_read, terms_agreed, resume_filename
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26
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
    const zapPayload = {
      // --- Identity ---
      first_name:       data.first_name,
      last_name:        data.last_name,
      email:            data.email,
      phone:            data.phone || '',
      gender:           data.gender || '',
      date_of_birth:    dob || '',
      // --- Position ---
      role:             data.role,
      // --- Address ---
      address:          data.address1 || '',
      apt_suite:        data.address2 || '',
      city:             data.city || '',
      state:            data.state || '',
      zip:              data.zip || '',
      // --- Competences ---
      language:         data.language || '',
      language_level:   data.language_level || '',
      language_other:   data.language_other || '',
      language_2:       data.language_2 || '',
      language_level_2: data.language_level_2 || '',
      language_3:       data.language_3 || '',
      language_level_3: data.language_level_3 || '',
      language_4:       data.language_4 || '',
      language_level_4: data.language_level_4 || '',
      licenses:         licenses.join(', '),
      license_other:    data.license_other || '',
      // --- Experience ---
      years_experience: data.years_experience || '',
      skills:           skills.join(', '),
      start_date:       data.start_date || '',
      employed:         data.employed || '',
      // --- Salary / Resume ---
      salary:           data.salary || '',
      pay_type:         data.pay_type || '',
      resume_filename:  resumeFilename || '',
      // --- Meta ---
      application_id:   appId,
      submitted_at:     new Date().toISOString(),
      form_name:        'Enhance.work Application',
      page_url:         'https://enhance.work',
    };

    fetch('https://hooks.zapier.com/hooks/catch/12621312/37nxjvq/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zapPayload),
    }).catch(err => console.error('[Zapier] Webhook error:', err.message));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;

initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
