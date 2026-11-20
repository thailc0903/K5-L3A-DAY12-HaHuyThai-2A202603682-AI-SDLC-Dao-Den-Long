# Những gì Ticket-02 thay ở Phase 1

Lịch sử/tag phase-1 và docs/proof/phase-1/ được giữ nguyên. tests/game.test.mjs được cập nhật có chủ đích để kiểm chứng luật v1.1, không tắt test lỗi âm thầm.

| Nhóm test cũ | Yêu cầu mới / lý do sửa | Kiểm chứng hiện tại |
|---|---|---|
| 30 m/30 motes/3 shades khởi đầu | Bản đồ chuẩn40 m, 20 đom đóm, bóng sinh từ300 | Three standard maps; mote/shade schedule/caps |
| Đi5 m trong60 bước; nhảy6/−18 | Chuẩn6 m/s, nhảy7/−20 | Camera/diagonal/persistent input/jump/air-control regression |
| Nhặt chỉ XZ và +10 điểm | Thêm height≤1,5; điểm chỉ khi nạp | Pickup height/capacity, deposit score tests |
| Carry5/cost3, interact sau pulse | Carry10/cost10; interact trước pulse | Deposit/partial/nearest/held edges và order test |
| Pulse tốn1, XZ, đẩy ngay3 m, không điểm | Tốn3, tâm +0,8/3D, đẩy4 m trong15 bước, +5/target | Pulse3D/budget/timing/stun refresh/cooldown |
| Chase luôn, tốc2,2 | Detect12/forget18, tốc4/4,5, spawning/wander/recoil/stunned | Chase/detection/schedule/canonical states |
| Hit không rơi, safe4, đẩy ra ngay | Rơi nửa số mang, TTL480; safe6/thoát trong30 | Drop/scatter/TTL/immunity/recoil/safe tests |
| Rìa đảo chặn, không fall | Mở rìa, Y<−10 phạt, wait60 rồi respawn | Fall/bypass invulnerability/last flame/respawn |
| Thắng ưu tiên mọi điều kiện; bonus1/25 | No_flames trước, rồi won, dawn; bonus2/50 | Win/loss/tie priority/scoring tests |
| CLI chỉ night1; snapshot v1.0 | Night1–3, pause, sim_tick, arrays/fields v1.1 | CLI real fixtures, input validation, snapshot tests |
| Determinism600 bước và output1.0 | Giữ kiểm tra byte; chạy đủ21600 bước v1.1 hai lần | Benchmark-a/b và hash trong summary |
| Bộ điều khiển default-playthrough v1.0 | Route phụ thuộc bản đồ/carry/cost cũ, không hợp lệ với ticket | Bỏ helper cũ; giữ input/output ở tag1, thay bằng9 feature fixtures + thắng từng Đêm |
| Test tick0/khởi tạo không điểm | Giữ lại, thêm night_start được yêu cầu | Tick0 + construction rewards + CLI event tests |

Các chức năng GUI (flow/setting/FPS meter) có unit test riêng. Scene graph dùng Three.js thật với backend không vẽ để bắt lỗi dựng mô hình; đây không phải bằng chứng WebGL/FPS/âm thanh. Review độc lập và chơi tay vẫn phải ghi trạng thái riêng.
