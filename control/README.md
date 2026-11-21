# control/ — phần "điều khiển" của workbench, có lịch sử

Đừng nhầm với `D:\DEV\dsh-workbench\` (thư mục làm việc, **không** git). Đây là thư mục con trong repo, chứa những thứ thuộc bàn làm việc nhưng **cần lịch sử**:

| Thứ | Ở ngoài (`dsh-workbench/`) | Ở đây (`dsh-hagi/control/`) |
|---|---|---|
| Nháp, clone để đọc, dữ liệu tải | `research/`, `scratch/` | — |
| Trạng thái phiên, inventory máy | `HANDOFF.md`, `machines.yml` | — |
| Patch profile từng máy | — | `profiles/` |
| Luật user-level + skill của ta | — | `user/` |
| Quy trình dùng chung | — | `rules/` |

Tên cũ của thư mục này là `control/`, đã đổi thành `control/` vì trùng tên với thư mục ngoài.

## Cấu trúc

```
control/
├─ profiles/
│  ├─ _example/cordis.patch.yml   # mẫu, copy để tạo máy mới
│  └─ <máy>/cordis.patch.yml      # patch thật của từng máy
├─ user/
│  ├─ AGENTS.user.md              # bản chuẩn của ~/.dsh/AGENTS.md
│  └─ skills/<tên>/SKILL.md       # bản chuẩn của ~/.dsh/skills/<tên>/
├─ rules/                         # quy trình dùng chung (context, phiên, áp quy trình)
└─ sources/                       # văn bản gốc đã đưa để áp dụng (nguyên văn + đã/không áp dụng)
```

`rules/README.md` là cửa vào quy trình. `user/` là bản chuẩn copy ra home; file trong repo **không tự nạp** — cố ý đặt tên `AGENTS.user.md` để DSH không nạp nhầm nó như chỉ dẫn của repo.

Skill của **bên thứ ba** (ví dụ `skill-forge`) chỉ nằm ở `~/.dsh/skills/`, không đưa vào repo — repo phát hành công khai, không có quyền redistribute. Chỉ skill do ta viết nằm trong `user/skills/`.

## Cách dùng `profiles/`

1. Copy `profiles/_example/cordis.patch.yml` → `profiles/<máy>/cordis.patch.yml`.
2. Chép nội dung đó vào `cordis.patch.yml` của profile DSH thật (`~/.dsh/profiles/<profile>/cordis.patch.yml`), thêm ở cuối file.
3. Tắt một tính năng: `- id: <row-id>` + `disabled: true`. Bật lại: `disabled: null`.
4. Đổi `config`: phải **restate toàn bộ** config của row đó (config bị thay thế wholesale).

## Quy ước

- Tên thư mục trong `profiles/` = `id` trong `../../machines.yml` (file ngoài repo, không link được).
- Không đặt secret ở đây: chỉ row id, `disabled`, và config không nhạy cảm.
- Patch là **desired state**, không tự áp vào máy. Áp bằng tay hoặc bằng script (chưa có).
- Index source của repo nên có trong `plugin-market` của mọi máy để thấy marketplace.
