# workbench/ — công tắc tính năng theo từng máy

Lý do tồn tại: một package phát hành một lần, nhưng mỗi máy bật một bộ tính năng khác nhau. Patch ở đây ghi lại **máy nào bật gì** — và vì nằm trong repo, nó có lịch sử.

## Cấu trúc

```
workbench/
├─ profiles/
│  ├─ _example/cordis.patch.yml   # mẫu, copy để tạo máy mới
│  └─ <máy>/cordis.patch.yml      # patch thật của từng máy
└─ user/
   ├─ AGENTS.user.md              # bản chuẩn của ~/.dsh/AGENTS.md (luật user-level)
   └─ skills/<tên>/SKILL.md       # bản chuẩn của ~/.dsh/skills/<tên>/SKILL.md
```

`user/skills/` là bản chuẩn **có lịch sử** của các skill học được: sửa ở đây rồi copy sang `~/.dsh/skills/`. DSH tự quét thư mục đó (root `user-dsh`, rank 400) nên skill mới hiện trong catalog của phiên; đặt trong repo thì không tự nạp, đúng ý.

`user/AGENTS.user.md` là **bản chuẩn có lịch sử** của `~/.dsh/AGENTS.md`: sửa ở đây rồi copy ra `~/.dsh/AGENTS.md`. DSH nạp bản trong home cho mọi phiên; file trong repo chỉ để theo dõi thay đổi. Cố tình đặt tên `AGENTS.user.md` (không phải `AGENTS.md`) để DSH không nạp nhầm nó như chỉ dẫn của repo này.

## Cách dùng

1. Copy `profiles/_example/cordis.patch.yml` → `profiles/<máy>/cordis.patch.yml`.
2. Chép nội dung đó vào `cordis.patch.yml` của profile DSH thật (`~/.dsh/profiles/<profile>/cordis.patch.yml`), phần của bạn ở cuối file.
3. Muốn tắt một tính năng: thêm `- id: <row-id>\n  disabled: true`.
4. Muốn bật lại: `disabled: null`.
5. Đổi `config`: phải **restate toàn bộ** config của row đó (config bị thay thế wholesale, không merge).

## Quy ước

- Tên thư mục = `id` trong `../../machines.yml` (file đó nằm ngoài repo, không link được).
- Không đặt secret trong đây: chỉ row id, `disabled`, và config không nhạy cảm.
- Patch này là **desired state**; nó không tự áp vào máy. Áp bằng tay hoặc bằng script trong `../../ops/` (chưa có).
- Thêm index source của chính repo này vào `plugin-market` ở đây để mọi máy đều thấy marketplace.
