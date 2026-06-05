# D-Apo — 歯科医院 架電CRM（Dentia）

歯科医院への架電業務を効率化する、少人数チーム向けの軽量 CRM です。
[設計書](./docs/dental-call-crm-design.pdf) に基づき **Next.js (App Router) + Supabase** で実装しています。

> 旧バージョンの単体HTMLモック（`Dentia.html`）は `project/` とともにリポジトリに残してあります。

## 技術スタック

- **Next.js 16** (App Router / Server Components)
- **Supabase**（Postgres + Auth + Realtime）
- **Tailwind CSS v4**
- **TypeScript**

## 機能（設計書準拠）

- **医院データ管理** — 医院名・電話番号・住所・診療時間
- **ステータス管理** — 未架電 / 不通 / 担当者不在 / ヒアリング済 / アポ獲得 / お断り の6種
- **架電結果＋メモ登録** — 結果とメモを `call_logs` に履歴として蓄積、一覧用の `latest_memo` も同期
- **リアルタイム共有** — Supabase Realtime（`postgres_changes`）で別端末に即時反映
- **ワンタップ発信** — 電話番号タップで `tel:` 発信（スマホブラウザ想定）
- **営業中判定** — `hours`(jsonb) から「営業中／昼休み／営業時間外／休診」を JST 基準で判定
- **絞り込み・グループ化** — 医院名検索・都道府県/市区町村/ステータス絞り込み（市区町村は都道府県に連動）

## セットアップ

### 1. Supabase プロジェクトを用意

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editor で [`supabase/schema.sql`](./supabase/schema.sql) を実行（テーブル・RLS・トリガ・Realtime登録）
3. 開発用データが欲しければ [`supabase/seed.sql`](./supabase/seed.sql) も実行（架空20件）
4. メンバーは Authentication → Users から招待（公開サインアップは無効のまま）

### 2. 環境変数

```bash
cp .env.local.example .env.local
# .env.local に Supabase の URL / anon key を設定
```

### 3. 開発サーバー

```bash
pnpm install
pnpm dev
# http://localhost:3000 （未ログインなら /login へ）
```

### 4. 医院データの取り込み（任意）

厚労省「医療情報ネット」の歯科診療所オープンデータ（API不要・CSV配布）から
医院マスタを取り込めます。名称・住所・診療時間が入ります。
**※ 電話番号はオープンデータに含まれないため別途補完が必要**です。

```bash
pnpm import:clinics --facility 施設票.csv --hours 診療時間票.csv --prefecture 東京都 --dry-run
```

詳しい手順は [`docs/データ取り込み.md`](./docs/データ取り込み.md) を参照。

## 画面構成

- `/login` … ログイン
- `/clinics` … 医院一覧（メイン。進捗サマリ＋絞り込み・グループ化＋Realtime）
- `/clinics/[id]` … 医院詳細（基本情報／ステータス変更／架電結果入力／履歴）

## ディレクトリ

```
app/
  (auth)/login/        ログイン
  (app)/clinics/       一覧・詳細（認証必須シェル）
components/             UIコンポーネント（設計書 §3 準拠）
hooks/                 useRealtimeClinics（Realtime購読・楽観的更新）
lib/                   types / status / hours / supabase クライアント
supabase/              schema.sql・seed.sql
docs/                  設計書PDF・実装対応表
```

設計書の各章とファイルの対応は [`docs/設計と実装の対応.md`](./docs/設計と実装の対応.md) を参照。
