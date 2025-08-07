// API Route テスト用のセットアップ
import '@testing-library/jest-dom';

// Node環境用の設定
global.Request = Request;
global.Response = Response;
global.Headers = Headers;

// fetch のモック
global.fetch = jest.fn();

// 環境変数の設定
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
// NODE_ENVは読み取り専用なので設定しない