# ARCHITECTURE — một row từ source đến phiên chạy

Tài liệu này trả lời: *một dòng code trong `packages/` trở thành năng lực trong phiên DSH bằng cách nào, và nó có thể gãy ở đâu.* Không lặp lại quy ước (xem [../AGENTS.md](../AGENTS.md)).

## Các tầng

```
repo dsh-hagi
└─ package            = 1 bundle = 1 chủ đề  → đơn vị CÀI, VERSION, entry trong Discover
   ├─ package.json    dsh.bundle.patch + dsh.client + engines.dsh + dsh.market
   ├─ cordis.patch.yml  insert N row
   └─ row             = 1 tính năng             → đơn vị BẬT/TẮT, có config riêng
      └─ module       export apply(ctx)         → đăng ký tool / slot / service / event
```

- Cài cả package, nhưng tắt từng row được: `- id: <row>\n  disabled: true` trong patch profile.
- `insert` trong patch package có thể đặt `disabled: true` cho row còn thử nghiệm.
- `config` bị **thay thế wholesale** khi profile override → giữ config phẳng, mỗi row một config.

## Ba đường cài (khác nhau về bản chất)

| Spec | Bản cài là gì | Dùng cho |
|---|---|---|
| `D:\DEV\...\packages\dsh-dev-hg` (absolute path) | pnpm ghi `link:` → trỏ vào source | dev trên máy mình, sửa là chạy |
| `git+https://github.com/sidon-vu/dsh-hagi.git#<40hex>&path:/packages/<pkg>` | **bản copy** bất biến từ đúng commit đó | phát hành, máy khác, marketplace |
| `<name>@<version>` | bản copy từ npm | khi publish registry (chưa dùng) |

Hệ quả bắt buộc:

- Package cài từ git **không có `node_modules`** → không `import` được `@deepseek-ai/*`. Viết tool/service bằng object thuần + `ctx`.
- Git install **không chạy `prepare`** → phải commit `dist/` nếu có bước build.
- `workspace:*` trong `dependencies` làm cài từ git hỏng (`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`).
- `link:` trỏ đường dẫn tuyệt đối → di chuyển/xoá thư mục là gãy.

## Profile ghép cấu hình theo thứ tự

```
package.json (dsh.profile.bundles)  →  bundle.patch (theo thứ tự bundle)  →  cordis.patch.yml (lớp người dùng)  →  --patch overlay
```

- `dsh-base` bật sẵn: tools, session, sandbox, agent-instructions (`maxBytes` 65.536 mỗi chuỗi), hmr.
- Profile tên `desktop` **do app Electron quản lý riêng**; CLI từ chối (`managed exclusively by the Electron application`).
- Profile CLI tạo được: `dsh --profile <tên> --from-default-profile web` (template: acp, web, headless, sdk, sdk-minimal).
- `dsh plugin --profile <tên> <pnpm args>` là cửa duy nhất để cài/gỡ trong profile CLI.

## Marketplace

```
index.json (format 1, phục vụ qua HTTPS công khai)
└─ plugin: name, title/description (locale), icon, metadata{category,labels,keywords}
   └─ versions[]: version, publishTimestamp, source{git url, commit, path}, engines.dsh
```

- DSH tải index, validate (`parseMarketIndex`), rồi `marketInstallTarget` sinh spec cài.
- Discover cache 10 phút; URL không được chứa credentials/fragment và không theo redirect.
- Update chỉ chạy khi bản cài là git **và cùng repository + directory**; bản cài từ `link:` không có update.
- Trang chi tiết = locale `meta.detail` → README của package → README của repo.

## Context của agent

DSH nạp `AGENTS.md`/`CLAUDE.md`: baseline từ **project root (`.git`) → cwd**, sau đó thêm các thư mục mà agent **chạm bằng read/write/edit**. Shell không tính. Vì vậy:

- File trong `packages/*/` được nạp khi agent làm việc ở đó → mỗi file phải ≤ 200 dòng.
- Repo lạ clone vào dưới cwd có thể chèn chỉ dẫn → cách ly `_quarantine/` ngay sau clone.

## Năm chỗ hay gãy (đều đã gặp)

1. `prepare`/`workspace:*`/import `@deepseek-ai/*` → cài từ git thất bại hoặc module không load.
2. Quên `disabled: null` khi bật lại row → tưởng đã bật nhưng vẫn tắt.
3. Đổi row id → mất mọi override ở các máy (im lặng).
4. Sửa `index.json` bằng tay → lệch tag/commit; luôn chạy `scripts/build-index.mjs`.
5. CRLF: đã có `.gitattributes` (`* text=auto eol=lf`); máy Linux sẽ thấy diff rác nếu bỏ.

## Tài liệu: cái gì có, cái gì cố tình không có

| File phổ biến | Ở đây | Vì sao |
|---|---|---|
| `PRD.md` | **không** — thay bằng cột *Done when* + "vì sao" trong `packages/*/docs/FEATURES.md` | tài liệu hoá theo tính năng, không theo dự án giả định |
| `ARCHITECTURE.md` | **có** — file này | một chỗ trả lời "row chạy thế nào" |
| `DESIGN.md` | có, đặt trong package UI: [dsh-ui-hg/docs/DESIGN.md](../packages/dsh-ui-hg/docs/DESIGN.md) | luật UI chỉ cần đọc khi làm UI |
| `RULES.md` | **không** — `AGENTS.md` đã là RULES | chỉ `AGENTS.md`/`CLAUDE.md` được **tự nạp**; file khác là dead weight |
| `TASKS.md` | **không** — [TRACKING.md](TRACKING.md) | mỗi việc đã có id = row id, có trạng thái |
| `PROGRESS.md` | **không** — `CHANGELOG.md` (đã xong) + dòng `wip:` trong TRACKING (đang làm) | tránh 2 nguồn sự thật về tiến độ |

Nguyên tắc đứng sau: **mỗi câu hỏi chỉ một file trả lời, và mọi file phải được link từ `AGENTS.md`** — nếu không nó chỉ tốn dung lượng mà agent không đọc.
