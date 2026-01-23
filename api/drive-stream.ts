import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const fileId = String(req.query.fileId || '');
    if (!fileId) {
      return res.status(400).send('Missing fileId');
    }

    const clientEmail = process.env.GOOGLE_DRIVE_SA_EMAIL!;
    let privateKey = process.env.GOOGLE_DRIVE_SA_PRIVATE_KEY!;
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const range = req.headers.range;
    const driveRes = await drive.files.get(
      { fileId, alt: 'media' },
      {
        responseType: 'stream',
        headers: range ? { Range: range } : undefined,
      }
    );

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    driveRes.data.pipe(res);
  } catch (err: any) {
    console.error('[drive-stream]', err?.message);
    res.status(500).send('Drive stream failed');
  }
}
