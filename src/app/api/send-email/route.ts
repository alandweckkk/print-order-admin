import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Gmail API credentials - exact same as Retool project
const CLIENT_ID = '378700779677-0dv6gr7p4gt6eh8rig9kupjqajgnirq3.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000';
const REFRESH_TOKEN = '1//06FLP4kWT8EANCgYIARAAGAYSNwF-L9IrImpx9RiS348S3rY62f2zqXBARnbpTS6HaXcEu5XIpI9hetjBQdtDOnZbPNQiSq0x1f0';

// Configure OAuth2 client
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Create base64 encoded email
async function createEmailWithAttachments(to: string, subject: string, message: string, attachments: {filename: string, content: Buffer, mimeType: string}[]) {
  // Create Gmail-style boundaries
  const outerBoundary = '000000000000' + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
  const innerBoundary = '000000000000' + Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
  
  const emailLines = [];
  emailLines.push(`To: ${to}`);
  emailLines.push('MIME-Version: 1.0');
  emailLines.push(`Subject: ${subject}`);
  emailLines.push(`Content-Type: multipart/mixed; boundary="${outerBoundary}"`);
  emailLines.push('');
  
  // Start nested structure - multipart/alternative for text versions
  emailLines.push(`--${outerBoundary}`);
  emailLines.push(`Content-Type: multipart/alternative; boundary="${innerBoundary}"`);
  emailLines.push('');
  
  // Plain text version
  emailLines.push(`--${innerBoundary}`);
  emailLines.push('Content-Type: text/plain; charset="UTF-8"');
  emailLines.push('Content-Transfer-Encoding: quoted-printable');
  emailLines.push('');
  
  // Convert message to quoted-printable (basic implementation)
  const quotedPrintableMessage = message
    .replace(/=/g, '=3D')
    .replace(/[^\x20-\x7E]/g, (char) => {
      const hex = char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
      return `=C2=${hex}`;
    });
  
  emailLines.push(quotedPrintableMessage);
  emailLines.push('');
  
  // HTML version (convert line breaks to <br>)
  emailLines.push(`--${innerBoundary}`);
  emailLines.push('Content-Type: text/html; charset="UTF-8"');
  emailLines.push('Content-Transfer-Encoding: quoted-printable');
  emailLines.push('');
  
  const htmlMessage = `<div dir="ltr">${message.replace(/\n/g, '<br>')}</div>`;
  const quotedPrintableHtml = htmlMessage
    .replace(/=/g, '=3D')
    .replace(/[^\x20-\x7E]/g, (char) => {
      const hex = char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
      return `=C2=${hex}`;
    });
  
  emailLines.push(quotedPrintableHtml);
  emailLines.push('');
  
  // Close inner boundary
  emailLines.push(`--${innerBoundary}--`);
  
  // Add attachments
  for (const att of attachments) {
    emailLines.push(`--${outerBoundary}`);
    emailLines.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
    emailLines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    emailLines.push('Content-Transfer-Encoding: base64');
    emailLines.push('');
    emailLines.push(att.content.toString('base64').replace(/(.{76})/g, '$1\r\n'));
    emailLines.push('');
  }
  
  // Close outer boundary
  emailLines.push(`--${outerBoundary}--`);
  emailLines.push('');
  return Buffer.from(emailLines.join('\r\n')).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Send email function with attachments
async function sendGmailWithAttachments(to: string, subject: string, message: string, attachments: {filename: string, content: Buffer, mimeType: string}[]) {
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  const raw = await createEmailWithAttachments(to, subject, message, attachments);
  return gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const receiver = formData.get('receiver') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const attachmentFile = formData.get('attachment') as File | null;
    
    console.log('📧 Email send request:', { receiver, subject, message, hasAttachment: !!attachmentFile });
    
    // Check if all required fields are provided
    if (!receiver || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prepare attachments
    const emailAttachments = [];
    
    // Handle file attachment
    if (attachmentFile && attachmentFile.size > 0) {
      try {
        console.log(`📎 Processing attachment: ${attachmentFile.name} (${attachmentFile.size} bytes)`);
        const buffer = Buffer.from(await attachmentFile.arrayBuffer());
        emailAttachments.push({
          filename: attachmentFile.name,
          content: buffer,
          mimeType: attachmentFile.type || 'image/png',
        });
        console.log(`✅ Attachment processed successfully`);
      } catch (e) {
        console.error('❌ Error processing attachment:', e);
        return NextResponse.json({ error: 'Failed to process attachment' }, { status: 400 });
      }
    }
    
    console.log(`📤 Sending email to ${receiver} with ${emailAttachments.length} attachment(s)`);
    
    // Send email with attachments
    const response = await sendGmailWithAttachments(receiver, subject, message, emailAttachments);
    
    console.log('✅ Email sent successfully, Message ID:', response.data.id);
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      messageId: response.data.id,
      attachments: emailAttachments.length 
    });
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
} 