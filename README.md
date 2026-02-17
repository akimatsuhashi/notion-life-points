# Notion Life Points Widget 🏆

Notionに埋め込める、毎日の生活をポイント化するゲーミフィケーションウィジェット。

## ポイントソース

| ソース | ポイント |
|--------|---------|
| ✅ タスク完了 (Time Tracker Done) | +1 /件 |
| 📚 読書 (B O O K 読了日) | +3 /冊 |
| 🎬 映画鑑賞 (C I N E M A y/m/d) | +3 /本 |
| 💡 インサイト (Insights ページ作成) | +2 /件 |
| ☀️ 朝の光 (Health Tracker 光) | A=5, B=3, C=1 |
| 🚶 ウォーキング (Health Tracker 歩数) | +1 /1000歩 |

## セットアップ

### 1. ローカルテスト（モックデータ）

```bash
npm install
node test-server.js
# → http://localhost:3456 で確認
```

### 2. Vercel にデプロイ

1. [Vercel](https://vercel.com) でアカウント作成（GitHub連携推奨）
2. このリポジトリを GitHub に push
3. Vercel で「Import Project」→ GitHub リポジトリを選択
4. 環境変数を設定:
   - `NOTION_API_KEY` = Notion Integration のトークン
5. デプロイ完了 → URLが発行される

### 3. Notion に埋め込み

1. Notion で `/embed` と入力
2. デプロイされたURLを貼り付け
3. リサイズして好みのサイズに調整

## ポイントソースの追加方法

`api/config.js` の `POINT_SOURCES` 配列にエントリを追加:

```javascript
{
  id: "new_source",           // ユニークID
  label: "新しいソース",        // 表示名
  emoji: "🎯",                // アイコン
  dbId: "database-id-here",   // Notion DB ID
  dateProperty: "Date",       // 日付プロパティ名
  dateType: "property",       // "property" or "created_time"
  filter: { ... },            // Notion API フィルタ
  pointsPerItem: 1,           // 固定ポイント（or pointsCalc で動的計算）
}
```

## 技術スタック

- Frontend: HTML + CSS + Vanilla JS
- Backend: Vercel Serverless Functions
- API: Notion API (@notionhq/client)
- 運用コスト: **¥0**（Vercel Free Tier）
