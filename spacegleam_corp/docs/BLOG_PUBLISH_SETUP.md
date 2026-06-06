# Blog Publish — セットアップガイド

ブログ管理画面（`/.netlify/functions/blog-admin`）から **本番に直接公開**するための設定手順。

## 構成
- `netlify/functions/blog-publish.js` … 即時公開 / 予約登録のエンドポイント
- `netlify/functions/blog-scheduled-publish.js` … 15分毎に動く予約公開実行
- 予約データの保管 … Netlify Blobs（無料枠 1GB）
- 公開先 … `kuraeplasma/SPACEGLEAM` リポジトリの `main` ブランチへコミット → Netlify自動ビルド

すべて Netlify 無料枠の範囲内。

## 1. GitHub Personal Access Token を発行

1. GitHub右上アバター → **Settings**
2. 左下 **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens**
4. **Generate new token**
5. 設定:
   - **Token name**: `spacegleam-blog-publish`
   - **Expiration**: 1年（運用しやすいよう）
   - **Repository access**: **Only select repositories** → `kuraeplasma/SPACEGLEAM`
   - **Repository permissions**:
     - **Contents**: **Read and write**
     - **Metadata**: Read-only（自動付与される）
6. **Generate token** → 表示された `github_pat_...` をコピー（再表示されないので注意）

## 2. Netlify に環境変数を設定

Netlify ダッシュボード → サイト `animated-cendol-e753c7` (spacegleam.co.jp) → **Site configuration** → **Environment variables**

| Key | Value | Scope |
|---|---|---|
| `GITHUB_TOKEN` | 上で発行した `github_pat_...` | Functions |
| `GITHUB_REPO` | `kuraeplasma/SPACEGLEAM` | Functions |
| `GITHUB_BRANCH` | `main` | Functions |
| `GITHUB_SITE_SUBDIR` | （未設定でOK。ルートがサイトルートなら空） | Functions |
| `BLOG_ADMIN_USER` | `kurae` | Functions |
| `BLOG_ADMIN_PASSWORD` | （`blog-admin` と同じパスワード） | Functions |

`BLOG_ADMIN_USER` / `BLOG_ADMIN_PASSWORD` は既存のものを流用。

## 3. デプロイ

```bash
# spacegleam_deploy_staging を最新化して prod deploy
cd /d/AG && rm -rf /d/AG/spacegleam_deploy_staging && mkdir -p /d/AG/spacegleam_deploy_staging
git archive deploy-pages-only spacegleam_corp/ | tar -x -C /d/AG/spacegleam_deploy_staging/ --strip-components=1
cd /d/AG/spacegleam_deploy_staging
npx netlify-cli deploy --prod --site a30d800a-ecba-4f33-9962-4f2e6ff29464 --dir . --functions ./netlify/functions --message "feat(blog): direct publish + scheduled publish"
```

初回は `@netlify/blobs` を含む依存をインストールするビルドが走るため、デプロイに数十秒長くかかる場合あり。

## 4. 動作確認

### 即時公開
1. `https://spacegleam.co.jp/.netlify/functions/blog-admin` を開いて Basic Auth ログイン
2. 記事を書く
3. ヘッダーの **「今すぐ公開」** をクリック
4. 確認ダイアログで OK
5. 数秒後、ステータスバーに「公開しました → コミットを見る / 本番記事」が表示される
6. リンクをクリックして本番記事が表示されることを確認（Netlifyビルドに2〜3分かかる）

### 予約公開
1. 「予約公開日時」を未来の時刻に設定
2. **「予約公開」** をクリック
3. 「予約登録しました（ISO日時）」が表示される
4. 15分後（最大）に Scheduled Function が起動 → 時刻が来ていれば自動公開
5. ログ確認: Netlify ダッシュボード → Functions → `blog-scheduled-publish` → Logs

## 5. 既存「コピー」ボタンも残す
万一新方式で問題が出ても、ヘッダー右端の「コピー（旧）」ボタンで従来のクリップボード方式に戻れる安全策あり。

## トラブルシューティング

### 401 Unauthorized
- Basic Auth のパスワードがNetlify環境変数と一致しているか確認
- ブラウザでBasic Auth情報を一度クリア（一度ログアウト → 再ログイン）

### 500 GITHUB_TOKEN env var is not set
- Netlify環境変数 `GITHUB_TOKEN` が設定されてない / Functions スコープになってない
- 設定後、サイトの **Build & deploy → Trigger deploy** から再デプロイ

### 500 GitHub 422 ... is not a valid sha
- ブランチ名 `GITHUB_BRANCH` が間違っている
- リポジトリの実際のデフォルトブランチ名を確認（`main` or `master`）

### 500 GitHub 404 Not Found
- `GITHUB_REPO` が間違っている、または PAT がそのリポジトリへのアクセス権を持っていない
- PAT の発行時に正しいリポジトリを選んでいるか確認

### 予約公開が時刻を過ぎても公開されない
- `blog-scheduled-publish` の Logs を確認
- Blobs に保存されてるか確認: Netlify → Blobs → `blog-pending` ストアに該当 key が存在するか

## アーキテクチャ図

```
[Browser admin]
    │ POST /blog-publish { mode, articleHtml, postEntry, ... }
    │ Basic Auth
    ▼
[blog-publish Function]
    │
    ├─ mode=immediate ──────►[GitHub API (Trees)]──►[main branch]
    │                                                    │
    │                                                    ▼
    │                                        [Netlify auto-build]──►spacegleam.co.jp
    │
    └─ mode=scheduled ──────►[Netlify Blobs: blog-pending/<iso>-<slug>.json]
                                              ▲
                                              │ (15min cron)
                                              │
                                  [blog-scheduled-publish Function]
                                              │
                                              ▼
                                  due posts → publishImmediate → GitHub
```
