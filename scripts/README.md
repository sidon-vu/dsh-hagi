# scripts/ — công cụ của repo

| Script | Việc | Lệnh |
|---|---|---|
| `build-index.mjs` | Quét `packages/*`, dựng `index.json` format 1, validate, kiểm tra tag ↔ version | `pnpm index` · `pnpm index:check` |
| `check-docs.mjs` | Kiểm mọi `.md` ≤ 200 dòng + link markdown tương đối không gãy | `pnpm check:docs` |
| `verify-release.mjs` | Cài từng plugin trong `index.json` từ GitHub (spec pinned) vào thư mục tạm, kiểm file, resolve row, gọi `apply()` | `pnpm verify:release` |

## build-index.mjs

```powershell
node scripts/build-index.mjs                 # sinh index.json
node scripts/build-index.mjs --check        # lệch thì exit 1 (dùng trước khi push)
node scripts/build-index.mjs --local        # cho phép package chưa có tag (dùng HEAD) — chỉ khi thử
node scripts/build-index.mjs --repo-url=https://github.com/OWNER/dsh-hagi
```

Kiểm: có `dsh.bundle`, version SemVer, không `private`, tag `<pkg>/v<version>` khớp, commit 40 hex, `source.url` https, `path` tương đối, không trùng tên/version; rồi chạy `parseMarketIndex` nếu tìm được validator của DSH.

## check-docs.mjs

```powershell
node scripts/check-docs.mjs              # max 200 dòng, kiểm link
node scripts/check-docs.mjs --max=150
node scripts/check-docs.mjs --no-links
```

Bỏ qua: `.git`, `node_modules`, `research/inbox`, `scratch`, `dist`, `coverage`. Link trong code fence không tính. Tự tìm gốc workspace (thư mục cha có `AGENTS.md` + `dsh-hagi/`), nếu clone repo đứng một mình thì kiểm phạm vi repo.

## verify-release.mjs

```powershell
node scripts/verify-release.mjs                  # mọi plugin trong index.json
node scripts/verify-release.mjs --pkg=dsh-dev-hg
node scripts/verify-release.mjs --keep           # giữ thư mục tạm để soi
```

Cách kiểm: với mỗi plugin, lấy `source.url` + `commit` + `path` trong index → spec `git+https://…#<sha>&path:/packages/<pkg>` → `pnpm add` vào `os.tmpdir()` → so `name`/`version` với index → đọc `cordis.patch.yml`, resolve từng row (`./src/x.js` = đường dẫn cạnh patch; tên khác = package specifier, resolve qua `exports`) → `import` rồi gọi `apply()` với ctx giả (ghi lại `tools.register` / `tools.guard`) → xoá thư mục tạm.

Không đụng profile DSH, không cần DSH đang chạy. Cần `pnpm` và mạng.

## Không làm gì

- Không tự commit, không tự tag, không push.
- Không sửa `package.json` của package.
