const { MongoClient } = require('mongodb');

// MongoDB接続設定
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/my-board-app';

// ダミーデータ
const dummyPosts = [
  {
    title: "技術記事の書き方について",
    content: "良い技術記事を書くためのポイントをまとめました。\n\n1. 読み手を意識する\n2. 具体例を交える\n3. 図表を活用する\n\n#技術記事 #ブログ #エンジニア",
  },
  {
    title: "今日のランチレポート",
    content: "新しくオープンしたイタリアンレストランに行ってきました！\n\nパスタが絶品で、特にカルボナーラがおすすめです。\nまた行きたいと思います。\n\n#グルメ #ランチ #イタリアン",
  },
  {
    title: "プログラミング学習のコツ",
    content: "効率的にプログラミングを学ぶ方法について考察しました。\n\n・毎日少しずつでも継続する\n・実際に手を動かして練習する\n・分からないことは積極的に調べる\n\n#プログラミング #学習 #エンジニア",
  },
  {
    title: "週末の読書記録",
    content: "今週読んだ本の感想です。\n\n『人を動かす』- デール・カーネギー\n人間関係の基本が学べる名著でした。特にコミュニケーションの部分が参考になりました。\n\n#読書 #自己啓発 #ビジネス書",
  },
  {
    title: "TypeScript vs JavaScript",
    content: "TypeScriptとJavaScriptの違いについて整理してみました。\n\nTypeScriptの利点：\n- 型安全性\n- 開発時のエラー検出\n- IDE支援の向上\n\n#TypeScript #JavaScript #開発",
  },
  {
    title: "朝活のススメ",
    content: "早起きして朝の時間を有効活用する方法について。\n\n朝活のメリット：\n・集中力が高い\n・静かな環境\n・一日を有効活用できる\n\n#朝活 #時間管理 #生産性",
  },
  {
    title: "ReactとVueの比較検討",
    content: "フロントエンドフレームワークの選択について考えてみました。\n\nReactの特徴：\n- Facebook製\n- 豊富なエコシステム\n- 学習コスト高め\n\nVueの特徴：\n- 学習しやすい\n- 段階的導入可能\n\n#React #Vue #フロントエンド",
  },
  {
    title: "コーヒーブレイクタイム",
    content: "お気に入りのカフェでコーヒーを飲みながら作業中です。\n\n環境を変えると新しいアイデアが浮かびやすいですね。\n今日は特に集中できています。\n\n#カフェ #コーヒー #作業環境",
  },
  {
    title: "データベース設計の基礎",
    content: "リレーショナルデータベースの設計について学んだことをまとめます。\n\n正規化の重要性：\n1. データの重複を避ける\n2. 更新時の不整合を防ぐ\n3. ストレージ効率の向上\n\n#データベース #設計 #SQL",
  },
  {
    title: "運動不足解消への取り組み",
    content: "在宅ワークで運動不足になりがちなので、対策を考えました。\n\n・毎日30分の散歩\n・階段を使う\n・ストレッチを定期的に\n\n健康第一ですね！\n\n#健康 #運動 #在宅ワーク",
  },
  {
    title: "APIの設計思想",
    content: "RESTful APIの設計について深く考えてみました。\n\n良いAPI設計の原則：\n- 一貫性のある命名\n- 適切なHTTPメソッドの使用\n- レスポンス形式の統一\n\n#API #REST #設計",
  },
  {
    title: "新しい趣味を始めました",
    content: "写真撮影を趣味として始めました！\n\nまだまだ初心者ですが、光の使い方や構図について勉強中です。\n週末には公園に撮影に行く予定です。\n\n#写真 #趣味 #カメラ",
  },
  {
    title: "チーム開発のベストプラクティス",
    content: "効率的なチーム開発について経験談をシェアします。\n\nポイント：\n- コードレビューの文化\n- 定期的なコミュニケーション\n- ドキュメントの整備\n\n#チーム開発 #エンジニア #協働",
  },
  {
    title: "今月の振り返り",
    content: "今月達成できたことと課題をまとめてみました。\n\n達成できたこと：\n✓ 新機能のリリース\n✓ パフォーマンス改善\n\n来月の目標：\n- テストカバレッジ向上\n- 技術ブログ執筆\n\n#振り返り #目標設定",
  },
  {
    title: "美味しいパン屋さん発見",
    content: "近所に素晴らしいパン屋さんを見つけました！\n\nクロワッサンが特に絶品で、外はサクサク、中はしっとり。\n明日も買いに行こうと思います。\n\n#パン #グルメ #ベーカリー",
  },
  {
    title: "セキュリティ意識の重要性",
    content: "Web開発におけるセキュリティについて学習中です。\n\n基本的な対策：\n- XSS対策\n- CSRF対策\n- SQLインジェクション対策\n\n#セキュリティ #Web開発 #対策",
  },
  {
    title: "音楽と集中力の関係",
    content: "作業中のBGMについて実験してみました。\n\n結果：\n- クラシック音楽：集中力UP\n- 歌詞のある曲：気が散る\n- 自然音：リラックス効果\n\n#音楽 #集中力 #作業環境",
  },
  {
    title: "Docker入門記録",
    content: "Dockerを学習し始めました。\n\nコンテナ技術の便利さに驚いています。\n環境の再現性が高く、デプロイも簡単になりそうです。\n\n#Docker #コンテナ #インフラ",
  },
  {
    title: "週末のハイキング記録",
    content: "山梨県の高尾山に登ってきました！\n\n天気も良く、頂上からの景色が最高でした。\n自然に触れるとリフレッシュできますね。\n\n#ハイキング #高尾山 #自然 #リフレッシュ",
  },
  {
    title: "モバイルファースト設計",
    content: "レスポンシブデザインの重要性について考察。\n\nモバイルファーストのアプローチ：\n1. 小さい画面から設計\n2. 段階的な機能追加\n3. パフォーマンス重視\n\n#レスポンシブ #モバイル #UI/UX",
  },
  {
    title: "効率的な情報収集方法",
    content: "技術情報の収集方法について整理しました。\n\n情報源：\n- 技術ブログ\n- GitHub\n- Twitter\n- Podcast\n\n質の高い情報を見極めることが重要ですね。\n\n#情報収集 #学習 #技術",
  },
  {
    title: "オンライン会議のコツ",
    content: "リモートワークでの会議を円滑に進めるポイント。\n\n・事前のアジェンダ共有\n・適切な照明と音質\n・積極的な参加姿勢\n\n#リモートワーク #会議 #コミュニケーション",
  },
  {
    title: "今日の料理チャレンジ",
    content: "久しぶりに手の込んだ料理を作ってみました。\n\nビーフシチューに挑戦！\n時間はかかりましたが、とても美味しくできました。\n料理は創作活動に似ていますね。\n\n#料理 #ビーフシチュー #手作り",
  },
  {
    title: "テスト駆動開発の実践",
    content: "TDDを実際のプロジェクトで実践してみた感想です。\n\nメリット：\n- バグの早期発見\n- リファクタリングの安心感\n- 設計の改善\n\n#TDD #テスト #開発手法",
  },
  {
    title: "睡眠の質を向上させる方法",
    content: "最近睡眠について勉強しています。\n\n改善ポイント：\n- 就寝前のブルーライト制限\n- 規則正しい睡眠時間\n- 適度な運動\n\n良い睡眠は生産性向上の基盤ですね。\n\n#睡眠 #健康 #生産性",
  },
  {
    title: "クラウドサービス比較検討",
    content: "AWS、GCP、Azureの特徴を比較してみました。\n\nAWS：最も成熟したサービス群\nGCP：機械学習に強み\nAzure：Microsoft製品との親和性\n\n#AWS #GCP #Azure #クラウド",
  },
  {
    title: "読書習慣の継続方法",
    content: "毎日読書する習慣を身につけるコツをシェアします。\n\n・小さな目標から始める\n・通勤時間を活用\n・興味のある分野から\n\n知識の積み重ねが大切ですね。\n\n#読書 #習慣 #学習",
  },
  {
    title: "コードレビューのポイント",
    content: "効果的なコードレビューの方法について整理。\n\nレビュー観点：\n- 可読性\n- パフォーマンス\n- セキュリティ\n- 保守性\n\n建設的なフィードバックが重要です。\n\n#コードレビュー #品質管理 #チーム開発",
  },
  {
    title: "新しいプログラミング言語学習",
    content: "Rustを学習し始めました！\n\nメモリ安全性とパフォーマンスを両立する言語として注目されていますね。\n学習コストは高めですが、とても興味深いです。\n\n#Rust #プログラミング言語 #学習",
  },
  {
    title: "時間管理の改善策",
    content: "生産性向上のための時間管理について考察。\n\nポモドーロ・テクニック：\n- 25分作業 + 5分休憩\n- 集中力の維持\n- 疲労の軽減\n\n実際に試してみて効果を感じています。\n\n#時間管理 #生産性 #ポモドーロ",
  }
];

async function seedDummyPosts() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('MongoDB に接続しました');

    const db = client.db();
    const usersCollection = db.collection('users');
    const postsCollection = db.collection('posts');

    // 既存ユーザーを取得（投稿者として使用）
    const users = await usersCollection.find({}).toArray();
    
    if (users.length === 0) {
      console.error('ユーザーが見つかりません。先にユーザーを作成してください。');
      return;
    }

    console.log(`${users.length} 人のユーザーが見つかりました`);

    // ダミー投稿を作成
    const posts = dummyPosts.map((dummyPost, index) => {
      // ランダムなユーザーを選択
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      // ランダムな作成日時（過去30日以内）
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const randomHoursAgo = Math.floor(Math.random() * 24);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - randomDaysAgo);
      createdAt.setHours(createdAt.getHours() - randomHoursAgo);

      // ランダムないいね数とコメント数
      const likesCount = Math.floor(Math.random() * 50);
      const commentsCount = Math.floor(Math.random() * 20);

      // ハッシュタグを抽出
      const hashtagMatches = dummyPost.content.match(/#[^\s#]+/g) || [];
      const hashtags = hashtagMatches.map(tag => tag.substring(1).toLowerCase());

      // ランダムないいねユーザー
      const likes = [];
      const numberOfLikes = Math.min(likesCount, users.length);
      const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
      for (let i = 0; i < numberOfLikes; i++) {
        likes.push(shuffledUsers[i]._id.toString());
      }

      return {
        title: dummyPost.title,
        content: dummyPost.content,
        authorId: randomUser._id.toString(),
        authorName: randomUser.name,
        authorEmail: randomUser.email,
        authorImage: randomUser.image || null,
        likes: likes,
        likesCount: likesCount,
        commentsCount: commentsCount,
        hashtags: hashtags,
        images: [], // 画像は空配列
        createdAt: createdAt,
        updatedAt: createdAt,
      };
    });

    // データベースに投稿を挿入
    const result = await postsCollection.insertMany(posts);
    
    console.log(`${result.insertedCount} 件のダミー投稿を作成しました`);
    console.log('作成された投稿のID:', Object.values(result.insertedIds));

    // 作成された投稿の確認
    const totalPosts = await postsCollection.countDocuments();
    console.log(`データベース内の総投稿数: ${totalPosts} 件`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.close();
    console.log('MongoDB 接続を終了しました');
  }
}

// スクリプト実行
if (require.main === module) {
  seedDummyPosts().catch(console.error);
}

module.exports = { seedDummyPosts };