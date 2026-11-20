# Bằng chứng Phase 3 — Contract v1.2

Chạy từ gốc repo: `node scripts/verify.mjs`. TAP/JSON/JSONL do script sinh; không sửa tay. [summary.json](summary.json) ghi số test, môi trường, thời gian CPU, hash nguồn chuẩn hóa LF và hash output. Bằng chứng Phase1–2 giữ nguyên, áp dụng cho tag lịch sử tương ứng.

| Yêu cầu | Bằng chứng |
|---|---|
| Tuning v1.2, toàn bộ hồi quy còn hiệu lực | build.txt, tests.tap, 9 fixture dash/pause/drifter/charm/fall/pad/tiers/wind chạy lại |
| Dầu100, trừ chính xác, cạn/reset deposited/ever_lit | oil-out.jsonl (cạn đúng tick6000), tests.tap |
| Refuel ceil/clamp/điểm, bỏ đèn đầy | refuel.jsonl; tests.tap gồm trường hợp đầy ở bước tương tác và hao trước tương tác |
| Thắp lại5, relight event/count, capacity | relight.jsonl, tests.tap |
| Drain cộng dồn, đứng yên, cadence60, dừng khi cạn | drain.jsonl, drain-repeat.jsonl; bằng byte, cạn tick110 từ20 dầu với2con |
| Pulse +15 cho drain, +5 cho con khác | drain-pulse.jsonl và tests.tap |
| Khôi phục vùng an toàn/đẩy≤30tick, không hit | safe-restored.jsonl; tests.tap có ngưỡng30 và recoil |
| Không thắng sớm khi tất cả sáng | no-early-win.jsonl |
| Thua vì dầu cạn ở bình minh / thắp lại kịp | dawn-loss-oil.jsonl, dawn-win-relight.jsonl |
| Ngưỡng3/5,4/6,5/7; no_flames ưu tiên; điểm bình minh | tests.tap; night-N-win-scenario.json và night-N-win.jsonl |
| Campaign/retry, settings cũ và colorblind lưu/reload | tests.tap, presentation tests; chưa thao tác browser thật |
| Fuelbar, đèn xẹp20%/rách, blink1Hz, mắt/viền đúng mã | tests.tap CPU scene: Three.js math/model thật, backend không vẽ |
| Đủ Đêm3 =18000tick, hai lượt ≤30s, tất định | benchmark-a/b.jsonl, summary.json; chỉ là hiệu năng CPU headless |
| Server/offline assets | http.json, build.txt |
| Bản xuất sạch từ Git index trước commit | clean-index-summary.json, clean-index-comparison.json: chạy lại gate, hash nguồn và mọi JSONL khớp; đây là export sạch, không gọi là remote clone |

Manifest `tests/scenarios/phase-3/cases.json` có9 fixture mới. Gate cũng chạy lại9 fixture Phase2 còn hiệu lực, xuất **vào thư mục Phase3 này**. Ví dụ xem Bóng Mực hút dầu:

```sh
node scripts/headless.mjs --seed 12 --night 1 --ticks 120 --snapshot-every 1 --scenario tests/scenarios/phase-3/drain.json --out test-output/drain.jsonl
```

Scenario benchmark chỉ thêm invulnerability dài và tắt gió để nhân vật đứng yên chạy tới bình minh; vẫn có sinh đom đóm/Bóng Mực/Gió Lạc. Fixture thắng đặt thời gian còn một tick để kiểm tra kết thúc, không phải bằng chứng người học đã chơi thắng ba Đêm mặc định.

## Cần kiểm tra trực tiếp trong browser

- [ ] Tải lại http://127.0.0.1:4173, intro/help/HUD đúng mục tiêu giữ sáng; không kết thúc khi thắp đủ.
- [ ] E nạp/thắp lại/châm dầu, túi tăng10→20, thanh dầu giảm; đèn tắt xẹp/rách, dưới30 nhấp nháy1Hz và mất vòng an toàn.
- [ ] Bóng Mực hút đèn yếu, Q đẩy ra; dầu được châm đủ30 đẩy con bên trong ra; menu/pause/retry và ba map vẫn chơi được.
- [ ] Bật “Bảng màu dễ phân biệt”, mắt/viền xanh #00B3FF, cảnh báo trắng kèm⚠; tải lại vẫn lưu. Đổi volume/sensitivity vẫn hoạt động.
- [ ] Nghe nhạc/SFX, quan sát camera/HUD/độ rõ thanh dầu; bật/tắt sáng tạo.
- [ ] Nút Đo FPS720p: warmup3s +30s chơi ở tab hiện; lưu phase-3-fps.json thật cùng cấu hình máy. Không chỉnh số đo.
- [ ] Review độc lập của người học, kiểm tra CI Ubuntu thực và hạn nộp theo Coach.

Các mục trên chưa được xác nhận trực quan/GPU/âm thanh. Không dùng tests scene làm bằng chứng ảnh/FPS. ADR ở [phase-3-adr.md](../../notes/phase-3-adr.md); lý do đổi test ở [phase-3-changes.md](../../notes/phase-3-changes.md).
