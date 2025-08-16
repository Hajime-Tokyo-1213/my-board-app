# 天才キャラ会議：テスト改善戦略

## 参加者
1. **シャーロック・ホームズ** - 分析と問題解決の専門家
2. **トニー・スターク** - 技術とエンジニアリングの天才
3. **ハーマイオニー・グレンジャー** - 詳細と正確性の追求者
4. **L（エル）** - 戦略的思考と論理的推論の達人

---

## 現状分析

### シャーロック：「興味深い。32.15%のカバレッジ、69件の失敗テスト。パターンが見える」

```
失敗の主要因：
1. APIルートのテスト環境問題（jsdom vs node）
2. Mongooseモックの不完全な実装
3. 非同期処理のタイミング問題
4. Next.js 15の新機能への対応不足
```

### トニー：「技術的な解決策はすべて存在する。実装の問題だ」

```javascript
// 問題1: jest-environment の混在
// 解決: テストファイルごとに環境を指定
/**
 * @jest-environment node
 */
// APIルートテスト用

/**
 * @jest-environment jsdom
 */
// コンポーネントテスト用
```

### ハーマイオニー：「段階的アプローチが必要です」

1. **Phase 1**: 失敗テストの修正（優先度：高）
2. **Phase 2**: E2Eテストの実装（Playwright）
3. **Phase 3**: CI/CD設定の追加
4. **Phase 4**: カバレッジ70%達成

### L：「確率的に最も効率的な順序は...」

```
1. Mongooseモックの完全実装（影響範囲：大）
2. テスト環境の分離（根本的解決）
3. E2Eテストによるカバレッジ補完
4. CI/CDによる自動化
```

---

## 実装計画

### 1. Mongooseモックの改善（シャーロック案）

```javascript
// 完全なMongooseモック実装
const mongoose = {
  connect: jest.fn().mockResolvedValue(true),
  connection: {
    readyState: 1,
    on: jest.fn(),
    once: jest.fn(),
    db: {
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({ ok: 1 })
      })
    }
  },
  models: {},
  model: jest.fn((name, schema) => {
    // 動的モデル生成
    const Model = class {
      constructor(data) {
        Object.assign(this, data);
        this.save = jest.fn().mockResolvedValue(this);
        this.validate = jest.fn().mockResolvedValue(undefined);
      }
    };
    
    // 静的メソッド
    Object.assign(Model, {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      }),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      countDocuments: jest.fn()
    });
    
    return Model;
  }),
  Schema: class Schema {
    constructor(definition, options) {
      this.definition = definition;
      this.options = options;
      this.methods = {};
      this.statics = {};
      this.virtual = jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() });
      this.pre = jest.fn();
      this.post = jest.fn();
    }
  },
  Document: class Document {},
  Model: class Model {},
  Types: {
    ObjectId: class ObjectId {
      constructor(id) { this.id = id; }
      toString() { return this.id; }
      static isValid() { return true; }
    }
  }
};
```

### 2. テスト環境の最適化（トニー案）

```javascript
// jest.config.js の改善
module.exports = {
  projects: [
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.api.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.api.ts'],
    }
  ]
};
```

### 3. E2Eテスト実装（ハーマイオニー案）

```typescript
// e2e/board.spec.ts
import { test, expect } from '@playwright/test';

test.describe('掲示板アプリ', () => {
  test('投稿の作成・表示・編集・削除フロー', async ({ page }) => {
    await page.goto('/');
    
    // 投稿作成
    await page.fill('[placeholder="今何を考えていますか？"]', 'E2Eテスト投稿');
    await page.click('text=投稿する');
    
    // 投稿確認
    await expect(page.locator('text=E2Eテスト投稿')).toBeVisible();
    
    // 編集
    await page.click('[aria-label="編集"]');
    await page.fill('[placeholder="投稿を編集"]', 'E2Eテスト投稿（編集済み）');
    await page.click('text=更新');
    
    // 削除
    await page.click('[aria-label="削除"]');
    await page.click('text=確認', { force: true });
  });
});
```

### 4. CI/CD設定（L案）

```yaml
# .github/workflows/test.yml
name: Test & Coverage

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm test -- --coverage
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

---

## 合意事項

### 全員一致の決定事項：

1. **段階的修正アプローチ**を採用
2. **モックの完全性**を最優先
3. **E2Eテストでカバレッジ補完**
4. **自動化による品質保証**

### シャーロック：
「根本原因はモックの不完全性。これを解決すれば、ドミノ倒しのように他の問題も解決する」

### トニー：
「技術的負債を一掃する。Next.js 15対応も含めて、最新のベストプラクティスを適用」

### ハーマイオニー：
「各ステップで検証を行い、確実に進める。ドキュメントも同時に更新」

### L：
「統計的に、この順序での実装が最も成功確率が高い。リスクは最小化される」

---

## 実装優先順位

1. **即座に実行**：Mongooseモックの修正
2. **次に実行**：テスト環境の分離
3. **その後**：失敗テストの修正
4. **並行作業**：E2Eテスト実装
5. **最終段階**：CI/CD設定

この計画により、すべての要件を満たし、カバレッジ70%以上を達成する。