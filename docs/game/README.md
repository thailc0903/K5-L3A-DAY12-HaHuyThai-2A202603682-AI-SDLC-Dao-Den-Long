# Đảo Đèn Lồng — Phase 1

Game 3D góc nhìn thứ ba: giúp Mây thắp lại 5 đèn trên Đảo Bến bằng đom đóm và tránh Bóng Mực. Chỉ triển khai PRD-0/Contract v1.0; chưa có các phase sau.

README ở gốc và các tài liệu lab được giữ nguyên theo yêu cầu của người học. Đây là README của sản phẩm; đường dẫn và lệnh bên dưới tính từ **gốc repo**.

## Cài và chạy — tối đa 3 lệnh

Điều kiện: Node.js 20 trở lên đã được cài và có trong PATH; trình duyệt hỗ trợ WebGL2 trên macOS/Linux/Windows. Không cần npm install, tài khoản hoặc kết nối Internet sau khi clone; Three.js đã đi kèm mã nguồn.

```sh
git clone https://github.com/thailc0903/K5--L3A--DAY12--HaHuyThai---2A202603682--AI-SDLC-Dao-Den-Long.git dao-den-long
cd dao-den-long
node scripts/serve.mjs
```

Mở http://127.0.0.1:4173, chọn **Bắt đầu Đêm 1**. Dừng server bằng Ctrl+C. Nếu cổng đã bận, đặt biến môi trường PORT thành cổng khác.

Trên máy Windows hiện tại, nếu Node chưa có trong PATH nhưng có runtime Codex, có thể dùng `./play.ps1` trong PowerShell từ gốc repo. Script chỉ khởi động server, không cài đặt hay thay đổi cấu hình máy.

## Điều khiển và mục tiêu

| Phím/thao tác | Hành động |
|---|---|
| WASD hoặc mũi tên | Đi theo hướng camera |
| Space | Nhảy khi đang chạm đất |
| Kéo chuột trên màn game | Xoay camera |
| E | Nạp vào đèn chưa sáng gần nhất, trong 2 m |
| Q | Tỏa sáng: tiêu 1 đom đóm, xua Bóng Mực trong 5 m; hồi 3 giây |
| Chơi lại Đêm 1 | Bắt đầu lại sau khi thắng/thua |

Đom đóm được nhặt tự động trong 1 m, mang tối đa 5. Mỗi đèn cần tổng cộng 3; có thể nạp từng phần. Đèn đã sáng tạo vùng an toàn 4 m. Bị Bóng Mực chạm mất 1 ngọn lửa, có 1,5 giây bất tử tạm, không đánh rơi đom đóm. Không thể rơi khỏi đảo.

Thắp đủ 5 đèn thì thắng; hết 3 ngọn lửa hoặc hết 300 giây thì thua. Khi tab ẩn, bản có giao diện tạm dừng bước mô phỏng; headless không phụ thuộc trình duyệt.

## Điểm

- Mỗi đom đóm nhặt được: 10 điểm.
- Mỗi đèn tự thắp: 100 điểm.
- Khi thắng: thêm `floor(thời gian còn lại)` + `25 × số ngọn lửa còn lại`.
- Nạp và làm choáng không có điểm riêng. Đèn/thực thể đặt sẵn trong scenario không được tính thành tích khởi tạo.

Giả định và thứ tự xử lý chi tiết: [phase-1-spec.md](../notes/phase-1-spec.md). Tuning thực tế: [game.contract.json](../../game.contract.json).

## Kiểm tra và headless

Kiểm tra cú pháp/build không cần cài phụ thuộc:

```sh
node scripts/check.mjs
```

Chạy toàn bộ kiểm chứng tự động và tạo lại bằng chứng thật:

```sh
node scripts/verify.mjs
```

Chạy headless theo contract, không cần trình duyệt/GPU:

```sh
node scripts/headless.mjs --seed 12 --night 1 --ticks 600 --out test-output/run.jsonl
```

Ví dụ scenario thắng, có snapshot mỗi tick:

```sh
node scripts/headless.mjs --seed 12 --night 1 --scenario tests/scenarios/win.json --inputs tests/scenarios/win-inputs.json --ticks 60 --snapshot-every 1 --out test-output/win.jsonl
```

Đầu ra là JSONL; snapshot tick 0 trước input, một bước tạo trạng thái tick kế tiếp, dòng cuối luôn là end. Exit 0 khi chạy hợp lệ, 2 khi inputs/scenario hoặc tham số sai, mã khác 0 khi lỗi chạy khác.

Phát lại đường chơi thắng trên **màn mặc định**, không dùng scenario thay đổi màn:

```sh
node scripts/headless.mjs --seed 12 --night 1 --inputs docs/proof/phase-1/playthrough-inputs.json --ticks 18000 --out test-output/replay.jsonl
```

## Bằng chứng và harness

- [Ma trận bằng chứng](../proof/phase-1/README.md): ánh xạ yêu cầu tới test/output và các giới hạn kiểm chứng.
- [Nhật ký AI và đánh giá Phase 1](../notes/phase-1-ai-log.md).
- [AGENTS.md](../../AGENTS.md) hướng dẫn AI; script verify là cổng kiểm chứng trả nonzero khi sai.
- `.githooks/pre-commit` chạy build check và test. Cài hook bằng `git config core.hooksPath .githooks` sau khi Node có trong PATH.
- GitHub Actions chạy kiểm chứng trên Ubuntu mỗi lần push/PR. Chỉ xem là đã đạt trên Linux khi có run CI thật xanh.
- Người học cần tự review và chơi thử giao diện trước khi chốt nộp; không coi kết quả test logic là bằng chứng đồ họa.

## Sáng tạo của tôi

Chưa thêm cơ chế ngoài PRD-0. Mô hình Mây, nón lá, đèn và đảo được dựng bằng hình khối để thể hiện yêu cầu; không thêm thực thể gameplay ngoài contract.

## Giấy phép

Xem [CREDITS.md](../../CREDITS.md) và [LICENSE](../../LICENSE). Không có API key, dịch vụ tài khoản hoặc asset tải từ Internet trong lúc chơi.
