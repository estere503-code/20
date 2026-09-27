import { google } from 'googleapis';
import { env } from './env';

export async function syncTransaction(row: any) {
  const e = env();
  const normalized = e.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/\n/g, '\n').replace(/\r/g, '').trim();
  const match = normalized.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
  const privateKey = (match ? match[0] : normalized).trim();
  const auth = new google.auth.GoogleAuth({ credentials: { client_email: e.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: privateKey }, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const api = google.sheets({ version: 'v4', auth });
  const spreadsheetId = e.GOOGLE_SPREADSHEET_ID.split('/')[0];
  const tab = row.kind === 'sale' ? 'Sales' : 'Expenses';
  const values = row.kind === 'sale' ? [row.reference, row.created_at, row.employee?.name ?? row.employee, row.customer, row.project?.name ?? row.project, row.description, row.amount, JSON.stringify(row.proposed_split), JSON.stringify(row.approved_split ?? {}), JSON.stringify(row.commission_amounts ?? {}), row.status, row.sync_status] : [row.reference, row.created_at, row.employee?.name ?? row.employee, row.description, row.category, row.amount, row.proposed_allocation, row.approved_allocation ?? '', row.status, row.sync_status];
  const existing = await api.spreadsheets.values.get({ spreadsheetId, range: tab + '!A:A' });
  const index = (existing.data.values ?? []).findIndex((value: any[]) => value[0] === row.reference);
  if (index >= 0) await api.spreadsheets.values.update({ spreadsheetId, range: tab + '!A' + (index + 1) + ':' + String.fromCharCode(65 + values.length - 1) + (index + 1), valueInputOption: 'USER_ENTERED', requestBody: { values: [values] } });
  else await api.spreadsheets.values.append({ spreadsheetId, range: tab + '!A:Z', valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS', requestBody: { values: [values] } });
}
