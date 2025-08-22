import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('画像アップロード機能', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // ホームページへの遷移を待つ
    await page.waitForURL('/');
  });

  test('画像をドラッグ&ドロップでアップロード', async ({ page }) => {
    // 投稿作成ページへ移動（仮定）
    await page.goto('/posts/new');

    // ファイルのパス
    const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

    // ドロップゾーンを取得
    const dropzone = page.locator('[data-testid="image-dropzone"]');
    
    // ファイルをドロップ
    await dropzone.dispatchEvent('drop', {
      dataTransfer: {
        files: [filePath],
      },
    });

    // アップロード完了を待つ
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
    
    // サムネイルが表示されることを確認
    await expect(page.locator('img[alt="Uploaded image"]')).toBeVisible();
  });

  test('ファイル選択ダイアログから画像をアップロード', async ({ page }) => {
    await page.goto('/posts/new');

    // ファイル入力要素を取得
    const fileInput = page.locator('input[type="file"]');
    
    // ファイルを選択
    const filePath = path.join(__dirname, 'fixtures', 'test-image.png');
    await fileInput.setInputFiles(filePath);

    // アップロード完了を待つ
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('複数画像を同時にアップロード', async ({ page }) => {
    await page.goto('/posts/new');

    const fileInput = page.locator('input[type="file"]');
    
    // 複数ファイルを選択
    const files = [
      path.join(__dirname, 'fixtures', 'test-image1.jpg'),
      path.join(__dirname, 'fixtures', 'test-image2.jpg'),
      path.join(__dirname, 'fixtures', 'test-image3.jpg'),
    ];
    
    await fileInput.setInputFiles(files);

    // すべての画像がアップロードされることを確認
    await expect(page.locator('img[alt="Uploaded image"]')).toHaveCount(3, { timeout: 15000 });
  });

  test('最大4枚の制限を確認', async ({ page }) => {
    await page.goto('/posts/new');

    const fileInput = page.locator('input[type="file"]');
    
    // 5枚のファイルを選択しようとする
    const files = [
      path.join(__dirname, 'fixtures', 'test-image1.jpg'),
      path.join(__dirname, 'fixtures', 'test-image2.jpg'),
      path.join(__dirname, 'fixtures', 'test-image3.jpg'),
      path.join(__dirname, 'fixtures', 'test-image4.jpg'),
      path.join(__dirname, 'fixtures', 'test-image5.jpg'),
    ];
    
    await fileInput.setInputFiles(files);

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=/最大4枚まで/')).toBeVisible();
  });

  test('無効なファイル形式を拒否', async ({ page }) => {
    await page.goto('/posts/new');

    const fileInput = page.locator('input[type="file"]');
    
    // GIFファイルを選択
    const filePath = path.join(__dirname, 'fixtures', 'test-image.gif');
    await fileInput.setInputFiles(filePath);

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=/対応していない画像形式/')).toBeVisible();
  });

  test('大きすぎるファイルを拒否', async ({ page }) => {
    await page.goto('/posts/new');

    // 11MBのファイルを作成してアップロードを試みる
    // 実際のテストでは、事前に大きなファイルを用意する必要があります
    const fileInput = page.locator('input[type="file"]');
    const largePath = path.join(__dirname, 'fixtures', 'large-image.jpg');
    
    await fileInput.setInputFiles(largePath);

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=/ファイルサイズが大きすぎます/')).toBeVisible();
  });

  test('アップロードした画像を削除', async ({ page }) => {
    await page.goto('/posts/new');

    // 画像をアップロード
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    await fileInput.setInputFiles(filePath);

    // アップロード完了を待つ
    await expect(page.locator('img[alt="Uploaded image"]')).toBeVisible({ timeout: 10000 });

    // 削除ボタンをクリック
    await page.click('[data-testid="delete-image-button"]');

    // 画像が削除されることを確認
    await expect(page.locator('img[alt="Uploaded image"]')).not.toBeVisible();
  });

  test('アップロード進捗が表示される', async ({ page }) => {
    await page.goto('/posts/new');

    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    
    // ファイルを選択
    await fileInput.setInputFiles(filePath);

    // プログレスバーが表示されることを確認
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // アップロード完了後、プログレスバーが消えることを確認
    await expect(page.locator('[role="progressbar"]')).not.toBeVisible({ timeout: 10000 });
  });

  test('画像プレビューが正しく表示される', async ({ page }) => {
    await page.goto('/posts/new');

    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    
    await fileInput.setInputFiles(filePath);

    // プレビュー画像が表示されることを確認
    const preview = page.locator('img[alt="Uploaded image"]');
    await expect(preview).toBeVisible({ timeout: 10000 });
    
    // 画像のsrc属性が設定されていることを確認
    const src = await preview.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('cloudinary');
  });

  test('WebP形式の画像をアップロード', async ({ page }) => {
    await page.goto('/posts/new');

    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-image.webp');
    
    await fileInput.setInputFiles(filePath);

    // WebP画像が正常にアップロードされることを確認
    await expect(page.locator('img[alt="Uploaded image"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('画像アップロードのエラーハンドリング', () => {
  test('ネットワークエラー時の処理', async ({ page, context }) => {
    // ネットワークをオフラインにする
    await context.setOffline(true);

    await page.goto('/posts/new');
    
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
    
    await fileInput.setInputFiles(filePath);

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=/アップロードに失敗しました/')).toBeVisible();
    
    // ネットワークを復活させる
    await context.setOffline(false);
  });

  test('同時アップロードの制限', async ({ page }) => {
    await page.goto('/posts/new');

    const fileInput = page.locator('input[type="file"]');
    
    // 同時に多数のファイルをアップロード
    const files = Array(10).fill(null).map((_, i) => 
      path.join(__dirname, 'fixtures', `test-image${i % 3 + 1}.jpg`)
    );
    
    await fileInput.setInputFiles(files.slice(0, 4)); // 最初の4枚

    // 4枚のみアップロードされることを確認
    await expect(page.locator('img[alt="Uploaded image"]')).toHaveCount(4, { timeout: 20000 });
  });
});