# Phase 4 — thiết kế phát hành và kiểm chứng

Áp dụng Ticket-04, Contract v1.3; không đổi tuning hoặc Game của v1.2. Mỗi lệnh chạy từ gốc repo, Node20+.

## Benchmark chuẩn

`node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`

Runner khởi tạo server loopback/port trống, mở cửa sổ app Chrome (nếu không có thì Edge/Chromium) 1280×720 với profile tạm riêng; không điều khiển tab/tài khoản có sẵn. `BENCH_BROWSER` cho chọn đường dẫn thực thi. Tự đóng cửa sổ sau khi nhận báo cáo, exit0; lỗi/timeout exit1, không tạo số liệu giả. Giữ cửa sổ hiện trong suốt33s.

Cảnh dùng Game và GameView thật của Đêm1, 200 shade wander và100 motes rải đều theo đĩa/góc vàng với xoay có seed. L1–L3 lit/fuel100. Chỉ bước AI wander; player đứng nguyên gốc, tắt perception/chase của player, spawn/hit/pickup/fuel/time/end. Shade vẫn chọn đèn tắt và chịu vùng an toàn như luật wander hiện hành. Sau30s nhiều shade có thể cùng tới gần đèn tắt; không bớt số con hoặc giảm model để đo nhanh hơn.

Camera `(30*cos(a),15,-30*sin(a))`, `a=2π*t/15`, nhìn gốc, CCW từ +X. Tắt sáng tạo; giữ hình khối, motes/glow, ánh sáng, safe rings, fuel bars chuẩn. Đo requestAnimationFrame: cửa sổ đo30s sau3s warmup; chỉ lấy frame nằm trọn trong cửa sổ, không lấy frame băng qua ranh giới. avg/p1 theo công thức ticket, p95 dùng nearest rank `ceil(.95*N)`. `load_ms` từ `performance.timeOrigin` của tiến trình Node đến render đầu; cold shader/model build nằm trong thời gian này.

WebGL/requestAnimationFrame không có API chuẩn để tắt vsync: xuất `vsync_off:false`, không dùng cờ thử nghiệm che giới hạn. Web không đọc RSS renderer/GPU/multiple processes một cách đáng tin: `peak_mem_mb:null`. Không lấy JS heap hoặc RSS của Node launcher thay cho RSS renderer. bench-context.json lưu seed/thời lượng/độ phân giải/hash nguồn cùng lần đo.

## Soak và bộ nhớ

`node --jitless --expose-gc --max-semi-space-size=1 scripts/soak.mjs --seed 7 --nights 10 --out soak.json`

Một tiến trình mô phỏng cả10 Đêm, vòng1→2→3; chỉ giữ Game hiện tại và mảng kết quả chuỗi. Đánh chỉ số i từ0, seed7+i. Mỗi30tick chọn góc ngẫu nhiên, mỗi tick lấy bốn Bernoulli riêng cho jump5%,dash3%,pulse2%,interact10%; xử lý input theo cạnh vẫn là luật game. Dừng mỗi Đêm khi terminal hoặc đủ thời lượng chuẩn, reset để lấy RSS cuối sau reset Đêm thứ10.

Đo RSS thật bằng process.memoryUsage().rss, MB=bytes/1048576, sau khi dựng Đêm đầu và sau reset cuối; GC tại hai ranh giới. Thử mặc định cho thấy RSS tăng do JIT/young heap (~29% ở lượt đầu), không crash. Chọn runtime soak interpreter và young generation1MB để giảm chi phí biên dịch/heap tạm, không thêm allocation để nâng baseline và không trừ bộ nhớ khỏi số đo. Chậm hơn nhưng vẫn chạy đủ logic/seed chuẩn, không render/sáng tạo. Cấu hình được khai báo công khai trong soak_cmd, không phải cờ bí mật chỉ dùng khi chấm. Đây là kiểm tra Node headless, không chứng minh browser renderer không rò bộ nhớ.

## Bảng xếp hạng

Server lưu `.local/leaderboard.json`, JSON atomic qua file tmp/rename; POST được xếp hàng để tránh ghi đè khi đồng thời. Không commit file điểm của người dùng hoặc đóng gói nó vào Release. Có thể đặt LEADERBOARD_PATH; mặc định lấy theo thư mục ứng dụng, không theo cwd tùy ý. GET từ menu; sau thua bất kỳ Đêm hoặc Bình Minh có form tên. Điểm chỉ là tổng các Đêm đã thắng, không cộng điểm Đêm thua. Tên3–12 ASCII theo ticket, top10 giảm score, hòa tăng achieved_at; server tạo ISO UTC. Một Game không lưu lặp qua cùng form. `node scripts/serve.mjs --export-leaderboard out.json` xuất trực tiếp từ đĩa và thoát, không mở server.

## Accessibility và video

Settings v1 migrate dữ liệu cũ bằng defaults: chín action có binding riêng, phát hiện trùng, khôi phục, lưu localStorage. Arrow/P/ShiftRight vẫn làm alias khi đang dùng mặc định và chưa được gán cho action khác. HUD/nhắc E/cooldown theo binding mới. Spawn có chữ/mũi tên ở mép trong5s; gió có cảnh báo trước; ≤10s có chữ đếm; đèn yếu có chữ và blink. Font HTML ít nhất18px tại1280×720, chữ lớn1.25×; reduce motion bỏ pulse/particles/bobbing và CSS animation, không thêm rung camera hoặc chớp toàn màn.

Người học đã chơi và bấm record/stop trực tiếp. Video chỉ canvas game cộng HUD đọc trạng thái và số liệu đã sinh trước đó; không ghi desktop, cửa sổ khác hoặc âm thanh. Lần đầu recorder dùng setInterval ngoài render làm hình đen; bị loại khỏi bàn giao. Bản sửa copy canvas ngay sau render trong cùng RAF, file quay lại có hình đúng. video-check.mjs đọc thời lượng từ mvhd hoặc tfdt/trun của fragmented MP4; metadata recorder là thời gian tường nên có thể dài hơn timeline media.

Video hiển thị benchmark142.6FPS/test79 ở thời điểm quay: giữ nguyên output khi đó trong bench-video-reference.json và summary-video-reference.json. bench.json là lần đo cuối với mốc thời gian tiến trình/hash nguồn; không sửa tay video hoặc các output để đổi số.

Giữ thêm bench-slow-run.json/context: có một lượt avg116.7FPS nhưng1%low6.96, không được đánh dấu đạt. Đo lại khi giữ cửa sổ hiện cho kết quả avg140.8/1%low71.5; các frame chậm vẫn được giữ nguyên trong thống kê. bench-context.json ghi visibility/focus của lượt cuối; không kết luận chắc nguyên nhân của lượt chậm khi lượt đó chưa ghi visibility. Không xóa kết quả không đạt để che dao động.

## Bàn giao và giới hạn

README gốc giữ nguyên theo câu trả lời mới nhất của người học, dù Ticket04 chỉ định README sản phẩm ở gốc; docs/game/README.md và START-HERE.txt trong ZIP chỉ tới hướng dẫn sản phẩm. Không lặp lại yêu cầu đổi README. Package ZIP chứa source, Three vendored, scripts, tests, docs và video; không cần npm/network sau khi tải. Người dùng cần Node20+ và trình duyệt WebGL2.

Gate:79 test,18 scenario, thắng3Đêm bằng fixture,18.000tick hai lần, so từng byte24JSONL với phase-3, soak/crash/RSS, kiểm tra cấu trúc/thời lượng video và hash nguồn benchmark. CI chỉ xác nhận các bước nó thật sự chạy; dùng bench đã commit để kiểm tra tính toàn vẹn, không giả vờ có GPU benchmark ở CI. Kiểm tra ZIP/clone sạch trước commit/tag; giữ tag/bằng chứng Phase1–3. Mọi test ẩn chỉ giảng viên có mới xác nhận được, không tự tuyên bố đã chạy chúng.

Hạn chế cần review độc lập: chưa kiểm tra bằng mắt mọi menu/cỡ chữ/key mapping trên tất cả kích thước, chưa nghe/xác nhận đầy đủ âm thanh, chưa thử macOS; không khẳng định số tham khảo sẽ bằng số trên máy chấm. Hạn nộp theo Coach, không có mốc bắt đầu để chứng nhận đúng hạn.
