# Đảo Đèn Lồng — Phase 3

Game 3D góc nhìn thứ ba qua ba Đêm: Đảo Bến, Đảo Cầu Tre, Đảo Tháp Chuông. Điều khiển Mây gom đom đóm, thắp/châm dầu và **giữ đảo sáng tới bình minh**. Triển khai PRD-0 + Ticket-02 + Ticket-03, Test Contract **v1.2**.

README gốc và các tài liệu lab được giữ nguyên theo lựa chọn người học. Đây là hướng dẫn sản phẩm; mọi lệnh dưới đây chạy từ **gốc repo**.

## Cài và chạy trong 3 lệnh

Điều kiện: Node.js 20+ trong PATH và trình duyệt hỗ trợ WebGL2. Chạy macOS/Linux/Windows; không cần npm install, tài khoản hoặc Internet sau clone vì Three.js đã đi kèm.

```sh
git clone https://github.com/thailc0903/K5-L3A-DAY12-HaHuyThai-2A202603682-AI-SDLC-Dao-Den-Long.git dao-den-long
cd dao-den-long
node scripts/serve.mjs
```

Mở http://127.0.0.1:4173 và chọn Bắt đầu hành trình. Nếu đã mở bản cũ, tải lại trang để nhận luật và giao diện mới. Dừng server bằng Ctrl+C. Đổi biến môi trường PORT nếu cổng bận.

Máy Windows hiện tại có thể dùng `./play.ps1` trong PowerShell: script tìm Node trên PATH hoặc runtime Codex sẵn có, không cài đặt hoặc đổi cấu hình máy.

## Chơi ba Đêm

Menu → giới thiệu Đêm và lời Ông Đăng → chơi → kết quả → Đêm tiếp. Thua được chơi lại chính Đêm đó; thắng Đêm3 hiện Bình Minh với tổng điểm các Đêm đã thắng.

| Thao tác | Hành động |
|---|---|
| WASD / mũi tên | Di chuyển theo hướng camera |
| Space | Nhảy khi chạm đất |
| Shift | Lướt; đang đứng yên thì theo hướng mặt |
| Kéo chuột | Quay camera |
| E | Nạp/thắp lại/châm dầu đèn nhận được gần nhất trong 2 m, hòa chọn id nhỏ |
| Q | Tỏa Sáng, tiêu 3 đom đóm, hồi 3 s |
| Esc / P | Tạm dừng; Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

Nhặt tự động trong 1 m và chênh cao ≤1,5 m. Túi ban đầu10, tăng2 sau mỗi lần thắp/thắp lại thành công, tối đa20; đặt lại đầu Đêm. Đèn chưa từng sáng cần10, thắp lại chỉ5 và nhớ tiến độ nạp. Mỗi lần thắp có100 dầu; hao1/giây. E tại đèn sáng dùng mỗi đom đóm thêm10 dầu, tối đa100. Đèn đầy không nhận; đèn cạn tắt và mất tiến độ nạp.

Đèn còn ≥30 dầu bảo vệ trong6 m. Dưới30 đèn/thanh dầu nhấp nháy1Hz, mất vùng an toàn; Bóng Mực đang wander tìm đèn yếu và hút thêm5 dầu/giây/con trong2 m. Q ngắt hút/choáng/đẩy; châm dầu đủ30 cũng đẩy con bên trong ra. Bóng Mực gây mất1 Ngọn Lửa và rơi nửa số đom đóm; bạn có90 tick bất tử. Rơi xuống dưới Y=−10 mất1 Ngọn Lửa và toàn bộ đom đóm, chờ1 s rồi hồi sinh nếu còn sống.

Đêm2 có cầu không lan can và bục nhảy phóng sang đảo kia. Gió Lạc cướp đom đóm; pulse khi nó đang flee để đòi lại. Bùa đỏ tăng chạy lên7,2 m/s, bỏ hồi dash trong10 s. Đêm3 cần dùng dốc/bục để lên tầng; lá và âm thanh báo gió mạnh trước2 s.

Thắp đủ không kết thúc sớm. Sống tới bình minh với ít nhất **3/5, 4/6, 5/7** đèn đang sáng tương ứng Đêm1/2/3 để thắng. Hết Ngọn Lửa luôn thua trước, kể cả tick cuối; tới bình minh thiếu đèn cũng thua. Thời gian: **240/270/300 s**. Quyết định/biên tick ở [ADR-003](../notes/phase-3-adr.md); luật Phase2 không bị thay vẫn giữ.

## Điểm chuẩn

- Nhặt không cộng điểm; mỗi đom đóm **nạp hoặc châm dầu** +5.
- Thắp lần đầu +100; thắp lại +40.
- Mỗi Bóng Mực trúng Tỏa Sáng tổng +15 nếu đang hút dầu ngay trước pulse, các trạng thái khác +5.
- Bình minh chỉ khi thắng: mỗi đèn đang sáng +`50+floor(fuel)`; mỗi Ngọn Lửa còn lại +50. Bỏ thưởng thời gian.
- Tổng hành trình chỉ cộng điểm Đêm đã thắng; retry không cộng lặp.

Ví dụ thắp lại ngay tick bình minh cần5: +25+40. Nếu cuối tick có3 đèn với dầu99,98/99,98/100 và3 Ngọn Lửa: thưởng149+149+150+150, tổng điểm mới663. Đèn đặt lit sẵn trong scenario không tự cộng điểm hoặc đếm successful_lights.

## Cài đặt, âm thanh và sáng tạo

Cài đặt ở menu hoặc pause có âm lượng, độ nhạy chuột và **Bảng màu dễ phân biệt**; lưu localStorage trên trình duyệt. Chế độ dễ phân biệt đổi mắt/viền Bóng Mực sang xanh #00B3FF, cảnh báo UI trắng kèm⚠. Đèn tắt xẹp20% và giấy rách; đèn yếu nhấp nháy, không cần màu để phân biệt. Âm thanh procedural gốc gồm nhạc đêm và SFX theo hành động; được mở sau thao tác bắt đầu chơi.

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

Ví dụ Bóng Mực hút dầu:

```sh
node scripts/headless.mjs --seed 12 --night 1 --ticks 120 --scenario tests/scenarios/phase-3/drain.json --snapshot-every 1 --out test-output/drain.jsonl
```

Snapshot tick0 trước input, có event night_start tại0; bước k dùng input k tạo trạng thái k+1. Khi paused, tick tăng và sim_tick đứng yên. Dòng cuối luôn là end. JSON/shape đầu vào sai trả exit2, thông báo stderr; chạy hợp lệ exit0; lỗi chạy khác nonzero.

Manifest `tests/scenarios/phase-3/cases.json` có9 scenario mới; verify cũng chạy lại9 scenario Phase2 còn hiệu lực. Gate còn chạy fixture thắng bình minh từng Đêm, test chiến dịch/cài đặt và hai lần18.000 bước để so byte/đo thời gian. Bằng chứng ở [docs/proof/phase-3](../proof/phase-3/README.md); bằng chứng Phase1–2 giữ nguyên, chạy bằng mã tại tag lịch sử tương ứng.

## Đo FPS thật ở 1280×720

1. Nhấn Đo FPS720p ở góc dưới trái (hoặc mở `?benchmark=1`). Drawing buffer chuyển đúng1280×720, pixel ratio1.
2. Chơi ở tab đang hiện: warmup3 s, sau đó đủ30 s đo. Pause/ẩn tab không tính vào số đo.
3. Nhấn Lưu kết quả FPS, đặt file JSON thật vào docs/proof/phase-3/ cùng cấu hình máy/ảnh. `passes` chỉ true khi đo đủ, đúng độ phân giải và trung bình ≥30 FPS. Không sửa số.

**Hiện chưa có kết quả FPS/WebGL/âm thanh do công cụ browser host không khả dụng.** Tests scene dùng backend CPU không vẽ, không phải thay thế bước này. Số đo headless CPU có trong summary.json.

## Harness và bàn giao

[AGENTS.md](../../AGENTS.md), script verify và workflow được cập nhật cho Phase3. Hook bật sau khi Node có PATH bằng `git config core.hooksPath .githooks`; CI Ubuntu chỉ coi là đạt khi có run thật xanh. Các test cũ đổi luật có lý do ở [phase-3-changes.md](../notes/phase-3-changes.md). Nhật ký AI/token/giới hạn ở [phase-3-ai-log.md](../notes/phase-3-ai-log.md). [Changelog](../../CHANGELOG.md) liệt kê breaking changes.

Giữ tag phase-1/phase-2; bàn giao mới bằng phase-3. Chưa tạo Release v1.0.0/video cuối vì thuộc Phase4. Hạn tag theo Coach, chưa có mốc giờ để xác nhận đúng hạn. Người học cần review độc lập và kiểm tra checklist UI trong bằng chứng.

Giấy phép và nguồn: [CREDITS.md](../../CREDITS.md), [LICENSE](../../LICENSE), vendor/THREE-LICENSE.txt. Không có API key hoặc dịch vụ tài khoản trong game.
