# Bằng chứng Phase4 — Contract1.3

Gate từ gốc repo: `node scripts/verify.mjs`. Output tự sinh, không sửa tay. summary.json ghi môi trường, test, thời gian headless, soak và số đo benchmark đã chạy; source_sha256 chuẩn hóa LF để kiểm tra được trên Windows/Linux.

| Hạng mục | Bằng chứng |
|---|---|
|79 test logic/CLI/settings/scene/leaderboard/bindings/ZIP|tests.tap|
|18 scenario còn hiệu lực và fixture thắng3Đêm|các JSONL; manifest Phase2/3 giữ nguyên|
|Headless đủ18.000tick, hai lượt tất định|benchmark-a/b.jsonl; đây là đo CPU, khác GPU bench.json|
|Không đổi đầu ra headless Phase3|compatibility.json:24file so byte/hash với bằng chứng tag phase-3|
|Benchmark thật chuẩn200shades,100motes,3đèn,1280×720|bench.json,bench-context.json,bench-scene.png,machine.json|
|Công thức FPS/percentile, cảnh/camera/freeze đúng|release tests trong tests.tap; render thật riêng trong bench.json|
|Soak10Đêm cùng process, seed/input/reset/RSS thật|soak.json; cấu hình Node công khai trong soak_cmd|
|Leaderboard top10/validation/persist/restart/export/ghi đồng thời|release tests với thư mục tạm, không đưa điểm người dùng vào repo|
|Đổi9phím/conflict/reset/persistence/legacy alias|release tests, settings tests; chưa tự nhận đã thao tác tất cả phím trong browser|
|Font18px/chữ lớn/reduce motion/captions|mã CSS/view/browser + review checklist bên dưới|
|Game thật và video người học quay|game-scene.png, docs/demo/demo.mp4; demo-metadata.json,video-check.json|
|Ảnh/video không tạo bởi AI hoặc sửa frame để giống kết quả|ảnh là canvas trực tiếp; video đọc canvas ngay sau render, HUD từ trạng thái/số đo đã sinh|
|Server/asset offline|http.json,build.txt|
|ZIP giải nén sạch, nguồn/output khớp|package-summary.json,package-check.json; hai file này để ở repo, không gói vào ZIP để tránh vòng lặp hash của chính archive|

bench-video-reference.json và summary-video-reference.json là output nguyên của lượt chạy được hiển thị trong HUD video. bench.json là lượt cuối có hash/mốc bắt đầu tiến trình, nên con số có thể khác giữa các lượt. Không sửa video hoặc số đo để khiến chúng khớp giả.

bench-slow-run.json/context giữ nguyên một lượt có1%low không đạt; lượt cuối đo lại với cửa sổ giữ hiện và có theo dõi visibility. Không loại frame outlier hoặc sửa số. Xem phase-4-release.md để hiểu các lượt đo và giới hạn môi trường.

## Chạy lại

```sh
node scripts/bench.mjs --seed 42 --duration 30 --out docs/proof/phase-4/bench.json
node --jitless --expose-gc --max-semi-space-size=1 scripts/soak.mjs --seed 7 --nights 10 --out docs/proof/phase-4/soak.json
node scripts/verify.mjs
```

Chỉ chạy benchmark khi có desktop, giữ cửa sổ hiện và không chạy tải nặng khác trong33s. CLI mở profile tạm riêng, không dùng tài khoản/tab có sẵn. Nếu môi trường cách ly không hiển thị cửa sổ thì chạy trực tiếp trên desktop; không dùng headless/software-renderer giả làm GPU thật. Web không đo được RSS renderer nên null; vsync_off=false có giải thích trong README. Soak đo Node RSS sau load đầu/reset cuối, GC ở ranh giới, không lấy heap thay RSS.

Video-check đọc MP4 fragments/timestamps, không chỉ dựa vào file extension. Thời lượng media có thể ngắn hơn bộ đếm thời gian tường do init encoder/nhịp capture. MP4 không có âm thanh. Lần quay đen ban đầu đã bị loại, chỉ file quay lại có hình được nộp.

## Review độc lập còn cần

- [ ] Menu → intro → thua/retry → baĐêm/BìnhMinh và form lưu điểm; đóng/mở app xem top10.
- [ ] Đổi mọi phím, báo trùng, reset, reload; đọc HUD18px/chữ lớn trên màn1280×720.
- [ ] Spawn arrow/caption, gió,10s cuối, dầu thấp, giảm chuyển động; nghe đầy đủ nhạc/SFX.
- [ ] Đo lại trên máy chấm; xác nhận CI Linux thực và hạn nộp theo Coach.

Người học đã trực tiếp chơi/quay đoạn gameplay; chưa tuyên bố toàn bộ checklist trên đã được review. README lab giữ nguyên theo lựa chọn Phase4; hướng dẫn sản phẩm nằm docs/game/README.md và START-HERE.txt của ZIP. Tài liệu lịch sử/tag/bằng chứng Phase1–3 không sửa.
