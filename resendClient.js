import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FROM_ADDRESS = 'talent@enhance.work';
const TEAM_EMAIL   = 'talent@enhance.work';

function loadTemplate(filename) {
  const filePath = path.join(__dirname, 'src', 'emails', filename);
  return fs.readFileSync(filePath, 'utf8');
}

function fill(template, vars) {
  return Object.entries(vars).reduce((html, [key, val]) => {
    return html.replaceAll(`{{${key}}}`, val || '');
  }, template);
}

function formatRole(role) {
  return (role || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
}

// ── Send application confirmation to candidate ──────────────────────────────
export async function sendApplicationConfirmation({ firstName, lastName, email, role, appId, submittedAt }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] RESEND_API_KEY not set — skipping email');
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const html = fill(loadTemplate('application-confirmation.html'), {
      FIRST_NAME:    firstName,
      FULL_NAME:     `${firstName} ${lastName}`,
      EMAIL:         email,
      ROLE:          formatRole(role),
      APP_ID:        appId,
      SUBMITTED_AT:  formatDate(submittedAt),
    });

    const { data, error } = await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      email,
      subject: `Application received – Enhance.work`,
      html,
    });

    if (error) console.error('[Resend] Application confirmation error:', error);
    else console.log('[Resend] Application confirmation sent to', email, '| id:', data?.id);
    return data;
  } catch (err) {
    console.error('[Resend] Application confirmation exception:', err.message);
  }
}

// ── Send internal team notification for new application ─────────────────────
export async function sendApplicationNotification({ firstName, lastName, email, phone, role, appId, submittedAt, city, state, yearsExperience, utmSource }) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0}
      .w{max-width:560px;margin:0 auto;padding:24px 16px}
      .card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
      .top{background:#2bbcb0;padding:20px 28px}
      .top h2{color:#fff;font-size:18px;margin:0}
      .top p{color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0}
      .body{padding:24px 28px}
      .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:14px}
      .row:last-child{border:none}
      .label{color:#888}
      .val{font-weight:600;color:#1a2a26;text-align:right;max-width:320px}
      .badge{display:inline-block;background:#e4f7f6;color:#2bbcb0;border-radius:20px;padding:3px 12px;font-size:13px;font-weight:700}
    </style></head><body>
    <div class="w"><div class="card">
      <div class="top">
        <h2>New Application</h2>
        <p>Enhance.work &bull; ${formatDate(submittedAt)}</p>
      </div>
      <div class="body">
        <div class="row"><span class="label">Name</span><span class="val">${firstName} ${lastName}</span></div>
        <div class="row"><span class="label">Position</span><span class="val"><span class="badge">${formatRole(role)}</span></span></div>
        <div class="row"><span class="label">Email</span><span class="val"><a href="mailto:${email}" style="color:#2bbcb0">${email}</a></span></div>
        <div class="row"><span class="label">Phone</span><span class="val">${phone || '—'}</span></div>
        <div class="row"><span class="label">Location</span><span class="val">${[city, state].filter(Boolean).join(', ') || '—'}</span></div>
        <div class="row"><span class="label">Experience</span><span class="val">${yearsExperience || '—'} years</span></div>
        <div class="row"><span class="label">Source</span><span class="val">${utmSource || 'direct'}</span></div>
        <div class="row"><span class="label">App ID</span><span class="val" style="font-size:12px;color:#aaa">${appId}</span></div>
      </div>
    </div></div>
    </body></html>`;

    const { data, error } = await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      TEAM_EMAIL,
      subject: `New application: ${firstName} ${lastName} – ${formatRole(role)}`,
      html,
    });

    if (error) console.error('[Resend] Team notification error:', error);
    else console.log('[Resend] Team notification sent | id:', data?.id);
    return data;
  } catch (err) {
    console.error('[Resend] Team notification exception:', err.message);
  }
}

// ── Send purchase confirmation with PDF download link ───────────────────────
export async function sendPurchaseConfirmation({ email, firstName, downloadToken, purchaseDate }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] RESEND_API_KEY not set — skipping purchase email');
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const baseUrl = 'https://enhance.work';
    const downloadUrl = `${baseUrl}/api/stripe/download/${downloadToken}`;

    const html = fill(loadTemplate('purchase-confirmation.html'), {
      FIRST_NAME:    firstName || 'there',
      EMAIL:         email,
      DOWNLOAD_URL:  downloadUrl,
      PURCHASE_DATE: formatDate(purchaseDate),
    });

    const { data, error } = await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      email,
      subject: `Your South Florida Med Spa Directory is ready`,
      html,
    });

    if (error) console.error('[Resend] Purchase confirmation error:', error);
    else console.log('[Resend] Purchase confirmation sent to', email, '| id:', data?.id);
    return data;
  } catch (err) {
    console.error('[Resend] Purchase confirmation exception:', err.message);
  }
}
