# ADR-003 — Đèn cạn dầu và giữ đảo sáng tới bình minh

Trạng thái: áp dụng cho Ticket-03, Contract v1.2. PRD-0 và Ticket-02 tiếp tục có hiệu lực ở những phần không bị thay. Không triển khai Phase 4.

## Quyết định về đèn

Mỗi đèn có `lit`, `deposited`, `fuelQ`, `ever_lit`, `relit_count`. `fuelQ` là số nguyên theo đơn vị 1/60 dầu: đầy = 6000; mỗi tick đang sáng trừ 1, mỗi Bóng Mực đang hút hợp lệ trừ thêm 5. Không dùng giá trị snapshot đã làm tròn để tính tương tác, vùng an toàn hoặc điểm.

- Chưa sáng lần nào: nạp đủ 10 để thắp. Đã từng sáng: nạp đủ 5 để thắp lại. Mỗi lần thắp đặt dầu 100, tăng `successful_lights`; chỉ thắp lại tăng `relit_count`.
- Sáng: E châm dầu theo `min(carried, ceil(deficitQ/600))`, cộng 600 quanta/đom đóm và chặn ở 6000. Đèn đầy không được chọn. Nạp/châm +5 mỗi đom đóm; lần đầu +100, thắp lại +40.
- Cạn: tắt ngay sau bước 2, xóa `deposited`, giữ lịch sử `ever_lit` và số lần thắp lại; phát `lantern_out` đúng một lần. Có thể thắp lại ngay ở bước tương tác trong cùng tick.
- Vùng an toàn phụ thuộc dầu thực ≥30. Snapshot có thể hiển thị 30.0 khi dầu thực là 29 + 59/60; khi đó không có vùng an toàn.
- Sức chứa là `min(20, 10 + 2*successful_lights)`. Mỗi Game/Đêm mới đặt đếm về 0; scenario có thể cung cấp đếm nhưng đèn được đặt sẵn không tự tăng đếm/điểm.

## Thứ tự tick và Bóng Mực

Giữ thứ tự Ticket-02: pause → timer → di chuyển → nhặt → tương tác → Tỏa Sáng → AI → chạm → sinh → kết thúc. Trong timer (bước 2), tổng hợp hao dầu tự nhiên và hút dầu từ các Bóng Mực đang `drain` với đèn đích còn yếu, sáng, cách ≤2 m, rồi xét đèn cạn. Bóng mới chuyển sang `drain` ở bước AI bắt đầu hút từ tick kế tiếp. Pause dừng dầu và mọi bộ đếm mô phỏng.

Chỉ `wander` chọn đèn yếu gần nhất (hòa chọn id nhỏ); không có đèn yếu thì hướng về đèn tắt gần nhất. Vẫn giữ phát hiện Mây 12 m/bỏ đuổi 18 m của Ticket-02. `chase` không đổi sang đèn yếu. `drain` đứng yên, có nhiều con thì cộng dồn. Đích không còn hợp lệ thì về `wander`; nếu vẫn hút hợp lệ nhưng Mây vào ≤6 m thì `chase`. Hết choáng về `wander`, sau đó AI có thể chuyển trạng thái tiếp ngay trong tick như Phase 2.

Châm vượt ngưỡng hoặc thắp đèn khởi động đẩy các Bóng Mực bên trong ra mép trong tối đa 30 tick; con đang hút dừng hút ngay. Bộ đếm đẩy đã khởi động tiếp tục kể cả tick sau dầu lại xuống dưới 30, bảo đảm không gây sát thương trong đợt đẩy. Recoil/choáng cũng không được kéo dài hạn 30 tick. Vùng an toàn đối với các con ở ngoài vẫn mất ngay khi dầu <30.

Ticket không chỉ rõ mốc phát `fuel_drain`: chọn **mỗi 60 tick hút hợp lệ liên tục của từng con**, không phải chia hết cho tick toàn cục. Thoát `drain` đặt lại bộ đếm. Event chứa dầu sau khi đã trừ tổng hao của tick, trước bước tương tác; không phát mỗi tick. Tỏa Sáng chấm theo trạng thái ngay trước khi bị pulse: drain tổng +15, các trạng thái khác +5.

## Quyết định về thắng/thua

Bỏ điều kiện tất cả đèn sáng kết thúc sớm và bỏ thưởng thời gian. Đêm kéo dài 240/270/300 s. Cuối **mọi** tick, sau cả chạm và sinh:

1. Hết Ngọn Lửa: thua `no_flames`, luôn ưu tiên.
2. Hết giờ: còn sống và đèn đang sáng ≥`ceil(0.6*tổng)` thì thắng `dawn_survived`; còn lại thua `dawn`.
3. Chưa hết giờ: tiếp tục, kể cả tất cả đèn đang sáng.

Chỉ thắng mới cộng `sum(50+floor(fuel thật))` cho từng đèn còn sáng và 50 cho mỗi Ngọn Lửa. Nạp lại đúng tick bình minh được tính; đèn vừa cạn ở bước 2 không được tính nếu chưa thắp lại. Campaign chỉ cộng điểm các Đêm thắng và không cộng lại khi retry, như Ticket-02.

## Scenario và đầu ra

- `lit:true` không có fuel mặc định 100, `ever_lit:true`, không tự thưởng điểm/đếm thắp; `relit_count` khởi tạo 0. Không tự suy ra số lần thắp lại từ đèn đặt sẵn.
- Fuel scenario hữu hạn trong [0,100], làm tròn về quanta gần nhất. Đèn tắt luôn có dầu 0; `lit:true,fuel:0` được chuẩn hóa thành tắt, vẫn nhớ từng sáng. `ever_lit` không thể xóa lịch sử một đèn đặt sáng.
- Scenario dùng `player.successful_lights`, `shades[].target_lantern_id`; snapshot thêm player.capacity, fuel làm tròn một chữ số thập phân, ever_lit, relit_count. Giá trị JSON là số nên 100.0 có thể được tuần tự hóa thành 100.
- Snapshot tick 0 không thưởng điểm; giữ quy ước khởi tạo/CLI của Phase 2. Điểm thưởng kết thúc phát sinh ở tick mô phỏng kết thúc, không từ các đèn đặt sẵn.

## Hiển thị và phạm vi

Thanh dầu hướng camera, tỉ lệ dầu thực; dưới 30 đèn/thanh nhấp nháy chu kỳ 60 tick (1 Hz). Đèn tắt xẹp chiều cao 20%, có đường rách giấy; không cần dựa vào màu để phân biệt. Cài đặt lưu `colorblind`: mắt/viền Bóng Mực #00B3FF thay #7A3CFF; cảnh báo UI trắng kèm ⚠. Dải sao/hiệu ứng Phase 2 vẫn chỉ ở view/audio, số sao theo số đèn **đang** sáng. Không thêm luật hoặc thực thể sáng tạo mới ở phase này.

## Hệ quả và kiểm chứng

Test cũ bị thay được cập nhật có lý do ở [phase-3-changes.md](phase-3-changes.md); không skip. Bằng chứng mới ở [phase-3](../proof/phase-3/README.md), lịch sử và bằng chứng cũ giữ nguyên. Kiểm chứng CPU scene không phải WebGL/ảnh hoặc số đo FPS thật; cần người học kiểm tra trực quan và review độc lập trước bàn giao cuối.
