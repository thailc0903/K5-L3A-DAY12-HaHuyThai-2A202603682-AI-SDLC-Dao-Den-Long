# Nhật ký AI và đánh giá — Phase 3

- Yêu cầu người học: thực hiện Ticket-03 đúng phạm vi, ít commit. Gom mã, test và bằng chứng thành một commit Phase3 rồi push main/tag phase-3; không tạo thêm nội dung Phase4.
- Giữ README và năm hướng dẫn lab gốc; hướng dẫn sản phẩm cập nhật riêng ở docs/game/README.md. Không sửa tag/output Phase1–2.
- Đọc core, schema, UI, test, gate và hướng dẫn nộp; chọn quanta nguyên 1/60 để tránh lỗi ngưỡng/floor/ceil. Ghi ADR và bảng thay test, không bỏ qua test cũ.
- Sai sót AI phát hiện khi rà soát: khởi tạo đèn đã sáng không được đổi deposited mặc định10 thành relight_cost5 chỉ vì ever_lit vừa true. Sửa để không đổi dữ liệu lịch sử/thưởng khởi tạo.
- Rà soát ca biên: refuel lên đúng30 có thể xuống dưới30 ngay tick sau; lưu đợt đẩy đã bắt đầu để vẫn đẩy ra mép trong30tick, và tránh recoil60tick kéo dài hạn đẩy. Có test trực tiếp cho cả hai trường hợp.
- Kiểm chứng dùng gate thật: build, HTTP, unit/core/settings/campaign/CPU scene, CLI Phase2 còn hiệu lực, CLI dầu mới, thắng từng Đêm và hai lượt đủ18000tick. Không sửa output TAP/JSONL bằng tay. Số đo/môi trường/hash nằm trong summary.json.
- Xuất Git index sang thư mục trống trước commit, chạy gate73/73 và so hash nguồn cùng toàn bộ24 file JSONL: khớp. Lưu summary nguyên từ lần chạy export và kết quả so sánh tự động; không gọi export này là remote clone. Sau một commit bàn giao sẽ kiểm tra clone local của commit đó trước push, không thêm commit chỉ để cập nhật số đo.
- Không cài package, không tải asset hoặc thêm hệ thống gameplay sáng tạo ngoài ticket. Giữ dải sao/hạt sáng/motif; thêm thanh dầu/hình rách và màu dễ phân biệt bằng Three.js/CSS hiện có.
- Cập nhật AGENTS.md và CI để dùng v1.2, thêm bảo vệ bằng chứng Phase3 đang sinh. Giữ các harness cũ; không dùng skill tùy chỉnh hoặc subagent.
- Công cụ browser ở phiên làm việc trước không có browser host khả dụng. Chưa kiểm tra WebGL/pixel/HUD/localStorage/âm thanh thực và FPS GPU; không suy diễn kết quả từ CPU scene tests. CI Linux và review độc lập của người học chỉ được xác nhận sau khi có kết quả thực.
- Token/chi phí: không có bộ đếm thanh toán. Ước tính thô khoảng30.000–70.000 token gồm ngữ cảnh, đọc mã, chỉnh sửa và output của Phase3; không phải số đo. Chi phí tiền chưa xác định. Tiết kiệm bằng dùng core chung, không thêm dependency/asset, giữ đúng ticket và gom một lần bàn giao.

## Retro ngắn

Các ranh giới theo tick hữu ích hơn chỉ kiểm tra kết quả thắng: 30 dầu thật khác snapshot30.0, hao dầu trước E, hết máu ưu tiên ở tick cuối. Cần review trạng thái chuyển tiếp, không chỉ công thức dầu. Chỗ chưa kiểm chứng được ghi rõ trong bằng chứng; người học cần chơi/review độc lập thay vì coi test tự động là demo game hoàn chỉnh.
