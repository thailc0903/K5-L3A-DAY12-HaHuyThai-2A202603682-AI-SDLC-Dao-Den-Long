# Nhật ký AI và đánh giá — Phase 1

## Công việc

- Người học cung cấp toàn bộ PRD-0 và Test Contract v1.0; yêu cầu giữ tài liệu lab gốc, làm đúng phạm vi Phase 1.
- AI hỗ trợ đọc yêu cầu, chốt tuning/giả định, viết mô phỏng JS, runner headless, giao diện Three.js, test, script kiểm chứng và tài liệu.
- Chọn JavaScript/Node.js 20+ để browser và headless dùng chung logic, không cần engine/GPU trong test. Vendored Three.js để chơi không phụ thuộc CDN sau clone.
- Không triển khai ticket Phase 2–4, không thêm cơ chế sáng tạo, không tạo Release v1.0.0 hoặc video cuối khóa ở Phase 1.
- Người học chọn giữ README gốc; hướng dẫn sản phẩm được đặt ở docs/game/README.md. Đây là lựa chọn có chủ đích, khác vị trí README sản phẩm thường được người chấm tìm ở gốc.

## Kiểm chứng và lỗi phát hiện

- Đã thực thi bộ test logic/CLI; output được script sinh vào docs/proof/phase-1/, không sửa tay.
- Kiểm tra đầu vào, tick 0/1, bán kính, nút theo cạnh, pulse/cooldown, sát thương/bất tử, scenario, điểm, thắng/thua và tất định.
- Đường chơi mặc định được bộ điều khiển kiểm chứng ghi thành inputs rồi replay bằng CLI. Bộ điều khiển chỉ đọc trạng thái và phát input hợp lệ; không chỉnh máu, teleport hoặc thay đổi màn.
- Clone local sạch commit d97ee10 rồi chạy verify bằng Node sẵn có: 24/24 test, HTTP và replay đều đạt; đã lưu summary từ clone. Đây là kiểm tra Windows, không gán nhãn thành kết quả Linux.
- Lỗi công cụ: lần chạy thử một đoạn JS qua PowerShell -e mất dấu nháy. Phát hiện ngay từ SyntaxError; chuyển thành file .mjs để chạy lệnh trực tiếp, không dùng chuỗi shell chứa mã.
- Review phát hiện check.mjs cần fileURLToPath thay vì thao tác URL.pathname để hỗ trợ đường dẫn có khoảng trắng; đã sửa.
- Node không có trên PATH ở máy hiện tại. Dùng runtime Node sẵn có của Codex để kiểm chứng; thêm play.ps1 làm lối mở server trên Windows, không đổi môi trường máy.
- Truy cập mạng bị sandbox chặn khi tải thư viện/kiểm tra remote: chỉ tải lại qua công cụ yêu cầu quyền; không đưa credential vào file hoặc output.
- Công cụ điều khiển trình duyệt Windows dừng do chưa hỗ trợ kiểm soát URL; dừng toàn bộ thao tác UI. Chưa có bằng chứng trực quan, chưa xác nhận WebGL trên máy người học, và chưa kiểm tra chơi lại bằng UI.

## Harness và tiết kiệm token

- AGENTS.md ngắn: lệnh build/test/headless và cấm tuyên bố đã kiểm tra khi chưa chạy.
- scripts/verify.mjs là cổng kiểm chứng: test hoặc replay sai thì thoát khác 0, không tạo summary PASS mới.
- Hook pre-commit và CI giữ trong repo. Hook có thể bật sau khi Node có PATH; CI chỉ được coi là đạt khi thực sự có run trên GitHub.
- Không spawn subagent. Review độc lập do người học thực hiện sau; chưa ghi nhận đã hoàn tất review đó.
- Chưa có số token/chi phí đo từ dashboard. Ước tính thô cho chuỗi triển khai Phase 1: khoảng 30.000–60.000 token kể cả ngữ cảnh và kết quả công cụ; đây không phải số đo thanh toán. Chi phí tiền chưa xác định; người học cần bổ sung số liệu tài khoản nếu có.
- Tiết kiệm bằng cách dùng chung core, không framework build, không asset/model ảnh ngoài, test qua CLI trước, giữ scope Phase 1. Không thêm tính năng để dùng hết quota.

## Đánh giá ngắn

- Logic và CLI đã có test/output thật; kết quả cụ thể ở summary.json và tests.tap.
- HTTP check chứng minh server phục vụ đủ tài nguyên, không chứng minh hình ảnh hiển thị đúng.
- Chưa có kết quả chạy trên macOS/Linux tại máy chấm; CI Ubuntu đã được cấu hình nhưng chưa mặc định tuyên bố xanh.
- Người học cần chơi thử giao diện, kiểm tra camera/HUD/nhảy/chơi lại và lưu ảnh thật. Đây là phần còn lại trước khi có thể tuyên bố đủ bằng chứng Phase 1.
- Bài học: contract và test đi trước đồ họa giúp phát hiện lỗi rõ hơn; việc không truy cập được UI phải được ghi thành giới hạn, không thay bằng tuyên bố PASS.
