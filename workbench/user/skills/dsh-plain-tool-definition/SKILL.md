---
name: dsh-plain-tool-definition
description: Use when registering a DSH tool from a plugin package installed from git, where defineTool cannot be imported. The output schema must be standard JSON Schema, and the row only counts as working after a real `dsh --profile lab` boot with no "entry did not activate" warning.
---

# Đăng ký tool DSH không cần defineTool

## Dùng khi

- Viết row `ctx.tools.register(...)` trong package cài từ git / marketplace.
- Package không có `node_modules`, nên **không import được** `@deepseek-ai/*` (kể cả `defineTool`).
- Đang sửa output schema của một tool đã có.

## Luật cứng

1. Definition là object thuần, gồm `name`, `description`, `parameters`, `output` (với `schema` và `render`), `execute`.
2. `parameters` là **map tên→schema**, không phải object schema; tham số tuỳ chọn thì đừng khai `required`.
3. `output.schema` là **JSON Schema chuẩn**, trong đó `required` là **mảng tên field** ở cấp object, kèm `additionalProperties: false`.
4. **Không** viết `required: true` trên từng property. Đó là dialect của `defineTool`; đăng ký trực tiếp sẽ bị từ chối với `unsupported JSON schema: schema.properties.x.required is not supported on type "string"`, và row **im lặng không activate**.
5. Không import gì từ `@deepseek-ai/*`; tự validate `args` trong `execute`.
6. `render` phải tổng quát (không ném) và chỉ nhận hai tham số `(args, value)`.

## Kiểm

1. Test riêng của package phải **từ chối** `required: true` trên property. Đừng viết validator quá dễ — nó đã từng che đúng lỗi này.
2. `pnpm verify:release` để chắc package cài được và row resolve.
3. **Bắt buộc** chạy `dsh --profile lab --no-open --port 0` và xem có `warning: … entry did not activate` không. `verify:release` dùng `ctx` giả nên bỏ qua bước validate schema của DSH.

## Bằng chứng đã trả giá

`i18n_audit` phát hành ở 0.2.0 dùng `required: true`; unit test (validator tự viết) pass nhưng tool chưa từng chạy tới 0.3.1. Chỉ khi boot `lab` mới lộ.
