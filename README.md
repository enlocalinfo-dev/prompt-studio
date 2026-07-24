# Prompt Studio

[株式会社ENロジカル](https://en-logical.com/) 向け Genspark プロンプト生成（DB なし）。

## ローカル

```bash
cd prompt-studio
pnpm install
pnpm sync-templates
pnpm dev
```

- UI: http://localhost:5173  
- API: http://localhost:8787  

## Vercel（本番）

**URL:** https://prompt-studio-omega.vercel.app  

（Vercel プロジェクト: `enlogical/prompt-studio`）

1. Root Directory を **`prompt-studio`** に設定（リポジトリ直下に置く場合）
2. 環境変数: `ANTHROPIC_API_KEY`（任意）
3. Deploy

CLI:

```bash
cd prompt-studio
pnpm install
npx vercel --prod
```

## API キー

`ANTHROPIC_API_KEY` は **Vercel の環境変数または `server/.env` のみ**。ブラウザに載せません。
