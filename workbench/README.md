# workbench/ — công tắc tính năng theo từng máy

Lý do tồn tại: một package phát hành một lần, nhưng mỗi máy bật một bộ tính năng khác nhau. Patch ở đây ghi lại **máy nào bật gì** — và vì nằm trong repo, nó có lịch sử.

## Cấu trúc

```
workbench/
└─ profiles/
   ├─ _example/cordis.patch.yml   # mẫu, copy để tạo máy mới
   └─ <máy>/cordis.patch.yml      # patch thật của từng máy
```

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
