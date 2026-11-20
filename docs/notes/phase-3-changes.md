# Test và giả định được thay — Phase 3

Không xóa hoặc skip test cũ. Các test còn hiệu lực được chạy lại trong cùng suite và 9 fixture CLI Phase 2 được chạy bằng core v1.2, xuất kết quả vào bằng chứng Phase 3. Không sửa các output/tag lịch sử.

| Test/giả định Phase 2 | Cập nhật và lý do theo Ticket-03 |
|---|---|
| Tuning v1.1, thời gian 300/330/360 | v1.2, 240/270/300 và 8 tuning dầu/ngưỡng/sức chứa mới |
| Điểm nạp +10, thời gian còn lại ×2 | Nạp +5; thêm thắp lại +40, drain pulse tổng +15, thưởng bình minh theo dầu; bỏ key/thưởng thời gian |
| Movement sau 60 tick còn 299 s; pause còn 300 s | Còn 239 s/240 s theo thời lượng mới; kiểm tra vận tốc/pause giữ nguyên |
| Partial deposit 6 đom đóm được 160; deposit 3 được 30; pickup+nạp10 được 200 | Lần lượt 130, 15, 150. Giữ cùng fixture/thứ tự đầu vào, đổi assertion điểm đúng luật mới |
| Tất cả đèn sáng thắng ngay + time bonus | Đổi thành xác nhận vẫn `playing`, không thưởng thời gian; hết Ngọn Lửa vẫn thua |
| Đèn cuối đúng bình minh trả `all_lit` | `dawn_survived`; bổ sung ngưỡng 3/5,4/6,5/7, dầu cạn/thắp lại/hit/rơi ở tick cuối |
| Campaign/CLI win fixture time_left_s=121, thắng sau1tick với590 | time_left_s=1/60; thắng đúng bình minh, điểm1046/1195/1344 theo số đèn. Campaign vẫn không cộng lặp và retry giữ điểm trước |
| Benchmark Đêm3 21600 tick | 18000 tick = 300s, đủ tới bình minh mới; vẫn hai lượt so byte, giới hạn30s; tách scenario Phase3 |
| Settings chỉ volume/sensitivity/creative | Giữ các assertion, thêm colorblind lưu/reload và mặc định false cho dữ liệu cũ |
| Wander ngẫu nhiên, đèn sáng luôn chặn | Wander chọn đèn yếu/tắt; safe chỉ khi fuel≥30. Test chase/hit/evacuate cũ giữ, thêm biên30 và tương tác với recoil |
| HUD tối đa10, chỉ hướng đèn tắt | HUD động10–20; E theo đèn nhận được; chỉ dẫn bổ sung đèn yếu; mục tiêu giữ sáng tới bình minh |

Các test mới phủ: dầu nguyên/quanta, cạn một lần, partial relight, full-refuel exclusion, ceil/clamp, capacity/reset, nhiều drain cộng dồn/cadence, chọn đèn theo id, chuyển trạng thái, pulse15/5, pause dầu, thứ tự tick cuối, non-colour shape/tear, blink1Hz, đổi màu mắt/viền không thay snapshot. Tên và kết quả từng test được sinh trong tests.tap.

Giữ các giả định không bị thay từ Phase 2, gồm điểm xuất phát Đêm3 (0,0,−30), spawning60tick và phần visual/audio procedural. Chi tiết quyết định mới: [ADR-003](phase-3-adr.md).
