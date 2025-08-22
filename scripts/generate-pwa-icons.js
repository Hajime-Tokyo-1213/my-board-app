const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// アイコンサイズの定義
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// ベースとなるSVGアイコン
const baseSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#667eea"/>
  <circle cx="256" cy="200" r="80" fill="white"/>
  <rect x="176" y="300" width="160" height="120" rx="10" fill="white"/>
  <rect x="156" y="340" width="200" height="10" rx="5" fill="#667eea"/>
  <rect x="156" y="365" width="200" height="10" rx="5" fill="#667eea"/>
  <rect x="156" y="390" width="150" height="10" rx="5" fill="#667eea"/>
</svg>
`;

// publicディレクトリのパス
const publicDir = path.join(__dirname, '..', 'public');

// アイコン生成関数
async function generateIcons() {
  try {
    // 各サイズのアイコンを生成
    for (const size of sizes) {
      await sharp(Buffer.from(baseSvg))
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `icon-${size}x${size}.png`));
      
      console.log(`✓ Generated icon-${size}x${size}.png`);
    }

    // スクリーンショット用のプレースホルダー画像も生成
    const screenshotSvg = `
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
        <rect width="1080" height="1920" fill="#f3f4f6"/>
        <rect x="0" y="0" width="1080" height="80" fill="#667eea"/>
        <text x="540" y="50" font-family="Arial" font-size="30" fill="white" text-anchor="middle">Board App</text>
        <rect x="40" y="120" width="1000" height="200" rx="10" fill="white"/>
        <rect x="40" y="360" width="1000" height="200" rx="10" fill="white"/>
        <rect x="40" y="600" width="1000" height="200" rx="10" fill="white"/>
      </svg>
    `;

    // スクリーンショット1
    await sharp(Buffer.from(screenshotSvg))
      .png()
      .toFile(path.join(publicDir, 'screenshot-1.png'));
    console.log('✓ Generated screenshot-1.png');

    // スクリーンショット2（少し違うデザイン）
    const screenshotSvg2 = `
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
        <rect width="1080" height="1920" fill="#f3f4f6"/>
        <rect x="0" y="0" width="1080" height="80" fill="#667eea"/>
        <text x="540" y="50" font-family="Arial" font-size="30" fill="white" text-anchor="middle">新規投稿</text>
        <rect x="40" y="120" width="1000" height="400" rx="10" fill="white"/>
        <circle cx="120" cy="200" r="40" fill="#e5e7eb"/>
        <rect x="200" y="180" width="800" height="20" rx="10" fill="#e5e7eb"/>
        <rect x="200" y="220" width="600" height="20" rx="10" fill="#e5e7eb"/>
      </svg>
    `;

    await sharp(Buffer.from(screenshotSvg2))
      .png()
      .toFile(path.join(publicDir, 'screenshot-2.png'));
    console.log('✓ Generated screenshot-2.png');

    console.log('\n✅ All PWA assets generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

// 実行
generateIcons();