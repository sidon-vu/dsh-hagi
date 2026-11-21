# DESIGN — luật giao diện cho dsh-ui-hg

Chỉ đọc khi làm row có `dsh.client` (client bundle). Package hiện chưa có client entry — tạo cùng row UI đầu tiên (`ui-hg-statusbar`).

## Bắt buộc

1. **Chỉ dùng token theme** `--dsw-alias-*` cho màu, chữ, khoảng cách. Không viết màu literal (trừ artwork trong `icon.svg`).
2. **Không import package client của DSH** (`@deepseek-ai/dsh-client-ui-*`). `dsh.client.inject` chỉ để sắp thứ tự kích hoạt. Component của host thay đổi không báo trước.
3. **Copy pattern từ host**: trang **Plugin Manager** là chuẩn cho danh sách quản trị; primitive trong `src/*.tsx` + `*.module.css` của host là nguồn tham khảo. Đổi class sang tiền tố `hg-`, giữ token.
4. **Đăng ký qua slot**: `ctx.slots.inject(ownerKey, () => ctx.slots.register(...))`. Callback bị dispose khi owner mất — không tự sửa DOM ngoài component, không `appendChild` vào `document.body`.
5. **Không dựng trang HTML riêng rồi nhúng iframe**: iframe không nhận token theme, dark/light, locale.
6. **Mọi chuỗi qua locale** (`locale/en.json` + `vi.json`), không hardcode. Số/ngày định dạng theo locale đang bật.
7. **Bốn trạng thái phải có** cho mọi dữ liệu hiển thị: loading (skeleton, không spinner vô hạn), empty (kèm hành động gợi ý), error (nói lý do + Retry), denied (khi thiếu quyền).
8. **Tiếp cận**: `role="switch"` + `aria-checked` cho công tắc; Escape và trap focus cho modal; tooltip có vị trí ổn định; mọi nút có nhãn cho screen reader.
9. **Mật độ**: `ui-hg-density` đổi spacing bằng token, không bằng `transform: scale`.

## Dữ liệu

- Giá trị suy ra từ session phải lấy qua projection/wire của host, **không** fold lại event ở client.
- Chỉ subscribe phần slice nhỏ nhất qua selector hook của props.
- Dữ liệu tải về client phải có giới hạn (số dòng/số phần tử) và dấu hiệu "còn nữa".

## Checklist trước khi merge một row UI

- [ ] Không có mã màu hex/rgb trong component (grep).
- [ ] Không import `@deepseek-ai/dsh-client-*` (grep).
- [ ] Chuỗi en + vi đầy đủ; thử đổi ngôn ngữ thấy đổi ngay.
- [ ] Thử ở cửa sổ hẹp (320px) và rộng; không tràn ngang.
- [ ] Đủ 4 trạng thái; bấm Retry khi lỗi chạy lại thật.
- [ ] Không làm hỏng slot khác khi bị gỡ (collapse owner → UI về như cũ).

## Ngoài phạm vi

Theme engine, đổi bố cục toàn cục, thay icon bộ công cụ của host: không làm trong `dsh-ui-hg`.
