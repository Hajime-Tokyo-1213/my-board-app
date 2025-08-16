import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

// さくらインターネットのメールサーバー用トランスポーター設定
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'teqham.sakura.ne.jp',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // STARTTLS使用（ポート587）
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    tls: {
      // 本番環境では true、開発環境では false
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      minVersion: 'TLSv1.2', // TLS 1.2以上を強制（セキュリティ対策）
    },
  });
};

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const transporter = createTransporter();
    
    const mailOptions: Mail.Options = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@teqham.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: process.env.EMAIL_REPLY_TO || process.env.SMTP_USER,
      headers: {
        'X-Mailer': 'Board App Mailer',
        'X-Priority': '3',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}?subject=unsubscribe>`,
      },
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent: ${info.messageId} to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    return { success: true, data: { id: info.messageId, response: info.response } };
    
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">メールアドレスの確認</h2>
      <p>ご登録ありがとうございます。</p>
      <p>以下のボタンをクリックして、メールアドレスを確認してください：</p>
      <div style="margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #007bff; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          メールアドレスを確認
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        このリンクは24時間有効です。<br>
        ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：
      </p>
      <p style="color: #666; font-size: 12px; word-break: break-all;">
        ${verificationUrl}
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: '【会員制掲示板】メールアドレスの確認',
    html,
    text: `メールアドレスの確認\n\n以下のURLにアクセスして、メールアドレスを確認してください：\n${verificationUrl}\n\nこのリンクは24時間有効です。`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">パスワードリセット</h2>
      <p>パスワードリセットのリクエストを受け付けました。</p>
      <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
      <div style="margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #dc3545; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          パスワードをリセット
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        このリンクは1時間有効です。<br>
        心当たりがない場合は、このメールを無視してください。
      </p>
      <p style="color: #666; font-size: 12px; word-break: break-all;">
        ${resetUrl}
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: '【会員制掲示板】パスワードリセット',
    html,
    text: `パスワードリセット\n\n以下のURLにアクセスして、新しいパスワードを設定してください：\n${resetUrl}\n\nこのリンクは1時間有効です。`,
  });
}

export async function sendSystemNotification(
  email: string | string[], 
  subject: string, 
  message: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">システム通知</h2>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        このメールは会員制掲示板システムから自動送信されています。
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `【会員制掲示板】${subject}`,
    html,
    text: `システム通知\n\n${message}\n\nこのメールは会員制掲示板システムから自動送信されています。`,
  });
}

export async function sendNewPostNotification(
  emails: string[], 
  postTitle: string, 
  authorName: string
) {
  const postUrl = `${process.env.NEXT_PUBLIC_APP_URL}/posts`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">新着投稿のお知らせ</h2>
      <p>${authorName}さんが新しい投稿をしました。</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #007bff;">${postTitle}</h3>
      </div>
      <div style="margin: 30px 0;">
        <a href="${postUrl}" 
           style="background-color: #28a745; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          投稿を見る
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: emails,
    subject: `【会員制掲示板】新着投稿: ${postTitle}`,
    html,
    text: `新着投稿のお知らせ\n\n${authorName}さんが新しい投稿をしました。\n\nタイトル: ${postTitle}\n\n投稿を見る: ${postUrl}`,
  });
}