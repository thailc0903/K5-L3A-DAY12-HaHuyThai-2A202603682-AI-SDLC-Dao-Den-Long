# Nguồn và công cụ

- Đảo Đèn Lồng, Mây, Đảo Bến, Bóng Mực và tài liệu PRD/hướng dẫn: nội dung gốc của bài lab Day 12. Tài liệu lab gốc được giữ nguyên; giấy phép mã bài làm không cấp lại quyền đối với các nội dung gốc của lab.
- Mã bài làm, mô hình hình khối, CSS, lời Ông Đăng và hiệu ứng dải sao: thực hiện trong repo này với sự hỗ trợ của OpenAI Codex theo yêu cầu người học. Bản đồ Phase2 theo tọa độ chuẩn của Ticket-02. Không dùng nhân vật hoặc asset từ game/phim có sẵn.
- Three.js **0.170.0**: thư viện dựng 3D, MIT; https://threejs.org/ và https://github.com/mrdoob/three.js/tree/r170. Bản vendored tải từ https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js. Giấy phép giữ nguyên ở `vendor/THREE-LICENSE.txt`.
- Phase2 có nhạc nền pentatonic và hiệu ứng âm thanh procedural gốc do mã Web Audio trong src/audio.mjs tổng hợp, được viết với hỗ trợ Codex; không dùng bản ghi/nhạc bên ngoài. Không có font tải ngoài, ảnh, mô hình mua sẵn hoặc ảnh do AI tạo. Dùng font hệ thống.
- Node.js: runtime chạy server/headless/test; https://nodejs.org/. Không được đóng gói vào repo.
- Phase4: leaderboard, đổi phím, benchmark/soak, ZIP writer và recorder được viết với hỗ trợ OpenAI Codex; không thêm asset tải ngoài. Chrome/WebGL2 dùng để đo benchmark thật; MediaRecorder/H.264 ghi canvas game do người học chơi trực tiếp. Ảnh PNG trích từ canvas đang render, không phải ảnh AI tạo. Video không có âm thanh, không ghi desktop hoặc ứng dụng khác.
