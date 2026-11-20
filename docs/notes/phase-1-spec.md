# Phase 1 — Luật chơi và giả định

Trạng thái: đã triển khai logic, CLI và giao diện; kiểm chứng tự động ở docs/proof/phase-1/. Chưa xác nhận trực quan qua trình duyệt. Các con số dưới đây là lựa chọn của bài làm, không phải các con số bắt buộc của giảng viên. Khi PRD hoặc ticket mới thay đổi luật, phải cập nhật tài liệu, mã và test cùng nhau.

Nguồn yêu cầu: PRD-0 và Test Contract v1.0 do người học cung cấp; đối chiếu các tài liệu hướng dẫn lab trong repo.

## 1. Mục tiêu và giới hạn

- Game 3D góc nhìn thứ ba, một màn Đêm 1 – Đảo Bến, đúng 5 Đèn Lồng Lớn có id L1 đến L5.
- Mây thu đom đóm, nạp vào đèn, tránh Bóng Mực và dùng tỏa sáng để tự vệ.
- Mây đội nón lá có đèn lồng nhỏ. Đèn và đom đóm màu vàng cam; Bóng Mực và sương màu tím đen. Không có máu me.
- Có đi lại, nhảy, camera 3D, HUD, thắng/thua và chơi lại. Đảo sáng dần khi các đèn sáng.
- Logic gameplay dùng chung cho bản có giao diện và headless. Hiệu ứng không ảnh hưởng trạng thái gameplay hoặc chuỗi ngẫu nhiên của gameplay.
- Phạm vi tài liệu này chỉ gồm Phase 1; không suy đoán các ticket sau.

## 2. Bộ chỉ số chính thức của bản thiết kế

Các giá trị khai báo máy đọc nằm trong `game.contract.json` ở gốc repo. Mã game phải đọc hoặc dùng đúng bộ giá trị này; không có một bộ tuning riêng cho headless.

| Khóa tuning | Giá trị | Ý nghĩa |
|---|---:|---|
| player_speed | 5 | Tốc độ đi trên mặt phẳng XZ, mét/giây |
| carry_capacity | 5 | Số đom đóm mang tối đa |
| lantern_cost | 3 | Tổng đom đóm cần cho một đèn |
| lantern_count_night1 | 5 | Số đèn của Đêm 1 |
| pickup_radius | 1 | Bán kính nhặt, mét |
| interact_radius | 2 | Bán kính nạp vào đèn, mét |
| pulse_cost | 1 | Số đom đóm mang theo bị tiêu cho một lần tỏa sáng |
| pulse_radius | 5 | Bán kính tỏa sáng, mét |
| night1_duration_s | 300 | Thời lượng mặc định của màn, giây |
| flames | 3 | Số máu ban đầu, thể hiện bằng ngọn lửa |
| invuln_s | 1.5 | Bất tử tạm sau khi trúng đòn, giây |
| hit_drop_ratio | 0 | Không đánh rơi đom đóm khi trúng đòn |
| pulse_stun_s | 2 | Thời gian choáng, giây |
| pulse_push_m | 3 | Khoảng đẩy lùi của tỏa sáng, mét |
| pulse_cooldown_s | 3 | Hồi chiêu tỏa sáng, giây |
| safe_radius | 4 | Bán kính vùng an toàn quanh đèn đã sáng, mét |
| shade_speed | 2.2 | Tốc độ Bóng Mực, mét/giây |
| shade_hit_radius | 0.8 | Khoảng cách để Bóng Mực gây sát thương, mét |
| fall_enabled | false | Không có sát thương do rơi |

Sức chứa 5 cho phép mang đủ 3 đom đóm thắp một đèn và 2 đom đóm để tự vệ. Tỏa sáng không có điểm thưởng, tránh việc trì hoãn mục tiêu để kiếm điểm bằng cách làm choáng liên tục.

## 3. Bố trí màn mặc định

Các thông số bố trí dưới đây là giả định thiết kế bổ sung, không thêm khóa tự đặt vào Test Contract v1.0.

- Đảo hình tròn bán kính 30 m; mặt đất Y = 0. Vị trí chân Mây ban đầu là [0, 0, 0].
- Đèn j (j = 0…4, id L(j+1)) ở [20 × sin(2πj/5), 0, 20 × cos(2πj/5)]. Ban đầu đều chưa sáng và deposited = 0.
- Có 30 đom đóm, không tự tái sinh. Mỗi khu vực quanh một đèn có 6 con, đặt cách chân đèn 4 m theo 6 hướng cách đều. Tổng chi phí thắp đèn là 15; phần dư dùng cho tỏa sáng hoặc chưa nhặt.
- Có 3 Bóng Mực ban đầu, trên đường tròn bán kính 26 m, góc lần lượt là α, α + 2π/3, α + 4π/3. α được lấy từ bộ sinh giả ngẫu nhiên có seed. Không sinh thêm Bóng Mực trong Phase 1.
- Các cờ random_motes/random_shades quyết định có tạo quần thể mặc định tương ứng hay không. Danh sách motes/shades trong scenario, nếu có, thay thế quần thể tương ứng; random_* = false cấm tự bổ sung ngoài danh sách. Mảng rỗng nghĩa là không có thực thể.
- Chỉ giới hạn bước di chuyển của Mây tại mép đảo, cho phép bắt đầu đúng vị trí được scenario chỉ định. Không âm thầm sửa tọa độ khi dựng scenario.

## 4. Di chuyển và điều khiển

- WASD hoặc phím mũi tên để đi; Space nhảy; E nạp đèn; Q tỏa sáng; kéo chuột xoay camera; nút Chơi lại sau khi kết thúc.
- Vector di chuyển xoay theo cam_yaw_deg và được chuẩn hóa đúng công thức trong contract. Chạy chéo không nhanh hơn chạy thẳng.
- Giả định nhảy: vận tốc ban đầu 6 m/s, trọng lực 18 m/s²; chỉ nhảy khi đang chạm đất. Tích phân mỗi bước: vy -= 18/60, sau đó y += vy/60; nếu y <= 0 thì đặt y = 0 và vy = 0. Không có nhảy hai lần trên không.
- Bán kính nhặt, nạp, sát thương và tỏa sáng đều tính trên XZ, bao gồm biên khoảng cách bằng bán kính. Nhảy không làm né các phép đo khoảng cách này.
- Các nút jump, interact, pulse chỉ kích hoạt ở cạnh false → true. Giữ nút không lặp hành động; nhả nút rồi nhấn lại mới kích hoạt lần nữa.

## 5. Nhặt và nạp đom đóm

- Nhặt tự động khi đom đóm nằm trong pickup_radius và carried < carry_capacity. Mỗi con tăng carried thêm 1, cộng 10 điểm và phát mote_picked với số carried sau khi nhặt.
- Nếu có nhiều con trong tầm, nhặt theo id tăng dần cho tới khi đầy. Con chưa nhặt vẫn ở lại bản đồ.
- Nhấn interact chọn đèn chưa sáng gần nhất trong interact_radius; hòa khoảng cách thì chọn id tăng dần. Không có đèn hợp lệ hoặc carried = 0 thì không làm gì.
- amount = min(carried, lantern_cost - deposited). Giảm carried theo amount; tăng deposited đúng amount; phát deposit với amount và deposited sau nạp.
- Cho phép nạp nhiều lần. Khi deposited đạt 3, đặt lit = true, cộng 100 điểm và phát lantern_lit một lần. Đèn đã sáng không nhận thêm đom đóm.

## 6. Tỏa sáng và Bóng Mực

- Tỏa sáng hợp lệ khi có cạnh nhấn pulse, carried >= 1 và đã hết hồi chiêu. Ban đầu có thể dùng ngay.
- Mỗi lần hợp lệ tiêu 1 carried, kể cả khi không có Bóng Mực trong tầm. Phát một event pulse; stunned_ids sắp theo id, có thể rỗng.
- Bóng Mực trong pulse_radius bị choáng 120 bước tiếp theo, tính cả bước dùng pulse, và bị đẩy xa Mây 3 m. Nếu trùng tọa độ XZ với Mây, hướng đẩy mặc định là +X. Bị pulse lần nữa thì làm mới thời gian choáng và đẩy lại.
- Bóng Mực đang choáng không đuổi và không gây sát thương. Khi hết choáng, chuyển về chase. Không cộng điểm khi làm choáng.
- Hai lần tỏa sáng hợp lệ cách nhau ít nhất 180 tick, đồng thời vẫn phải có cạnh nhấn mới.
- Bóng Mực hoạt động tiến thẳng về Mây với tốc độ 2.2 m/s, không đi quá vị trí đích trong một bước.
- Đèn đã sáng tạo vùng an toàn bán kính 4 m. Mây trong vùng an toàn không bị Bóng Mực gây sát thương; Bóng Mực từ ngoài không đi vào bên trong vùng đó. Nếu một đèn vừa sáng bao phủ Bóng Mực, hoặc scenario đặt nó bên trong vùng, giữ nguyên vị trí lúc dựng scenario và cho nó rút ra biên vùng an toàn trong bước xử lý AI; không gây sát thương trong lúc ở vùng an toàn.
- Mỗi bước Mây nhận tối đa một đòn. Nếu nhiều Bóng Mực đủ điều kiện, xử lý con có id nhỏ nhất. Mất 1 flame, không rơi đom đóm, phát player_hit với by = shade và dropped = 0.
- Đòn ở tick t chặn sát thương tiếp theo đến trước tick t + 90; có thể nhận đòn lại từ tick t + 90.
- Không có rơi khỏi đảo, không phát player_hit với by = fall.

## 7. Thắng, thua và điểm

- Thắng khi cả L1…L5 đã sáng: state = won, game_over reason = all_lit.
- Thua khi flames = 0: state = lost, reason = no_flames. Thua khi hết thời gian: reason = dawn.
- Nếu cùng một bước đạt nhiều điều kiện kết thúc, ưu tiên all_lit, rồi no_flames, rồi dawn. Chỉ phát game_over một lần.
- Điểm hành động = 10 × số đom đóm đã nhặt + 100 × số đèn đã tự thắp. Nạp đom đóm và tỏa sáng không trực tiếp cộng/trừ điểm.
- Khi chuyển từ playing sang won, cộng thưởng đúng một lần: floor(max(0, time_left_s)) + 25 × flames còn lại. Khi thua không có thưởng kết thúc.
- Ví dụ: nhặt 18 con, thắp 5 đèn, thắng còn 120.9 giây và 2 flames: 180 + 500 + 120 + 50 = 850 điểm.
- Dựng scenario không cộng điểm hoặc phát sự kiện, kể cả carried, deposited hoặc lit được đặt sẵn. Nếu scenario đã ở trạng thái kết thúc thì ghi snapshot tick 0 và end ticks = 0, không phát game_over và không nhận thưởng khởi tạo.
- Chơi lại tạo màn mới và đặt lại điểm, đồng hồ, máu, carried, trạng thái đèn, Bóng Mực và cooldown. Không giữ điểm hoặc tiến trình cũ.

## 8. Mô phỏng và Test Contract

- Tick cố định 1/60 giây. Không dùng thời gian thực để tính gameplay; headless không cần cửa sổ hoặc GPU.
- Dựng mặc định theo seed rồi áp dụng scenario. Lanterns cập nhật theo id; đèn không được nhắc tới giữ nguyên. Các trường không được cung cấp giữ mặc định.
- Snapshot tick 0 phản ánh trạng thái sau scenario, trước input. Bước k đọc input tick k và tạo trạng thái tick k+1; event của bước đó ghi tick k+1. sim_tick = tick trong Phase 1.
- Input mặc định: move [0,0], cam_yaw_deg 0, các nút false. Frame chỉ thay trường hiện diện; các trường khác giữ giá trị cũ. Tick frame phải tăng nghiêm ngặt.
- Thứ tự một bước: cập nhật input và cạnh nhấn → di chuyển/nhảy → nhặt → pulse → interact/nạp/thắp đèn → AI và sát thương → cập nhật thời gian → xét kết thúc và thưởng → snapshot nếu đến chu kỳ.
- Vì nhặt trước pulse, có thể dùng ngay đom đóm vừa nhặt. Vì pulse trước nạp, nếu nhấn cả hai thì pulse tiêu tài nguyên trước. Đây là giả định cần có test riêng.
- Thời gian còn lại = thời gian ban đầu (scenario.time_left_s nếu có, nếu không là 300) - số bước đã chạy/60; chặn tối thiểu ở 0.
- Chỉ làm tròn tọa độ khi xuất JSONL, đến 3 chữ số thập phân; giữ độ chính xác nội bộ khi mô phỏng. Không ghi timestamp thực hoặc thời gian chạy máy vào output.
- Dùng bộ sinh giả ngẫu nhiên có seed, thứ tự xử lý ổn định và id tự sinh ổn định. Giữ id shade do scenario chỉ định; các id tự sinh phải tránh trùng. Chạy hai lần cùng đầu vào phải cho output giống từng byte.
- Snapshot chứa đủ các trường bắt buộc; bổ sung motes [{id, pos}] theo khuyến nghị v1.0 để dễ kiểm chứng. Các mảng thực thể và stunned_ids được sắp ổn định theo id.
- Ghi snapshot ở tick 0 và các tick chia hết cho snapshot-every (mặc định 10). Dòng cuối luôn là end, ticks là số bước thực tế đã chạy. Dừng đủ ticks hoặc khi kết thúc; không chạy thêm bước sau thắng/thua.
- Đầu vào hợp lệ kết thúc với exit code 0. JSON hoặc cấu trúc inputs/scenario không hợp lệ trả code 2, thông báo rõ trên stderr. Lỗi chạy khác trả code khác 0.

## 9. Kế hoạch kiểm chứng trước khi viết mã

Kế hoạch bên dưới được lập trước khi viết mã. Kết quả thực thi hiện tại và các mục chưa kiểm tra được ghi riêng trong docs/proof/phase-1/README.md; không coi kế hoạch là bằng chứng đã đạt.

| Mục | Cách kiểm chứng dự kiến |
|---|---|
| Di chuyển | Không có địch/đom đóm: đi thẳng 60 bước được 5 m; đi chéo không vượt 5 m; thử yaw 90 độ |
| Input và nhảy | Trường vắng giữ giá trị; giữ nút không kích hoạt lại; nhảy rồi trở về Y = 0 |
| Nhặt và sức chứa | Đom đóm ở đúng 1 m được nhặt, ngoài 1 m thì không; đặt 6 con để kiểm tra tối đa mang 5 |
| Nạp và thắp | Mang 5 nạp đèn trống: amount = 3, còn 2; nạp từng phần; giữ E không nạp lặp |
| Pulse | Thiếu carried không dùng được; kiểm tra biên 5 m, đẩy 3 m, choáng 120 bước, hồi chiêu 180 tick |
| Sát thương | Chạm mất 1 flame, dropped = 0; nhiều địch không gây nhiều đòn một bước; kiểm tra tick t+89 và t+90 |
| Vùng an toàn | Đèn tắt không bảo vệ; đèn sáng bảo vệ; dựng shade trong vùng không sửa snapshot tick 0 |
| Thắng/thua và điểm | Thắp đèn cuối, hết giờ, hết máu; kiểm tra thưởng một lần và thứ tự ưu tiên khi trùng điều kiện |
| Scenario | Mảng rỗng thay danh sách; đèn cập nhật theo id; lit đặt sẵn không cộng điểm hoặc phát event |
| Contract | Kiểm tra tick 0/1, --ticks 0, chu kỳ snapshot, dòng end cuối; JSON sai trả code 2 |
| Tất định | Hai lần cùng seed/scenario/inputs cho file JSONL giống từng byte |
| Giao diện | Chơi thật, chụp HUD, Mây/nón/đèn, đảo sáng dần, thắng/thua và thao tác Chơi lại |

## 10. Bàn giao và việc còn lại

- Công nghệ: JavaScript dùng chung cho Node headless và browser; Three.js 0.170.0 chỉ nằm ở phần hiển thị. Lệnh thật đã khai báo trong contract; không có bước cài package vì thư viện đã vendored.
- Hướng dẫn sản phẩm ở docs/game/README.md. README gốc và các tài liệu lab giữ nguyên theo lựa chọn người học.
- Harness, hook, CI và nhật ký AI được giữ trong repo. Script verify đã chạy để sinh bằng chứng tự động; review độc lập của người học vẫn chưa hoàn tất.
- Chưa xác nhận cân bằng bằng chơi tay hoặc hiển thị 3D thực tế. Đường chơi điều khiển bằng input hợp lệ đã thắng trên màn mặc định, nhưng không thay thế kiểm tra camera/HUD/Chơi lại.
- Chưa xác nhận kết quả trên macOS/Linux hoặc đúng hạn lab. Chỉ chỉnh tuning tiếp khi có vấn đề cụ thể, cập nhật đồng thời tài liệu, mã và test.
