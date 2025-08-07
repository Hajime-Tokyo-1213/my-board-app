# 天才エンジニア4人会議：テストカバレッジ向上戦略会議

日時: 2025-08-07  
議題: 掲示板アプリのテストカバレッジを15.3%から70%以上に向上させる方法

## 参加者

### 🧠 Dr. アレックス・チェン（テスト自動化の権威）
「完璧なテストは存在しない。しかし、完璧に近づける方法は存在する」

### 🚀 サラ・ジョンソン（Next.js コアコントリビューター）
「Next.jsの内部構造を理解すれば、あらゆるテストの問題は解決できる」

### 🔧 ヤマダ・タロウ（日本のテスト駆動開発の第一人者）
「テストファーストで考えれば、自ずと道は開ける」

### 💡 マリア・ガルシア（フルスタックアーキテクト）
「統合的アプローチこそが、真のカバレッジ向上の鍵」

---

## 議論記録

### 開会（10:00）

**Dr. チェン**: 皆さん、今日の課題は明確です。現在15.3%のカバレッジを70%以上に引き上げる必要があります。主な障害は3つ：
1. NextRequestのモック問題
2. MongoDBのESモジュール問題  
3. 未テストのコードが多すぎる

**サラ**: Next.jsの観点から言えば、これらは全て解決可能です。順番に攻略しましょう。

---

### 議題1: NextRequestモック問題の解決（10:15）

**サラ**: NextRequestの問題は、Next.js 13以降のApp Routerが原因ね。解決策を提示します：

```javascript
// __mocks__/next-request.js
class MockNextRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body;
  }

  async json() {
    return JSON.parse(this.body);
  }
}

global.Request = MockNextRequest;
```

**ヤマダ**: 素晴らしい！でも、もっとエレガントな方法があります。MSW（Mock Service Worker）を使えば：

```javascript
// src/__tests__/setup/server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('/api/posts', () => {
    return HttpResponse.json({ success: true, data: [] });
  })
);
```

**マリア**: 両方のアプローチを組み合わせましょう。開発速度を重視するなら、即座に実装できる解決策を：

```javascript
// jest.setup.ts に追加
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Request/Response のポリフィル
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = input;
      this.method = init?.method || 'GET';
      this._body = init?.body;
    }
    
    async json() {
      return JSON.parse(this._body);
    }
  };
}
```

**Dr. チェン**: 実用的ですね。即座に実装可能で、既存のテストとの互換性も保てます。

---

### 議題2: MongoDBのESモジュール問題（10:30）

**Dr. チェン**: MongoDBとBSONのESモジュール問題は、Jest の transformIgnorePatterns の設定で解決できます：

```javascript
// jest.config.js
module.exports = {
  // ... 既存の設定
  transformIgnorePatterns: [
    'node_modules/(?!(mongodb|bson|mongodb-memory-server)/)',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // ESMモジュールの解決
    'bson': '<rootDir>/node_modules/bson/lib/bson.cjs',
  }
};
```

**ヤマダ**: より根本的な解決として、モックを活用すべきです：

```javascript
// __mocks__/mongoose.js
const mockMongoose = {
  connect: jest.fn().mockResolvedValue(true),
  connection: {
    readyState: 1,
    on: jest.fn(),
    once: jest.fn(),
  },
  Schema: jest.fn().mockImplementation(function(schema) {
    this.methods = {};
    this.statics = {};
    this.plugin = jest.fn();
  }),
  model: jest.fn().mockImplementation((name, schema) => {
    return class MockModel {
      constructor(data) {
        Object.assign(this, data);
      }
      save = jest.fn().mockResolvedValue(this);
      static find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });
      static findById = jest.fn().mockResolvedValue(null);
      static findByIdAndUpdate = jest.fn().mockResolvedValue(null);
      static findByIdAndDelete = jest.fn().mockResolvedValue(null);
      static create = jest.fn().mockResolvedValue({});
    };
  }),
};

module.exports = mockMongoose;
```

**マリア**: 実際のMongoDBの動作を再現したい場合は、mongodb-memory-server-core を使う方法もあります：

```javascript
// jest.setup.mongodb.js
import { MongoMemoryServer } from 'mongodb-memory-server-core';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '6.0.0',
    },
  });
  process.env.MONGODB_URI = mongoServer.getUri();
});

afterAll(async () => {
  await mongoServer.stop();
});
```

**サラ**: 段階的アプローチを提案します。まずモックで素早くテストを通し、その後実際のDBテストに移行する。

---

### 議題3: カバレッジ向上戦略（10:45）

**マリア**: 現在のカバレッジ分析を見ると：
- ✅ コンポーネント: 100%
- ❌ API Routes: 0%
- ❌ ページコンポーネント: 0%
- ❌ ユーティリティ: 0%

優先順位を付けて攻略しましょう。

**Dr. チェン**: 私の提案する優先順位：
1. **API Routes** (影響度: 高、実装難易度: 中)
2. **メインページ** (影響度: 高、実装難易度: 低)
3. **ユーティリティ** (影響度: 中、実装難易度: 低)
4. **その他のページ** (影響度: 低、実装難易度: 低)

**ヤマダ**: APIルートのテスト戦略を具体化しましょう：

```javascript
// src/__tests__/api/posts.integration.test.ts
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/posts/route';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

describe('API Routes Integration Tests', () => {
  it('GET /api/posts returns posts list', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});
```

**サラ**: ページコンポーネントには、軽量なスナップショットテストを：

```javascript
// src/__tests__/pages/home.test.tsx
import { render } from '@testing-library/react';
import Home from '@/app/page';

// APIコールをモック
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data: [] }),
  })
);

describe('Home Page', () => {
  it('renders without crashing', async () => {
    const { container } = render(await Home());
    expect(container).toMatchSnapshot();
  });
});
```

---

### 統合ソリューション提案（11:00）

**マリア**: 皆さんの意見を統合して、実装可能な解決策をまとめました：

## 🎯 実装計画

### Phase 1: 即座の修正（1時間）
1. jest.setup.tsにRequest/Responseポリフィルを追加
2. mongooseの基本モックを作成
3. API routeの基本テストを追加

### Phase 2: カバレッジ向上（2時間）
1. 全APIルートのテスト実装
2. メインページのテスト追加
3. ユーティリティ関数のテスト

### Phase 3: 高度な統合（半日）
1. MSWによるAPIモック環境構築
2. mongodb-memory-serverの適切な設定
3. E2Eテストとの統合

---

## 決議事項

**全員一致で承認された方針：**

1. **即座に実装可能な解決策を優先**
   - Requestポリフィルの実装
   - 基本的なmongooseモック

2. **段階的なカバレッジ向上**
   - まず50%を目指す
   - その後70%以上へ

3. **テストの保守性を重視**
   - 過度に複雑なモックは避ける
   - 実装とテストのバランスを保つ

**Dr. チェン**: 「完璧を求めすぎず、実用的な解決を」

**サラ**: 「Next.jsの進化に合わせて、テストも進化させましょう」

**ヤマダ**: 「テストは生きたドキュメント。常に更新を」

**マリア**: 「統合的視点を忘れずに、一歩ずつ前進を」

---

## 会議終了（11:15）

次回フォローアップ: 実装後のレビュー会議を予定