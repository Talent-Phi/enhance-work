import { google } from 'googleapis';

let sheetsClient = null;
let driveClient = null;
let spreadsheetId = null;

const SPREADSHEET_TITLE = 'enhance work candidate registration';

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
  'Resume Filename'
];

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });
}

async function getClients() {
  if (sheetsClient && driveClient) return { sheets: sheetsClient, drive: driveClient };
  const auth = getAuth();
  sheetsClient = google.sheets({ version: 'v4', auth });
  driveClient = google.drive({ version: 'v3', auth });
  return { sheets: sheetsClient, drive: driveClient };
}

async function findOrCreateSpreadsheet() {
  if (spreadsheetId) return spreadsheetId;

  const { sheets, drive } = await getClients();

  const searchRes = await drive.files.list({
    q: `name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    spreadsheetId = searchRes.data.files[0].id;
    console.log(`[Google Sheets] Found existing spreadsheet: ${spreadsheetId}`);
  } else {
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: SPREADSHEET_TITLE },
        sheets: [{
          properties: { title: 'Applications', index: 0 }
        }]
      }
    });
    spreadsheetId = createRes.data.spreadsheetId;
    console.log(`[Google Sheets] Created new spreadsheet: ${spreadsheetId}`);

    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'anyone'
      }
    });
    console.log(`[Google Sheets] Set spreadsheet to publicly accessible (anyone with link can edit)`);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Applications!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] }
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.95, blue: 0.9 }
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)'
          }
        }, {
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
          }
        }]
      }
    });
    console.log(`[Google Sheets] Headers and formatting applied`);
  }

  return spreadsheetId;
}

export async function appendApplicationRow(data) {
  try {
    const { sheets } = await getClients();
    const ssId = await findOrCreateSpreadsheet();

    const row = [
      data.appId || '',
      data.submittedAt || new Date().toISOString(),
      data.first_name || '',
      data.last_name || '',
      data.email || '',
      data.phone || '',
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
      data.resume_filename || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: ssId,
      range: 'Applications!A:AG',
      valueInputOption: 'RAW',
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
  try {
    const ssId = await findOrCreateSpreadsheet();
    return `https://docs.google.com/spreadsheets/d/${ssId}`;
  } catch (err) {
    console.error('[Google Sheets] Error getting URL:', err.message);
    return null;
  }
}

export async function initGoogleSheets() {
  try {
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      console.log('[Google Sheets] No credentials found, skipping initialization');
      return false;
    }
    const ssId = await findOrCreateSpreadsheet();
    const url = `https://docs.google.com/spreadsheets/d/${ssId}`;
    console.log(`[Google Sheets] Ready! Spreadsheet URL: ${url}`);
    return true;
  } catch (err) {
    console.error('[Google Sheets] Initialization error:', err.message);
    return false;
  }
}
