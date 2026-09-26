import { google } from 'googleapis';
import { env } from './env';
export async function syncTransaction(row: Record<string, unknown>, tab: 'Sales'|'Expenses') {
  const e=env(); const auth=new google.auth.GoogleAuth({credentials:{client_email:e.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key:e.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n')}, scopes:['https://www.googleapis.com/auth/spreadsheets']});
  const sheets=google.sheets({version:'v4',auth}); const values=[[row.reference,row.created_at,row.employee,row.project,row.amount,row.description,row.status,row.commission]];
  const existing=await sheets.spreadsheets.values.get({spreadsheetId:e.GOOGLE_SPREADSHEET_ID.split('/')[0],range:`${tab}!A:A`}); const index=(existing.data.values??[]).findIndex(v=>v[0]===row.reference);
  if(index>=0) await sheets.spreadsheets.values.update({spreadsheetId:e.GOOGLE_SPREADSHEET_ID.split('/')[0],range:`${tab}!A${index+1}:H${index+1}`,valueInputOption:'USER_ENTERED',requestBody:{values}});
  else await sheets.spreadsheets.values.append({spreadsheetId:e.GOOGLE_SPREADSHEET_ID.split('/')[0],range:`${tab}!A:H`,valueInputOption:'USER_ENTERED',insertDataOption:'INSERT_ROWS',requestBody:{values}});
}
