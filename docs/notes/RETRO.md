# Retro — Đảo Đèn Lồng, bốn phase với AI

## Từ yêu cầu đến sản phẩm

Phase1 bắt đầu bằng PRD còn nhiều khoảng trống. Việc đọc contract và ghi giả định trước giúp giới hạn được phạm vi: một core JS chạy cả browser và headless, Three.js vendored để không phụ thuộc CDN. Người học quyết định giữ tài liệu lab, hướng dẫn sản phẩm đặt riêng. Kiểm chứng thực tế có24 test, replay đường chơi và clone local; HTTP chỉ chứng minh asset được phục vụ. Công cụ UI bị chặn nên không được gọi đó là bằng chứng WebGL.

Phase2 là chuẩn hóa, không phải thêm tính năng tùy hứng. Bản paste thiếu bảng số/palette; hỏi đúng phần thiếu hiệu quả hơn tự chọn số đẹp. Khi nhận bảng chuẩn, phải sửa thứ tự tick, bản đồ vật lý, dash, fall, Drifter/Charm/wind và campaign. Core chung giữ headless ổn định;53 test và9 fixture mới kiểm tra theo tick. Dải sao/hạt/motif chỉ là view/audio, có công tắc để không ảnh hưởng contract.

Phase3 buộc bỏ giả định đèn sáng mãi và thắng sớm. ADR ngắn giúp đổi mô hình thành fuel nguyên1/60, lịch sử ever_lit và thắng tại bình minh. Việc liệt kê test bị thay có ích hơn skip để suite xanh. Đã phủ cạn dầu, refuel/relight, drain, capacity và ưu tiên no_flames với73 test. Một commit bàn giao theo yêu cầu người học; không viết lại các tag cũ.

Phase4 chuyển trọng tâm sang đo lường và phát hành. Có79 test, bộ đo GPU chuẩn, soak một tiến trình, bảng điểm lưu đĩa, accessibility và ZIP. Benchmark thật cần cửa sổ ngoài sandbox; hai lần chạy trong sandbox timeout không được biến thành số FPS. Soak mặc định vượt20% do chi phí JIT/heap ban đầu; cấu hình interpreter/young heap nhỏ và GC tại ranh giới làm phép đo ổn định mà không nâng giả baseline. Các cờ được ghi trong contract để người chấm chạy lại đúng lệnh.

## AI sai ở đâu, phát hiện thế nào

AI từng dùng chuỗi shell bị mất dấu nháy; SyntaxError cho thấy cần file .mjs rõ ràng. Review phát hiện URL.pathname không xử lý đường dẫn Windows có khoảng trắng, sửa sang fileURLToPath. Phase2 có fixture vô tình đứng trong bục nhảy và assertion số thực tuyệt đối; sửa fixture/tolerance, không đổi luật để chiều test. Geometry cho tầng/tháp phải chặn thật; chỉ dựng hình là chưa đủ.

Phase3 phát hiện nhầm deposited mặc định của đèn đặt sáng với chi phí thắp lại. Rà soát biên cũng bắt trường hợp refuel đúng30 rồi xuống thấp ngay tick sau, và recoil kéo dài hạn đẩy ra vùng sáng. Test biên cụ thể có giá trị hơn một ca “thắng game” tổng quát. Phase4 recorder lúc đầu đọc WebGL canvas sau khi buffer đã clear: ảnh thật bị đen dù code chạy không báo lỗi. Chuyển copy vào ngay sau render, nhờ người học quay lại và kiểm tra ảnh/container MP4; file lỗi không nộp.

## Harness và cách làm hiệu quả

AGENTS.md ngắn, có lệnh chuẩn và cấm bịa bằng chứng, là harness hữu ích nhất. Gate verify giúp bắt lỗi trước bàn giao: chỉ promote output khi assertion đạt. Hook/CI giữ trong repo, không nhận công của một hook chưa bật hoặc CI chưa chạy. Test tất định theo seed và so byte với Phase3 giúp chứng minh accessibility/leaderboard không đổi gameplay. Ghi chú thay luật giữ lý do cạnh test, giảm việc hỏi lại giả định đã chốt.

Không dùng subagent hoặc thêm skill/harness cho đủ hình thức. Computer-use được đọc để thử UI nhưng bị dừng vì hạn chế URL; không tiếp tục thao tác browser bằng API UI khác. Thay vào đó, chương trình benchmark tự mở cửa sổ ứng dụng của chính nó và xuất phép đo; video do người học chơi/bấm record, không giả thành thao tác tay của AI. Giữ sự phân biệt giữa test CPU, render thật và review độc lập.

## Token, chi phí và lần làm lại

Không có dashboard thanh toán. Nhật ký ước tính thô: Phase1 khoảng30–60 nghìn token, Phase2 khoảng40–100 nghìn, Phase3 khoảng30–70 nghìn; Phase4 khoảng40–100 nghìn, gồm đọc ngữ cảnh/mã/output. Tổng khoảng140–330 nghìn token, không phải số đếm hóa đơn. Chi phí tiền chưa xác định; cần người học đối chiếu tài khoản nếu có. Tiết kiệm nhờ core chung, không npm/framework/asset ngoài, đọc đúng file, dùng CLI để kiểm tra logic, giữ sáng tạo nhỏ và gom commit bàn giao.

Nếu làm lại, mình sẽ xác nhận khả năng mở cửa sổ/ghi video ngay từ đầu, đo RSS baseline trên đúng runtime sớm hơn và thêm thử nghiệm ghi một frame trước khi nhờ quay cả đoạn. Cần ưu tiên kiểm chứng chỗ có rủi ro thực, dừng test lặp khi đã đủ bằng chứng, và dành thời gian cho người học review gameplay/menu/âm thanh thay vì tối ưu chỉ các con số headless. Sản phẩm có bằng chứng thật đáng tin hơn một checklist toàn dấu đạt nhưng chưa từng chạy.
