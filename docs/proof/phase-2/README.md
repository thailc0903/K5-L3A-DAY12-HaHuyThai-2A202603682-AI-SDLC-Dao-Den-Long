# Bằng chứng Phase 2 — Contract v1.1

Sinh lại từ gốc repo bằng `node scripts/verify.mjs`. File TAP/JSON/JSONL do chương trình sinh, không sửa tay. Summary ghi môi trường chạy, thời gian thật, kết quả, hash output và hash nguồn gameplay/UI. Hash nguồn chuẩn hóa xuống dòng LF để đối chiếu được cả checkout Windows/Linux; hash JSONL so byte nguyên bản.

| Yêu cầu | File / cách kiểm chứng | Trạng thái |
|---|---|---|
| Số chuẩn và hồi quy Phase1 | tests.tap; phase-2-changes.md giải thích thay đổi | Đã chạy tự động |
| Dash, cooldown, hướng, không bất tử | dash.jsonl; tests.tap | Đã chạy CLI/logic |
| Tick paused/sim_tick/timer/TTL | pause.jsonl | Đã chạy CLI |
| Gió Lạc cướp trước hit | drifter-steal.jsonl | Đã chạy CLI |
| Pulse đòi lại đom đóm | drifter-drop.jsonl | Đã chạy CLI |
| Bùa600, respawn2700, tốc/dash | charm.jsonl và tests.tap | Đã chạy CLI/logic |
| Rơi và respawn | fall.jsonl | Đã chạy CLI |
| Cầu, bục nhảy Đêm2 | pad.jsonl và tests.tap | Đã chạy CLI/logic |
| Tầng/dốc/tháp/bục Đêm3 | tiers.jsonl và tests.tap | Đã chạy CLI/logic |
| Gió báo trước/push theo lịch | wind.jsonl và tests.tap | Đã chạy CLI/logic |
| Win từng Đêm và điểm; chuỗi3Đêm | night-N-win*.json/jsonl; campaign unit tests | Fixture thắng, không tuyên bố chơi toàn3Đêm mặc định bằng tay |
| Chạy đủ21600 bước≤30s | benchmark-a/b.jsonl; summary benchmark.elapsed_ms | Đã đo CPU, ghi cấu hình |
| Tất định | benchmark-a/b.jsonl bằng byte/hash | Đã chạy hai lần |
| Cài đặt/flow/FPS meter | tests.tap (presentation) | Đã chạy logic; chưa thao tác browser thật |
| Dựng/cập nhật scene3D | tests.tap (CPU scene) | Chạy Three.js geometry/math thật, backend không vẽ |
| Server/phụ thuộc offline | http.json; build.txt | Đã chạy HTTP/syntax |
| Clone sạch của mã cuối | clean-clone-summary.json, clone commit6b52038 | 53/53 test,9 fixture, benchmark và hash nguồn/output khớp |
| WebGL, màu pixel, HUD, camera, sound | Checklist dưới đây | Chưa xác nhận trực quan/nghe |
| ≥30 FPS tại1280×720 | Nút Đo FPS720p → Lưu kết quả FPS | Chưa có file GPU đo thật |

## Chạy lại một fixture

Manifest ở tests/scenarios/phase-2/cases.json; mỗi mục chỉ rõ night/ticks/input và chu kỳ snapshot. Ví dụ:

```sh
node scripts/headless.mjs --seed 12 --night 2 --ticks 121 --scenario tests/scenarios/phase-2/drifter-drop.json --inputs tests/scenarios/phase-2/pulse-inputs.json --snapshot-every 1 --out test-output/drifter-drop.jsonl
```

Benchmark dùng scenario invuln dài để không thua sớm, tắt gió để người đứng yên không rơi; vẫn sinh đom đóm, Bóng Mực và Gió Lạc theo lịch. Snapshot mặc định mỗi10tick. Không dùng scenario này trong game thường.

clean-clone-summary.json được sao chép nguyên từ output verify trong clone local sạch của commit6b52038, sau sửa ưu tiên bục nhảy. Các commit bàn giao sau đó chỉ bổ sung bằng chứng/tài liệu; không thay gameplay. Kết quả clone này là trên Windows, chưa tự gán thành kết quả Linux/GPU.

## Checklist người học kiểm tra trong browser

- [ ] Menu → intro có lời Ông Đăng → chơi → kết quả → Đêm2/3 → Bình Minh; thua retry giữ điểm các Đêm đã thắng.
- [ ] WASD/Space/Shift/Q/E và kéo chuột hoạt động; cầu/bục/dốc/tầng/tháp nhìn đúng; rơi/hồi sinh và vùng sáng đúng.
- [ ] Esc/P có đủ4 lựa chọn, thời gian đứng yên; mở cài đặt rồi trở lại vẫn paused.
- [ ] Đổi volume/sensitivity, tải lại trang, giá trị còn được lưu; nghe đủ SFX và nhạc nền, âm thanh đếm10s/cuồng gió báo trước.
- [ ] HUD đúng vị trí/10ô/cooldown/nhắcE; đồng hồ đỏnháy≤30s; mũi tên chỉ đúng đèn ngoài màn.
- [ ] Bật/tắt sáng tạo: dải sao/hạt/motif thay đổi, gameplay và điểm giữ nguyên.
- [ ] Nhấn Đo FPS720p, chơi đủ warmup3s +30s đo ở tab đang hiện; nhấn Lưu kết quả FPS và đặt file thật vào thư mục bằng chứng. Không chỉnh average_fps hoặc passes.
- [ ] Chụp ảnh/clip thật kèm thao tác và mã/tag; review độc lập của người học; xem CI Ubuntu thật.

Chưa xác nhận hạn tag vì không có mốc bắt đầu lab. README gốc giữ nguyên theo lựa chọn người học; hướng dẫn sản phẩm ở docs/game/README.md. Không sửa bằng chứng/tagPhase1, không tạo bàn giao cuốiPhase4 ở đây.
