# RUNBOOKS — quy trình vận hành DSH

Mỗi runbook: mục đích → chuẩn bị → các bước → kiểm chứng → khi hỏng.
Chỉ ghi bước **kiểm được**; bước suy đoán phải đánh dấu `(chưa kiểm)`.

## Mẫu

```markdown
### RB-x — <tên>
**Khi nào:** <tình huống>
**Chuẩn bị:** <file/đường dẫn cần có, bản backup>
**Bước:** 1..n, mỗi bước một lệnh hoặc một hành động
**Kiểm chứng:** <output/màn hình chứng minh đã xong>
**Khi hỏng:** <đường lùi>
```

---

## RB-1 — Dựng DSH + marketplace trên máy mới

**Khi nào:** có thêm máy, hoặc cài lại máy cũ.
**Chuẩn bị:** quyền cài app; `machines.yml` (ngoài repo) để ghi máy mới; `dsh-hagi/workbench/profiles/_example/cordis.patch.yml`.

1. Cài DSH: Desktop app, hoặc `npx @deepseek-ai/dsh web` (mở ở `127.0.0.1:3080`). Kiểm: app mở được, phiên mới chat được.
2. Xác nhận version: `dsh --version` (hoặc xem About trong app). Khớp với `engines.dsh` bạn sẽ cài (`>=0.2.2-rc.5 <0.3.0`).
3. **Plugins → Discover → Add index source** → `https://raw.githubusercontent.com/sidon-vu/dsh-hagi/main/index.json`. Kiểm: thấy `hg · Dev & Ops`.
4. Cài `hg · Dev & Ops` (và các package cần). Kiểm: tab **Installed** có bundle, trạng thái **Installed**.
5. Mở **session mới**, nhờ agent gọi `i18n_audit` — có kết quả là tool đã đăng ký.
6. Sao chép patch của máy: `workbench/profiles/_example/cordis.patch.yml` → `~/.dsh/profiles/desktop/cordis.patch.yml` (thêm ở cuối file, không ghi đè phần có sẵn).
7. Ghi máy mới vào `machines.yml` (id, OS, version, profile).

**Khi hỏng:** nếu Discover không tải được index → kiểm URL trả 200 bằng trình duyệt; nếu 404, repo chưa push hoặc nhánh không phải `main`.
**Ghi chú:** mọi bước trên chưa thử trên máy thứ hai thật (mới kiểm trên `hagi-win-main`).

---

## RB-2 — Cập nhật bundle và rollback

**Khi nào:** có version mới trong Discover, hoặc muốn ghim về bản cũ.

**Chuẩn bị:** ghi lại spec đang cài (Plugins → bundle → nguồn: repo + commit + path). Backup:
`~/.dsh/profiles/desktop/{package.json,cordis.patch.yml,pnpm-lock.yaml}` → `_backups/`.

1. Cập nhật: **Discover → Update** (chỉ hiện với bản cài từ git, cùng repo + thư mục) — hoặc:
   `dsh plugin --profile <p> add "git+https://github.com/sidon-vu/dsh-hagi.git#<sha>&path:/packages/<pkg>"`
2. Kiểm: **Plugins → Installed** báo đúng version mới; mở session mới, hành vi mới có hiệu lực.
3. Rollback: cài lại đúng commit cũ bằng spec ở bước chuẩn bị (commit luôn tồn tại, không cần xoá version khỏi index).
4. Nếu rollback vẫn lỗi: chép lại 2 file backup ở bước chuẩn bị, rồi mở lại DSH.

**Khi hỏng:** Update báo lỗi mạng/ghi đè → xoá bundle trong GUI rồi cài lại bằng spec pinned. Không sửa `node_modules` bằng tay.

---

## RB-3 — DSH không boot / hành vi lạ sau khi cài plugin

**Khi nào:** app treo ở khởi động, hoặc một row mới làm phiên hỏng.

**Chuẩn bị:** một trình soạn thảo (không cần DSH chạy); đường dẫn profile `~/.dsh/profiles/<profile>/`.

1. Xác định nghi phạm: file nào vừa đổi — `git -C D:\DEV\dsh-workbench` không áp dụng cho profile; so `cordis.patch.yml` với `_backups` gần nhất.
2. Tắt row nghi phạm bằng patch (không cần GUI):
   ```yaml
   - id: <row-id>
     disabled: true
   ```
3. Khởi động lại. Nếu vẫn hỏng, tắt cả row của bundle vừa cài (mỗi row một mục như trên).
4. Vẫn hỏng: gỡ bundle khỏi profile — với profile do CLI quản lý: `dsh plugin --profile <p> remove <pkg>`; với profile `desktop`, gỡ trong **Plugins → Installed** (app quản lý profile này).
5. Kiểm chứng: DSH mở được, session mới chạy, `i18n_audit` (nếu còn cài) trả kết quả.
6. Ghi lại: nguyên nhân + row + version vào `CHANGELOG.md` mục `### Fixed`, và cập nhật `docs/FEATURES.md` nếu row đó phải tắt mặc định.

**Khi hỏng:** dựng lại profile từ template chỉ dành cho profile CLI: `dsh rescue --from-default-profile web` (thay `web` bằng template đang dùng). Với profile `desktop`, không có lệnh CLI tương đương `(chưa kiểm)` — ưu tiên cách ly bằng patch ở bước 2–3.
