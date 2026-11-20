# Đảo Đèn Lồng — Phase 2

Game 3D góc nhìn thứ ba qua ba Đêm: Đảo Bến, Đảo Cầu Tre, Đảo Tháp Chuông. Điều khiển Mây gom đom đóm và thắp đèn trước bình minh. Triển khai PRD-0 + Ticket-02, Test Contract **v1.1**.

README gốc và các tài liệu lab được giữ nguyên theo lựa chọn người học. Đây là hướng dẫn sản phẩm; mọi lệnh dưới đây chạy từ **gốc repo**.

## Cài và chạy trong 3 lệnh

Điều kiện: Node.js 20+ trong PATH và trình duyệt hỗ trợ WebGL2. Chạy macOS/Linux/Windows; không cần npm install, tài khoản hoặc Internet sau clone vì Three.js đã đi kèm.

```sh
git clone https://github.com/thailc0903/K5-L3A-DAY12-HaHuyThai-2A202603682-AI-SDLC-Dao-Den-Long.git dao-den-long
cd dao-den-long
node scripts/serve.mjs
```

Mở http://127.0.0.1:4173 và chọn Bắt đầu hành trình. Nếu đã mở bản Phase1, tải lại trang để nhận menu mới. Dừng server bằng Ctrl+C. Đổi biến môi trường PORT nếu cổng bận.

Máy Windows hiện tại có thể dùng `./play.ps1` trong PowerShell: script tìm Node trên PATH hoặc runtime Codex sẵn có, không cài đặt hoặc đổi cấu hình máy.

## Chơi ba Đêm

Menu → giới thiệu Đêm và lời Ông Đăng → chơi → kết quả → Đêm tiếp. Thua được chơi lại chính Đêm đó; thắng Đêm3 hiện Bình Minh với tổng điểm các Đêm đã thắng.

| Thao tác | Hành động |
|---|---|
| WASD / mũi tên | Di chuyển theo hướng camera |
| Space | Nhảy khi chạm đất |
| Shift | Lướt; đang đứng yên thì theo hướng mặt |
| Kéo chuột | Quay camera |
| E | Nạp đèn chưa sáng gần nhất trong 2 m |
| Q | Tỏa Sáng, tiêu 3 đom đóm, hồi 3 s |
| Esc / P | Tạm dừng; Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

Nhặt tự động trong 1 m và chênh cao ≤1,5 m, mang tối đa10; mỗi đèn cần10 và nhớ tiến độ nạp. Đèn sáng bảo vệ trong6 m. Bóng Mực gây mất1 Ngọn Lửa và rơi nửa số đom đóm; bạn có90 tick bất tử. Rơi xuống dưới Y=−10 mất1 Ngọn Lửa và toàn bộ đom đóm, chờ1 s rồi hồi sinh nếu còn sống.

Đêm2 có cầu không lan can và bục nhảy phóng sang đảo kia. Gió Lạc cướp đom đóm; pulse khi nó đang flee để đòi lại. Bùa đỏ tăng chạy lên7,2 m/s, bỏ hồi dash trong10 s. Đêm3 cần dùng dốc/bục để lên tầng; lá và âm thanh báo gió mạnh trước2 s.

Thắp đủ đèn khi còn ít nhất1 Ngọn Lửa thì thắng (kể cả đúng bước hết giờ). Hết máu ưu tiên thua; nếu chưa thắp đủ và hết giờ thì thua. Thời gian: 300/330/360 s. Tốc độ/luật chuẩn đầy đủ ở [phase-2-spec.md](../notes/phase-2-spec.md).

## Điểm chuẩn

- Nhặt không cộng điểm; mỗi đom đóm **nạp** +10.
- Mỗi đèn thắp +100.
- Mỗi Bóng Mực trúng Tỏa Sáng +5, kể cả đang choáng.
- Khi thắng: +`2*floor(giây còn lại)+50*Ngọn Lửa còn lại`.
- Tổng hành trình chỉ cộng điểm Đêm đã thắng; retry không cộng lặp.

Ví dụ nạp10 để thắp một đèn cuối, còn120,9 s và2 Ngọn Lửa: phần điểm mới =100+100+240+100=540. Đèn đặt lit sẵn trong scenario không tự cộng điểm.

## Cài đặt, âm thanh và sáng tạo

Cài đặt ở menu hoặc pause có âm lượng, độ nhạy chuột; lưu localStorage trên trình duyệt. Âm thanh procedural gốc gồm nhạc đêm và SFX theo hành động, không tải bản ghi bên ngoài; âm thanh được mở sau thao tác bắt đầu chơi.

### Sáng tạo của tôi

**Dải sao dẫn bình minh**: đèn thắp thêm sao và đường nối trên bầu trời, hạt vàng quanh đèn, âm sắc riêng theo tiến độ. Tắt bằng tùy chọn trong Cài đặt hoặc mở http://127.0.0.1:4173/?creative=0. Phần này chỉ ở view/audio, không thêm thực thể, điểm, event hoặc RNG gameplay. Headless không import chúng.

CPU scene tests xác nhận có thể bật/tắt và dựng ba map; kiểm chứng logic/headless vẫn tất định. Chưa có ảnh hoặc đo GPU thực, nên không tuyên bố visual/FPS đã đạt.

## Kiểm chứng và headless

Kiểm tra build/cú pháp: `node scripts/check.mjs`.

Chạy gate đầy đủ và sinh lại bằng chứng thật:

```sh
node scripts/verify.mjs
```

Headless không cần GPU/cửa sổ, nhận night1/2/3:

```sh
node scripts/headless.mjs --seed 12 --night 2 --ticks 1200 --out test-output/night2.jsonl
```

Ví dụ Gió Lạc trả lại đom đóm:

```sh
node scripts/headless.mjs --seed 12 --night 2 --ticks 121 --scenario tests/scenarios/phase-2/drifter-drop.json --inputs tests/scenarios/phase-2/pulse-inputs.json --snapshot-every 1 --out test-output/drifter-drop.jsonl
```

Snapshot tick0 trước input, có event night_start tại0; bước k dùng input k tạo trạng thái k+1. Khi paused, tick tăng và sim_tick đứng yên. Dòng cuối luôn là end. JSON/shape đầu vào sai trả exit2, thông báo stderr; chạy hợp lệ exit0; lỗi chạy khác nonzero.

Manifest `tests/scenarios/phase-2/cases.json` có9 scenario mới. Verify còn chạy fixture thắng từng Đêm, test chiến dịch/cài đặt và hai lần21.600 bước để so byte/đo thời gian. Bằng chứng ở [docs/proof/phase-2](../proof/phase-2/README.md); bằng chứng Phase1 giữ nguyên và phải chạy ở tag phase-1.

## Đo FPS thật ở 1280×720

1. Nhấn Đo FPS720p ở góc dưới trái (hoặc mở `?benchmark=1`). Drawing buffer chuyển đúng1280×720, pixel ratio1.
2. Chơi ở tab đang hiện: warmup3 s, sau đó đủ30 s đo. Pause/ẩn tab không tính vào số đo.
3. Nhấn Lưu kết quả FPS, đặt file JSON thật vào docs/proof/phase-2/ cùng cấu hình máy/ảnh. `passes` chỉ true khi đo đủ, đúng độ phân giải và trung bình ≥30 FPS. Không sửa số.

**Hiện chưa có kết quả FPS/WebGL/âm thanh do công cụ browser host không khả dụng.** Tests scene dùng backend CPU không vẽ, không phải thay thế bước này. Số đo headless CPU có trong summary.json.

## Harness và bàn giao

[AGENTS.md](../../AGENTS.md), script verify, hook và workflow được cập nhật cho Phase2. Hook bật sau khi Node có PATH bằng `git config core.hooksPath .githooks`; CI Ubuntu chỉ coi là đạt khi có run thật xanh. Các test cũ đổi luật có lý do ở [phase-2-changes.md](../notes/phase-2-changes.md). Nhật ký AI/token/giới hạn ở [phase-2-ai-log.md](../notes/phase-2-ai-log.md).

Giữ tag phase-1; bàn giao mới bằng phase-2. Chưa tạo Release v1.0.0/video cuối vì thuộc Phase4. GitHub đã thông báo repo chuyển sang tên đúng mẫu như lệnh clone ở trên; địa chỉ cũ chuyển hướng tới repo mới. Hạn tag theo Coach, chưa có mốc giờ để xác nhận đúng hạn. Người học cần review độc lập và kiểm tra checklist UI trong bằng chứng.

Giấy phép và nguồn: [CREDITS.md](../../CREDITS.md), [LICENSE](../../LICENSE), vendor/THREE-LICENSE.txt. Không có API key hoặc dịch vụ tài khoản trong game.
