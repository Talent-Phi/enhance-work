import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

let driveClient = null;
let resumeFolderId = null;

const FOLDER_NAME = 'Enhance.work Resumes';

function getDriveClient() {
  if (driveClient) return driveClient;
  const creds = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

async function getOrCreateFolder() {
  if (resumeFolderId) return resumeFolderId;
  const drive = getDriveClient();

  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (res.data.files && res.data.files.length > 0) {
    resumeFolderId = res.data.files[0].id;
    console.log(`[Google Drive] Found folder: ${FOLDER_NAME} (${resumeFolderId})`);
    return resumeFolderId;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  });

  resumeFolderId = folder.data.id;
  console.log(`[Google Drive] Created folder: ${FOLDER_NAME} (${resumeFolderId})`);
  return resumeFolderId;
}

export async function uploadResumeToDrive(filePath, originalName) {
  try {
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      console.log('[Google Drive] No credentials, skipping upload');
      return null;
    }

    const drive = getDriveClient();
    const folderId = await getOrCreateFolder();

    const ext = path.extname(originalName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${path.basename(originalName, ext)}_${timestamp}${ext}`;

    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId]
      },
      media: {
        mimeType: mimeTypes[ext.toLowerCase()] || 'application/octet-stream',
        body: fs.createReadStream(filePath)
      },
      fields: 'id, webViewLink'
    });

    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const fileLink = `https://drive.google.com/file/d/${res.data.id}/view`;
    console.log(`[Google Drive] Uploaded: ${fileName} → ${fileLink}`);

    fs.unlink(filePath, (err) => {
      if (err) console.warn('[Google Drive] Could not delete local file:', err.message);
    });

    return fileLink;
  } catch (err) {
    console.error('[Google Drive] Upload error:', err.message);
    return null;
  }
}

export async function initGoogleDrive() {
  try {
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      console.log('[Google Drive] No credentials found, skipping');
      return false;
    }
    await getOrCreateFolder();
    console.log('[Google Drive] Ready!');
    return true;
  } catch (err) {
    console.error('[Google Drive] Init error:', err.message);
    return false;
  }
}
