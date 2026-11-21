# LICENSE-POLICY.md — được lấy gì từ repo người khác

Mục tiêu: phát hành `dsh-hagi` dưới MIT mà không vi phạm license của nguồn, và không làm mất công người đi trước.

## Bảng quyết định

| License nguồn | COPY code | Viết lại (ABSORB) | Bắt buộc |
|---|---|---|---|
| MIT | Được | Được | Giữ copyright notice + `NOTICE.md` |
| Apache-2.0 | Được | Được | Giữ `LICENSE` gốc, `NOTICE.md` nêu file đã sửa, không dùng trademark |
| BSD-2/3 | Được | Được | Giữ copyright + điều khoản |
| ISC | Được | Được | Giữ copyright |
| GPL-2.0 / GPL-3.0 | **Không** | Được về ý tưởng, không copy code | Nếu copy → cả package phải GPL (không đưa vào repo MIT) |
| AGPL | **Không** | Như trên | Như trên + rủi ro mạng |
| Không có LICENSE | **Không** (mặc định all rights reserved) | Được học ý tưởng, tự viết | Ghi `license: none` trong REFERENCES |
| License lạ (SSPL, BUSL…) | **Không** | Cân nhắc từng ca | Hỏi trước khi làm |

## Quy ước trong repo

1. Mỗi package có `license` trong `package.json`. Mặc định `MIT`.
2. Package có code từ nguồn khác: thêm `packages/<pkg>/NOTICE.md` với nguồn, commit, license, mô tả thay đổi.
3. Không copy file `LICENSE` của nguồn vào package nếu license nguồn khác MIT và code đã viết lại hoàn toàn.
4. Không copy icon/ảnh/font của nguồn. Tự vẽ `icon.svg`.
5. Không copy tên plugin, tên row, hay text giới thiệu nguyên văn.

## Khi không chắc

Ghi vào `../../research/references/<owner>__<repo>/ANALYSIS.md` mục "License: cần kiểm" và **dừng** — không copy, chỉ đọc. Việc kiểm tra license là điều kiện tiên quyết, không phải bước dọn dẹp sau cùng.
