require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, 'gmail_tokens.json');

async function testDrive() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  client.setCredentials(tokens);

  const drive = google.drive({ version: 'v3', auth: client });
  console.log('Testing Drive API...');
  
  try {
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 5
    });
    console.log('Success:', response.data.files);
  } catch (err) {
    console.error('API Error:', err.message);
    if (err.errors) console.error(err.errors);
  }
}

testDrive();
