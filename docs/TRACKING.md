# TRACKING.md — bảng theo dõi nhóm / package / tính năng

Cập nhật lần cuối: 2026-11-21 (khởi tạo sườn).

**Trạng thái:** `planned` chưa làm · `wip` đang làm · `done` đã phát hành · `dropped` bỏ (ghi lý do).
Row id là hợp đồng vĩnh viễn — chỉ thêm, không đổi tên.

## Theo package

| Package | Nhóm | Version | Trạng thái | Reference chính |
|---|---|---|---|---|
| [dsh-dev-hg](../packages/dsh-dev-hg/README.md) | dev | 0.3.1 | 2 tính năng | `research/REFERENCES.md` |
| [dsh-session-hg](../packages/dsh-session-hg/README.md) | session | 0.1.0 | skeleton | `research/REFERENCES.md` |
| [dsh-ui-hg](../packages/dsh-ui-hg/README.md) | interface | 0.1.0 | skeleton | `research/REFERENCES.md` |

`packages/_template` **cố tình không có dòng ở đây**: nó không phát hành, chỉ là bản mẫu để copy. Row `template-hg-boot` trong patch của nó tồn tại để bundle mẫu hợp lệ.

## Tính năng theo row

### dsh-dev-hg — Development & Ops

| Row id | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|
| `dev-hg-boot` | Row rỗng giữ bundle cài được | dropped (0.2.0) | đã thay bằng row thật |
| `dev-hg-i18n-audit` | Tool `i18n_audit`: quét plugin đang cài — thiếu locale, thiếu `vi.json`, CJK cứng | done (0.2.0) | dùng cho chính quy trình port |
| `dev-hg-guard` | Khoá mỗi tool call: đường dẫn bảo vệ, lệnh phá huỷ, secret — config-driven | done (0.3.0) | mặc định tắt, bật ở `workbench/profiles/<máy>/` |
| `dev-hg-doctor` | So desired state (`workbench/profiles/*`) với máy: bundle thiếu, link gãy, version lệch | planned | thay script rời |
| `dev-hg-snapshot` | Export/import profile (patch + bundle list), không kèm credentials | planned | |
| `dev-hg-rollback` | Snapshot trước khi apply, rollback 1 nút | planned | sau snapshot |

### dsh-session-hg — Session & Context

| Row id | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|
| `session-hg-boot` | Row rỗng giữ bundle cài được | done | xoá khi có tính năng thật |
| `session-hg-context-panel` | Phân rã token/context theo file, tool, lượt | planned | học từ `bowenliang123/dsh-context` (ABSORB) |
| `session-hg-archive` | Xem/khôi phục session đã archive | planned | |
| `session-hg-rewind` | Tua về message trước đó trong cửa sổ | planned | |

### dsh-ui-hg — UI & Experience

| Row id | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|
| `ui-hg-boot` | Row rỗng giữ bundle cài được | done | xoá khi có tính năng thật |
| `ui-hg-statusbar` | Status bar đa máy: máy hiện tại, profile, plugin lệch | planned | đây là lý do vào nhóm interface |
| `ui-hg-locale-switch` | Chuyển EN/VI cho chuỗi của các plugin hg | planned | phụ thuộc cả 3 package |
| `ui-hg-density` | Mật độ hiển thị (compact/normal) | planned | |

## Quy tắc cập nhật

1. Bắt đầu làm: `planned` → `wip`, thêm ngày.
2. Khi đang `wip`, thêm ngay dưới bảng của package một dòng:
   `> wip: <đang ở đâu · chặn gì · bước kế tiếp>` — xoá khi `done`/`dropped`. Đây là "PROGRESS" duy nhất của repo; đừng tạo file trạng thái riêng.
3. Phát hành: `wip` → `done`, cập nhật version ở bảng package.
4. Bỏ: `dropped` + lý do một dòng. Không xoá dòng.
5. Khi thêm/sửa row: cập nhật đồng thời `packages/<pkg>/docs/FEATURES.md` (có cột **Done when**) — file này là bảng tổng, không lặp chi tiết kỹ thuật.

## Liên quan

- Kiến trúc (row → bundle → cài đặt): [ARCHITECTURE.md](ARCHITECTURE.md)
- Nhóm và quyết định chọn nhóm: `research/GROUPS.md` (ngoài repo)
- Plugin tham khảo: `research/REFERENCES.md` (ngoài repo)
- Quy trình port: [PORTING.md](PORTING.md)
