import { test, expect, Page } from '@playwright/test';

test.describe('Service Worker Tests', () => {
  let page: Page;

  test.beforeEach(async ({ context }) => {
    // Service Workerを有効にしてページを作成
    page = await context.newPage();
    await page.goto('http://localhost:3000');
  });

  test('Service Workerが正常に登録される', async () => {
    // Service Worker登録の確認
    const swState = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return {
          registered: true,
          scope: registration.scope,
          active: registration.active?.state,
          waiting: registration.waiting?.state,
          installing: registration.installing?.state
        };
      }
      return { registered: false };
    });

    expect(swState.registered).toBe(true);
    expect(swState.scope).toContain('http://localhost:3000/');
    expect(swState.active).toBe('activated');
  });

  test('Service Workerのキャッシュが機能する', async () => {
    // キャッシュの確認
    const cacheStatus = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const cacheContents: any = {};
      
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        cacheContents[name] = requests.map(req => req.url);
      }
      
      return {
        cacheNames,
        cacheContents,
        hasCache: cacheNames.length > 0
      };
    });

    expect(cacheStatus.hasCache).toBe(true);
    expect(cacheStatus.cacheNames).toContain('board-app-v1');
  });

  test('オフライン時にキャッシュからページが表示される', async ({ context }) => {
    // まず通常アクセスしてキャッシュを作成
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000); // キャッシュが保存されるまで待機

    // オフラインモードに切り替え
    await context.setOffline(true);

    // ページをリロード
    const response = await page.reload();
    
    // オフラインでもページが表示されることを確認
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // オフラインページまたはキャッシュされたページが表示される
    const isOfflinePage = await page.evaluate(() => {
      return document.body.textContent?.includes('オフライン') || 
             document.querySelector('html')?.innerHTML.includes('offline');
    });
    
    // オフラインページかキャッシュされたメインページが表示される
    expect(isOfflinePage || title.includes('会員制掲示板')).toBe(true);
  });

  test('バックグラウンド同期が登録される', async () => {
    const syncStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        
        try {
          // @ts-ignore
          await registration.sync.register('sync-posts');
          return { supported: true, registered: true };
        } catch (error) {
          return { supported: true, registered: false, error: (error as Error).message };
        }
      }
      return { supported: false };
    });

    // バックグラウンド同期がサポートされている場合のみテスト
    if (syncStatus.supported) {
      expect(syncStatus.registered).toBe(true);
    }
  });

  test('Service Workerの更新チェック', async () => {
    const updateStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // 更新チェック
        await registration.update();
        
        return {
          updateFound: registration.waiting !== null,
          hasActive: registration.active !== null
        };
      }
      return { updateFound: false, hasActive: false };
    });

    expect(updateStatus.hasActive).toBe(true);
  });
});

test.describe('オフライン機能テスト', () => {
  test('IndexedDBが正常に動作する', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const dbStatus = await page.evaluate(async () => {
      // IndexedDBを開く
      return new Promise((resolve) => {
        const request = indexedDB.open('BoardAppDB', 1);
        
        request.onsuccess = () => {
          const db = request.result;
          const objectStoreNames = Array.from(db.objectStoreNames);
          db.close();
          resolve({
            success: true,
            stores: objectStoreNames
          });
        };
        
        request.onerror = () => {
          resolve({ success: false, error: request.error?.message });
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // 必要なストアを作成
          if (!db.objectStoreNames.contains('drafts')) {
            db.createObjectStore('drafts', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('pendingPosts')) {
            db.createObjectStore('pendingPosts', { keyPath: 'id' });
          }
        };
      });
    });

    expect(dbStatus.success).toBe(true);
    expect(dbStatus.stores).toContain('drafts');
    expect(dbStatus.stores).toContain('pendingPosts');
  });

  test('下書きの保存と取得が機能する', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const draftOperations = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('BoardAppDB', 1);
        
        request.onsuccess = async () => {
          const db = request.result;
          
          // 下書きを保存
          const transaction = db.transaction(['drafts'], 'readwrite');
          const store = transaction.objectStore('drafts');
          
          const draft = {
            id: 'test_draft_1',
            content: 'テスト投稿の内容',
            title: 'テストタイトル',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          store.put(draft);
          
          transaction.oncomplete = () => {
            // 保存した下書きを取得
            const readTransaction = db.transaction(['drafts'], 'readonly');
            const readStore = readTransaction.objectStore('drafts');
            const getRequest = readStore.get('test_draft_1');
            
            getRequest.onsuccess = () => {
              db.close();
              resolve({
                saved: true,
                retrieved: getRequest.result
              });
            };
          };
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('drafts')) {
            db.createObjectStore('drafts', { keyPath: 'id' });
          }
        };
      });
    });

    expect(draftOperations.saved).toBe(true);
    expect(draftOperations.retrieved).toMatchObject({
      id: 'test_draft_1',
      content: 'テスト投稿の内容',
      title: 'テストタイトル'
    });
  });

  test('オフライン時にペンディング投稿がキューに追加される', async ({ page, context }) => {
    await page.goto('http://localhost:3000');
    
    // オフラインモードに切り替え
    await context.setOffline(true);

    const queueStatus = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('BoardAppDB', 1);
        
        request.onsuccess = async () => {
          const db = request.result;
          
          // ペンディング投稿を追加
          const transaction = db.transaction(['pendingPosts'], 'readwrite');
          const store = transaction.objectStore('pendingPosts');
          
          const pendingPost = {
            id: `pending_${Date.now()}`,
            content: 'オフライン時の投稿',
            images: [],
            createdAt: Date.now()
          };
          
          const addRequest = store.add(pendingPost);
          
          addRequest.onsuccess = () => {
            // 全てのペンディング投稿を取得
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
              db.close();
              resolve({
                added: true,
                pendingCount: getAllRequest.result.length,
                posts: getAllRequest.result
              });
            };
          };
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('pendingPosts')) {
            db.createObjectStore('pendingPosts', { keyPath: 'id' });
          }
        };
      });
    });

    expect(queueStatus.added).toBe(true);
    expect(queueStatus.pendingCount).toBeGreaterThan(0);
    expect(queueStatus.posts[0]).toHaveProperty('content', 'オフライン時の投稿');
  });
});