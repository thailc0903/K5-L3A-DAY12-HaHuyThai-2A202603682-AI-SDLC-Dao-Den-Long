# Nhật ký AI và đánh giá — Phase 2

- Người học yêu cầu tiếp tục Ticket-02, cho phép thêm sáng tạo hợp lý. Bản paste đầu thiếu bảng số chuẩn và palette; AI hỏi bổ sung và nhận đủ từ người học trước khi thay tuning. Không tự đoán các số chuẩn.
- Giữ stack JS/Node/Three.js và một core dùng chung; tách levels/rules/campaign/settings/audio/view/performance để thay đổi phạm vi rõ ràng. Không thêm package/network/asset tải ngoài.
- Cập nhật AGENTS.md, verify gate, hook và workflow. Không dùng skill tùy chỉnh hoặc subagent; không tạo harness dư để lấy điểm. Giữ harness đã dùng trong lịch sử.
- Thêm sáng tạo chỉ ở view/audio: dải sao, hạt sáng và motif âm sắc theo đèn. Có công tắc tắt, không tác động headless.
- Lỗi AI phát hiện khi triển khai: pulse phải xét3D và nạp phải trước pulse, không giữ thứ tự Phase1; map D3 có các vách phải chặn thật; shade scenario có tâmY0 không được coi chânY−0,8 gây đứng yên. Sửa logic và có test regression/timing.
- Hai test ban đầu sai fixture/assert: test đi khỏi tầng đặt người ngay trong bán kính bục nhảy nên bị phóng; so sánh2,8 bằng equality tuyệt đối gặp sai số float. Sửa fixture ra khỏi bục, dùng tolerance cho số thực; không đổi luật để làm test xanh.
- Rà soát view phát hiện cần tắt frustum culling của instanced motes/burst đổi vị trí, và dispose geometry/material riêng khi rebuild; sửa để tránh mất hình và tích lũy tài nguyên qua retry/chuyển Đêm.
- Có CPU scene tests dùng geometry/math Three.js thật nhưng backend không vẽ, bắt lỗi API/runtime dựng ba map. Không gọi các test này là ảnh/chơi thử/FPS thật.
- Đã chạy verify: test logic/presentation/scene,9 fixture headless, thắng từng Đêm, hai lượt đầy đủ21600 bước so byte. Các số đo thật lấy từ summary.json, không nhập tay.
- Clone sạch mã cuối commit6b52038, chạy lại gate53/53 và so hash nguồn (LF)/output JSONL với checkout đang làm: khớp. Rà soát cuối sửa ưu tiên bục khi bấm Space đồng thời; test đã kiểm tra trường hợp này.
- Kiểm tra công cụ CUA hiện tại vẫn không có browser host. Không dùng đường điều khiển trình duyệt khác để vượt hạn chế. Chưa nghe âm thanh/chụp màn hình/chơi UI hoặc đo GPU FPS thật; cung cấp nút đo720p để người học lưu kết quả.
- Số token/chi phí không có dashboard đo trong công cụ. Ước tính thô khoảng40.000–100.000 token cho chuỗi Phase2 gồm ngữ cảnh/mã/output; chưa đối chiếu thanh toán, không phải số đo. Chi phí tiền chưa xác định. Giảm ngữ cảnh bằng core dùng chung, test CLI, không tạo ảnh/asset hoặc feature ngoài ticket.

## Đánh giá

- Đã thay các giả định bị chuẩn hóa, ghi lý do sửa/bỏ test ở phase-2-changes.md, giữ tag và bằng chứng Phase1.
- Điểm mạnh: thứ tự tick và timer có test theo biên; headless nhanh hơn ngưỡng rất nhiều, output có seed tất định; map geometry/logic tách khỏi hiệu ứng.
- Chưa đạt kiểm chứng: WebGL/HUD/camera/sound/localStorage thật, FPS720p và review độc lập của người học. Workflow Linux chỉ được coi là đã chạy khi có kết quả CI thật.
- Giả định cần lưu ý: spawn Đêm3 ở (0,0,−30), vì ticket chỉ ghi spawn rõ ở Đêm1 và gốc Đêm3 nằm trong tháp. Thời gian spawning60 tick và đường wander là phần chưa được ticket chốt. Nếu Coach/trợ giảng trả lời khác thì cập nhật cùng code/test.
- Nếu làm lại: lấy đủ bảng chuẩn ngay từ đầu, ưu tiên có browser host trước khi dành thời gian cho visual polish; không dùng test logic để thay bằng chứng nhìn/nghe.
