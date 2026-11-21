# scripts/ — công cụ của repo

| Script | Việc |
|---|---|
| `build-index.mjs` | Quét `packages/*`, dựng `index.json` format 1, validate, kiểm tra tag ↔ version |

## Dùng

```powershell
node scripts/build-index.mjs                 # sinh index.json
node scripts/build-index.mjs --check        # chỉ kiểm: lệch thì exit 1 (dùng trước khi push)
node scripts/build-index.mjs --local        # cho phép package chưa có tag (dùng commit HEAD) — chỉ khi thử
node scripts/build-index.mjs --repo-url=https://github.com/OWNER/dsh-hagi
```

## Nó kiểm gì

1. Mỗi package: có `dsh.bundle`, version SemVer, không `private`.
2. Tag `<package>/v<version>` tồn tại và trùng version trong `package.json`.
3. `commit` là 40 hex, `source.url` là https, `path` tương đối.
4. Không trùng tên package, không trùng version trong một package.
5. Nếu tìm được bộ validate của DSH (`@deepseek-ai/dsh-plugin-market-index`) thì chạy `parseMarketIndex`; không tìm được thì tự kiểm hình dạng và cảnh báo.

## Không làm gì

- Không tự commit, không tự tag, không push.
- Không sửa `package.json` của package.
