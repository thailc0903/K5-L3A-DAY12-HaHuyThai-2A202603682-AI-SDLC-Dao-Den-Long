# Bằng chứng Phase 1

Các file TAP/JSON/JSONL ở đây được tạo bởi `node scripts/verify.mjs`. Không chỉnh tay. Bằng chứng phải được commit cùng phiên bản mã để checkout lại có thể chạy lại cùng các kết quả gameplay (thời lượng chạy test và cấu hình máy có thể khác).

| Yêu cầu | Bằng chứng | Trạng thái |
|---|---|---|
| 5 đèn, trạng thái khởi đầu, nhặt/nạp | tests.tap, win.jsonl | Đã chạy tự động |
| Di chuyển theo camera, chuẩn hóa, nhảy | tests.tap | Đã chạy logic; chưa kiểm tra camera trực quan |
| Bóng Mực đuổi, sát thương, tỏa sáng | tests.tap, hit.jsonl | Đã chạy tự động |
| Vùng an toàn, bất tử, cooldown | tests.tap | Đã chạy tự động |
| Thắng/thua, điểm | win.jsonl, hit.jsonl, summary.json | Đã chạy tự động |
| Hoàn thành Đêm 1 mặc định | playthrough-inputs.json, playthrough.jsonl | Đã chạy toàn màn và replay input, không override scenario |
| Tick và input, JSONL, exit code lỗi | tests.tap | Đã chạy CLI thật |
| Tất định cùng seed/đầu vào | default-a.jsonl, default-b.jsonl, summary.json | So byte giống hệt |
| Server và tài nguyên web | http.json | HTTP đã chạy; không phải render test |
| Mây/nón/đèn, phong cách đêm, HUD, đảo sáng dần | src/browser.mjs, src/style.css | Đã viết; chưa có ảnh/chơi thử trực quan |
| Nút Chơi lại sau thắng/thua | src/browser.mjs | Đã viết; chưa kiểm tra thao tác UI |
| Chạy macOS/Linux | mã Node không phụ thuộc OS; workflow Ubuntu | Chưa có run xác nhận nền tảng này |
| Review độc lập | người học xem code và chơi thử | Chưa thực hiện |

## Tái lập

Từ gốc repo, với Node.js 20+:

```sh
node scripts/verify.mjs
```

Đọc summary.json để xem môi trường chạy, kết quả và hash. tests.tap chứa tên từng test và số lượng đạt/thất bại. Đường chơi mẫu dùng seed 12, ghi bằng input thường rồi replay qua headless.

## Bổ sung bằng chứng trực quan

Mở game theo docs/game/README.md. Chơi thật và chụp ảnh cho thấy Mây/đảo/HUD, một đèn vừa sáng, màn thắng hoặc thua và màn bắt đầu mới sau Chơi lại. Ghi tên ảnh và thao tác đã làm. Chưa có các ảnh này trong repo; không coi mã hiển thị là bằng chứng render đã đạt.

## Tình trạng nộp

- README gốc giữ nguyên theo lựa chọn người học; hướng dẫn sản phẩm nằm ở docs/game/README.md.
- Tên repo remote hiện có nhiều dấu gạch nối liên tiếp, chưa đúng mẫu SUBMISSION.md; chưa đổi tên repo.
- Thời điểm bắt đầu và hạn tag của buổi lab chưa được cung cấp, nên chưa xác nhận nộp đúng giờ.
- Chỉ Phase 1; Release v1.0.0 và video dưới 5 phút thuộc bàn giao cuối Phase 4.
