# PORTING.md — từ plugin cộng đồng đến tính năng của mình

Quy trình chuẩn khi gặp một plugin trên dsh-plugin.org mà muốn "làm lại + phát triển thêm".

## Bước 0 — kiểm tra license trước mọi thứ

Đọc [LICENSE-POLICY.md](LICENSE-POLICY.md). Không có license hoặc GPL: chỉ được đọc để học, **không copy code**.

## Bước 1 — phân loại quy mô

| Dấu hiệu | Cách làm |
|---|---|
| Có `locale/` và ≤ ~30k dòng | **PORT**: thêm `locale/vi.json`, sửa chuỗi cứng, giữ nguyên cấu trúc |
| Không có `locale/`, nhỏ | **ABSORB**: rút chuỗi + logic, viết lại row mới trong package của mình |
| 100k+ dòng, nhiều feature | **ABSORB** từng feature; không fork |
| Là app con (backend, binary, DB) | **SKIP** trừ khi cần chính nó |

## Bước 2 — rút "bề mặt" chứ không rút code

Với ABSORB, chỉ cần 4 thứ từ repo gốc (ghi vào `ANALYSIS.md`):

1. **Row/patch**: nó chèn row gì, `config` ra sao.
2. **Điểm neo**: dùng slot/service nào (`ctx.session`, `slots.conversation`, tool definition…).
3. **Cách lưu state**: file, sqlite, kv — ảnh hưởng tới việc ta có cần `dev-hg-snapshot`.
4. **Danh sách chuỗi phải dịch** và các phụ thuộc nền tảng.

Code ta viết mới trong `packages/<pkg>/src/`, tên file theo tính năng, không theo repo gốc.

## Bước 3 — thiết kế row

- Một tính năng = một row, id `<nhóm>-hg-<tính năng>`.
- **Slice đầu tiên phải cài được và dùng được end-to-end** (dù chỉ một tính năng nhỏ) trước khi thêm tính năng thứ hai. Đừng gom 5 tính năng rồi mới thử.
- `config` phẳng, nhỏ; mọi field đều có default trong code, vì patch máy khác thay thế wholesale.
- Nếu tính năng cần bật/tắt theo máy → để mặc định trong patch package, override trong `workbench/profiles/<máy>/cordis.patch.yml`.

## Bước 4 — i18n

- Mọi chuỗi qua locale key; `locale/en.json` là nguồn, `locale/vi.json` là bản dịch.
- Port từ plugin TQ: giữ `zh.json` nếu ta giữ code/chuỗi gốc; nếu viết lại hoàn toàn thì chỉ cần en + vi.
- Trang Discover đọc `meta.detail` (nếu khai) rồi tới `README.md` — README của package chính là trang giới thiệu.

## Bước 5 — ghi công

Package port/fork phải có `NOTICE.md`:

```markdown
# Ghi công
- Nguồn: https://github.com/<owner>/<repo> @ <commit>
- License gốc: <MIT|Apache-2.0>
- Đã thay đổi: <1-3 dòng>
- Chuỗi gốc tiếng Trung: giữ / thay bằng en+vi
```

Apache-2.0: giữ nguyên `LICENSE` gốc + thêm ghi chú sửa đổi. MIT: giữ copyright notice gốc.

## Bước 6 — kiểm chứng

1. Cài `link:` vào profile `lab`, xem row bật/tắt được.
2. Kiểm tra chuỗi: không còn tiếng Trung trong UI nếu đã dịch.
3. Ghi vào `docs/FEATURES.md` + [TRACKING.md](TRACKING.md).
4. Nếu phát hiện lỗi ở nguồn gốc: ghi vào `ANALYSIS.md`, không sửa trong `inbox/`.

## Thăng cấp lab → desktop

| Tầng | Profile | Được phép |
|---|---|---|
| Thử | `lab` (CLI, cài `link:`) | mọi thứ, kể cả plugin lạ chưa review |
| Dùng thật | `desktop` (Electron quản lý) | chỉ bản đã release, pin commit |

Checklist trước khi đưa lên `desktop`:

- [ ] `node test/smoke.mjs` pass (hoặc bằng chứng chạy tương đương).
- [ ] Đã cài thử bằng **spec pinned** (`git+…#<sha>&path:/packages/<pkg>`), không chỉ bằng `link:`.
- [ ] `CHANGELOG.md` có mục cho version đó; tag đã tạo; `index.json` đã sinh lại.
- [ ] Row còn thử nghiệm thì `disabled: true` trong patch của package.
- [ ] Có đường rollback: ghi lại spec cũ trước khi cập nhật (xem [RUNBOOKS](RUNBOOKS.md) RB-2).

## Ưu tiên thực tế

Làm `dev-hg-i18n-audit` trước sẽ tự động hoá bước 2 và bước 4 cho mọi lần port sau — mỗi plugin mới chỉ cần chạy công cụ rồi dịch theo danh sách nó xuất ra.
