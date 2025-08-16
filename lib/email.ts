import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

// SMTPトランスポーターの作成
const createTransporter = (): Transporter | any => {
  // SMTP設定が存在しない場合のみモックを使用
  if (!process.env.SMTP_HOST) {
    console.log('⚠️ SMTP設定が見つかりません。開発モードで動作します。');
    return {
      sendMail: async (mailOptions: any) => {
        console.log('📧 Development Mode - Email would be sent:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Preview URL will be logged here in production');
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }

  // 実際のSMTPトランスポーターを作成
  console.log('📮 SMTP設定を使用してメール送信を設定中...');
  return createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // 自己署名証明書を許可
    },
  });
};

const transporter = createTransporter();

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    console.log(`📧 メール送信中: ${to}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@boardapp.com',
      to,
      subject,
      html,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ メール送信成功:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ メール送信エラー:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    return { success: false, error };
  }
}

export function generateVerificationEmail(name: string, verificationUrl: string) {
  return {
    subject: '【会員制掲示板】メールアドレスの確認',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1976d2; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">会員制掲示板</h1>
        </div>
        <div style="border: 1px solid #e0e0e0; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">メールアドレスの確認</h2>
          <p>こんにちは、${name}さん</p>
          <p>会員制掲示板へのご登録ありがとうございます。</p>
          <p>以下のボタンをクリックして、メールアドレスを確認してください：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              メールアドレスを確認
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">このリンクは24時間有効です。</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">このメールに心当たりがない場合は、無視してください。</p>
        </div>
      </div>
    `,
  };
}

export function generatePasswordResetEmail(name: string, resetUrl: string) {
  return {
    subject: '【会員制掲示板】パスワードリセット',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1976d2; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">会員制掲示板</h1>
        </div>
        <div style="border: 1px solid #e0e0e0; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">パスワードリセット</h2>
          <p>こんにちは、${name}さん</p>
          <p>パスワードリセットのリクエストを受け付けました。</p>
          <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              パスワードをリセット
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">このリンクは1時間有効です。</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">パスワードリセットをリクエストしていない場合は、このメールを無視してください。</p>
        </div>
      </div>
    `,
  };
}