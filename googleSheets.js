import { google } from 'googleapis';

let sheetsClient = null;

const SPREADSHEET_ID = '1IZfyGQ196Guw-vh7aHZwG-v1zV889tVaRwV72gQjXlY';
const SHEET_NAME = 'Sheet1';

const HEADERS = [
  'Application ID', 'Submitted At',
  'First Name', 'Last Name', 'Email', 'Phone', 'Gender', 'Date of Birth',
  'Role',
  'Address', 'Apt / Suite', 'City', 'State', 'Zip Code',
  'Language', 'Language Level',
  'Language 2', 'Language Level 2',
  'Language 3', 'Language Level 3',
  'Language 4', 'Language Level 4',
  'Language 5', 'Language Level 5',
  'Licenses', 'License (Other)',
  'Years of Experience', 'Skills',
  'Start Date', 'Currently Employed',
  'Salary Expectations', 'Salary Type',
  'Resume Filename',
  'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Term', 'UTM Content'
];

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const creds = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export async function initGoogleSheets() {
  try {
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      console.log('[Google Sheets] No credentials found, skipping initialization');
      return false;
    }

    const sheets = getSheetsClient();

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:AL1`
    });

    const firstRow = existing.data.values?.[0] || [];
    if (firstRow.length === 0 || firstRow[0] !== HEADERS[0]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] }
      });
      console.log('[Google Sheets] Headers written');
    }

    console.log(`[Google Sheets] Ready! URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
    return true;
  } catch (err) {
    console.error('[Google Sheets] Initialization error:', err.message);
    return false;
  }
}

export async function appendApplicationRow(data) {
  try {
    const sheets = getSheetsClient();

    const row = [
      data.appId || '',
      data.submittedAt || new Date().toISOString(),
      data.first_name || '',
      data.last_name || '',
      data.email || '',
      data.phone ? `'${data.phone}` : '',
      data.gender || '',
      data.dob || '',
      data.role || '',
      data.address1 || '',
      data.address2 || '',
      data.city || '',
      data.state || '',
      data.zip || '',
      data.language || '',
      data.language_level || '',
      data.language_2 || '',
      data.language_level_2 || '',
      data.language_3 || '',
      data.language_level_3 || '',
      data.language_4 || '',
      data.language_level_4 || '',
      data.language_5 || '',
      data.language_level_5 || '',
      data.licenses || '',
      data.license_other || '',
      data.years_experience || '',
      data.skills || '',
      data.start_date || '',
      data.employed || '',
      data.salary || '',
      data.pay_type || '',
      data.resume_filename
        ? `=HYPERLINK("${data.resume_filename}","View Resume")`
        : '',
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      data.utm_term || '',
      data.utm_content || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:AL`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    console.log(`[Google Sheets] Row appended for application ${data.appId}`);
    return true;
  } catch (err) {
    console.error('[Google Sheets] Error appending row:', err.message);
    return false;
  }
}

export async function getSpreadsheetUrl() {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;
}
