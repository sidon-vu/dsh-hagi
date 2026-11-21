# TRACKING.md — bảng theo dõi nhóm / package / tính năng

Cập nhật lần cuối: 2026-11-21 (khởi tạo sườn).

**Trạng thái:** `planned` chưa làm · `wip` đang làm · `done` đã phát hành · `dropped` bỏ (ghi lý do).
Row id là hợp đồng vĩnh viễn — chỉ thêm, không đổi tên.

## Theo package

| Package | Nhóm | Version | Giai đoạn | Row | Reference chính |
|---|---|---|---|---|---|
| [dsh-dev-hg](../packages/dsh-dev-hg/README.md) | dev | 0.6.0 | released — [AGENTS](../packages/dsh-dev-hg/AGENTS.md) | 5 tính năng | `research/REFERENCES.md` |
| [dsh-session-hg](../packages/dsh-session-hg/README.md) | session | 0.1.0 | skeleton — [AGENTS](../packages/dsh-session-hg/AGENTS.md) | 1 row rỗng | `research/REFERENCES.md` |
| [dsh-ui-hg](../packages/dsh-ui-hg/README.md) | interface | 0.1.0 | skeleton — [AGENTS](../packages/dsh-ui-hg/AGENTS.md) | 1 row rỗng | `research/REFERENCES.md` |
| [dsh-machines-hg](../packages/dsh-machines-hg/README.md) | machines | 0.1.0 | released — [AGENTS](../packages/dsh-machines-hg/AGENTS.md) | 6 row enabled, 1 disabled | `dsh-fleet`, `dph-fleet`, `dsh-plugin-ssh` |

Danh sách plugin theo chủ đề (kèm mục đích từng cái): [../PLUGINS.md](../PLUGINS.md).

`packages/_template` **cố tình không có dòng ở đây**: nó không phát hành, chỉ là bản mẫu để copy. Row `template-hg-boot` trong patch của nó tồn tại để bundle mẫu hợp lệ.

## Tính năng theo row

### dsh-dev-hg — Development & Ops

| Row id | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|
| `dev-hg-boot` | Row rỗng giữ bundle cài được | dropped (0.2.0) | đã thay bằng row thật |
| `dev-hg-i18n-audit` | Tool `i18n_audit`: quét plugin đang cài — thiếu locale, thiếu `vi.json`, CJK cứng | done (0.2.0) | dùng cho chính quy trình port |
| `dev-hg-guard` | Khoá mỗi tool call: đường dẫn bảo vệ, lệnh phá huỷ, secret — config-driven | done (0.3.0) | mặc định tắt, bật ở `control/profiles/<máy>/` |
| `dev-hg-doctor` | Tool `profile_doctor`: so desired state (`control/profiles/*`) với máy: bundle thiếu, link gãy, version lệch, row tắt nhầm | done (0.4.0) | thay script rời |
| `dev-hg-snapshot` | Tool `profile_snapshot`: export/import profile (patch + bundle list), không kèm credentials | done (0.5.0) | manifest không chứa secret; import dry-run mặc định |
| `dev-hg-rollback` | Tool `profile_rollback`: checkpoint → restore snapshot gần nhất (undo 1 bước) | done (0.6.0) | history `rollback-history.json`, restore dry-run mặc định |

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

### dsh-machines-hg — Machines

| Row id | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|
| `machines-hg-boot` | Row rỗng giữ bundle cài được | done | xoá khi có tính năng thật |
| `machines-hg-registry` | Bảng `machines` (id, endpoint, tokenEnv, tags) + `machine_add`/`machine_list`/`machine_remove`/`machine_probe` | done | verify trong lab chat |
| `machines-hg-status` | Probe `/api/status` hoặc agent-card của từng máy | planned | `dph-fleet` `fleet_status` |
| `machines-hg-pin` | Binding `sessionId → machineId`; resolve `args.host → pin → default → local` | done | verify trong lab chat |
| `machines-hg-dispatch` | `machine_dispatch(machine?, prompt)` qua DSH remote API (Typert) | planned | `dsh-api-session-controller` |
| `machines-hg-handoff` | `machine_sessions(machine)` list session remote + attach URL | planned | `dsh-api-session-controller` |
| `machines-hg-tunnel` | Spawn/monitor cloudflared (quick/named), lưu public URL | planned | `dsh-gateway-agent` pattern |
| `machines-hg-a2a` | A2A v1.0.1 viết lại: inbound `/a2a/<machineId>` + outbound `a2a__<m>__<skill>` tools | dropped | executor cần `dsh` headless — chỉ có trên desktop, không có trên vHaGi |

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
