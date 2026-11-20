# Phase 2 — Ticket-02, Contract v1.1

Nguồn: toàn bộ Ticket-02 và hai bảng số chuẩn/màu do người học cung cấp trong chat. Mục tiêu là chuẩn hóa gameplay, mở ba Đêm và thêm các tính năng ở Phần 3. Không triển khai ticket sau.

## Số chuẩn và nguồn chân lý

`game.contract.json` khai báo các tuning bắt buộc; `src/rules.mjs` giữ các hằng số bổ sung và toàn bộ palette; `src/levels.mjs` giữ bản đồ. Browser và headless dùng cùng `src/game.mjs`.

- Chạy 6 m/s, đổi tốc độ tức thì (đáp ứng ≤0,1 s); nhảy 7 m/s, trọng lực 20 m/s², điều khiển trên không đầy đủ trừ khi đang được bục phóng.
- Lướt 14 m/s trong 12 tick, hồi 90 tick từ lúc bắt đầu. Hướng theo chuyển động, đứng yên theo hướng mặt (ban đầu +Z). Không bất tử; lướt trên không giữ Y, sau đó tiếp tục vận tốc rơi/nhảy trước lướt.
- Mang 10, nhặt XZ ≤1 m và chênh cao chân–đom đóm ≤1,5 m. Ban đầu 20 điểm khác nhau; tick 240k sinh 1 tại điểm trống nếu tổng đang hoạt động <30. Không có điểm trống thì bỏ lượt. Đom đóm rơi bắt buộc vẫn được tạo dù làm tổng vượt trần sinh tự nhiên.
- Mỗi đèn cần 10, nhớ tiến độ; nhấn E nạp phần còn thiếu vào đèn chưa sáng gần nhất trong 2 m XZ, hòa thì id nhỏ hơn. Đèn sáng tạo vùng an toàn 6 m; Bóng Mực ở trong được đẩy ra trong tối đa 30 bước và không gây hit lúc đó.
- Tỏa Sáng tiêu 3, hồi 180 tick. Xét 3D từ chân Mây +[0,0.8,0] tới tâm Bóng Mực, ≤5 m. Choáng 120 tick, đẩy tổng 4 m trong 15 bước đầu; tường/mép bản đồ chặn đẩy. Trùng XZ đẩy +X. Pulse làm mới hiệu ứng và cộng điểm cả mục tiêu đang choáng.
- Bóng Mực 4 m/s, Đêm 3 là 4,5; phát hiện 12 m, bỏ đuổi >18 m. Hit khi XZ ≤1 m, chênh cao ≤1,5 m; tối đa một hit mỗi bước, xét id tăng. Con gây hit recoil 2 m/60 tick; con chạm lúc Mây bất tử không recoil.
- Hit mất 1/3 Ngọn Lửa, rơi floor(carried/2) trên vành 1,5–2,5 m, TTL 480 tick, nhặt từ bước sau; bất tử 90 tick.
- Y <−10: hit do rơi bỏ qua bất tử, mất một Ngọn Lửa và toàn bộ carried, chỉ phát một lần. Chờ 60 bước không nhặt/không bị chạm, rồi về spawn với vận tốc 0, bất tử 90 tick. Hết máu thì thua ngay.
- Thời gian 300/330/360 giây. Ưu tiên kết thúc: no_flames → all_lit → dawn. Khi thắng cộng `2*floor(time_left_s)+50*flames`.
- Điểm hành động: **10 mỗi đom đóm nạp**, 100 mỗi đèn thắp, 5 mỗi Bóng Mực trúng pulse. `score.per_mote` từ v1.1 áp dụng cho nạp, không cộng khi nhặt. Tổng chiến dịch chỉ gồm Đêm đã thắng.

## Acceptance criteria cho từng tính năng Phần 3

| Mã | Yêu cầu / tiêu chí nghiệm thu | Cách kiểm chứng |
|---|---|---|
| P2-01 | Đêm 2/3 sinh Gió Lạc ở sim tick 1200k, tối đa 2, id D1…; idle 2 m/s; khi mang ≥5 và trong 15 m chuyển chase 7 m/s, mất điều kiện trở lại idle | Test ngưỡng, tốc độ, lịch/cap; fixture drifter-steal |
| P2-02 | Chạm XZ ≤1,2 m cướp min(3,carried), chỉ cướp một lần, flee 240 tick rồi biến mất; cướp trước hit; không bị chặn bởi safe zone/invuln | Fixture drifter-steal, test thứ tự và miễn nhiễm |
| P2-03 | Pulse trúng chase đuổi đi không cướp; trúng flee đang mang đồ thả toàn bộ tại chỗ, thành dropped motes, biến mất sau 120 tick | Fixture drifter-drop; test chase/flee/TTL |
| P2-04 | Bùa C1 Đêm 2 ở (35,0,0), Đêm 3 C1/C2 ở (±30,0,25), nhặt đúng XZ/height; hiệu lực 600 tick, nhặt lại refresh; xuất hiện lại sau 2700 | Fixture charm, test refresh/respawn |
| P2-05 | Bùa tăng chạy lên 7,2 và bỏ cooldown dash; vẫn cần cạnh nhấn, không nhận lần dash mới trong 12 tick đang lướt | Fixture charm + unit test giữ/nhả nút |
| P2-06 | Menu → giới thiệu tên đảo/lời Ông Đăng → chơi → kết quả → Đêm tiếp. Thua retry đúng Đêm, giữ điểm Đêm trước; thắng 3 hiện Bình Minh/tổng điểm | Campaign unit test với kết quả thật từ Game; fixture thắng từng Đêm; UI manual còn chờ |
| P2-07 | Esc/P pause: tick tăng, sim_tick/thời gian/cooldown/TTL/spawn đứng yên; có Tiếp tục/Chơi lại Đêm/Cài đặt/Về menu | Fixture pause + test; thao tác menu manual còn chờ |
| P2-08 | Âm lượng/độ nhạy chuột lưu qua lần mở lại; slider đổi âm lượng và tốc độ quay camera | Test fake storage kiểm tra lưu/đọc/clamp; localStorage/camera manual còn chờ |
| P2-09 | Có nhạc nền đêm và SFX nhặt, thắp, pulse, hit, nhảy, dash, thắng/thua, spawn Bóng Mực, từng giây trong 10 giây cuối | Web Audio procedural nối vào event/input thực; nghe manual còn chờ |
| P2-10 | HUD: máu trái, giờ giữa mm:ss đỏ/nhấp nháy ≤30 s, đèn và điểm phải; 10 ô dưới giữa; hồi dash/pulse dưới phải; E nhắc (deposited/10); chỉ đèn chưa sáng gần nhất khi ngoài màn | CPU scene tests không thay thế HUD; checklist UI manual còn chờ |
| P2-11 | Palette đúng hex, môi trường =0.15+0.55*(lit/total) | Test palette exact; CPU scene cập nhật đèn; màu pixel thực manual còn chờ |

## Bản đồ và địa hình

- Đêm 1: bán kính 40; L1…L5 đúng tọa độ ticket. 8 điểm đom đóm r12 và 16 điểm r33; 12 điểm sương r37 tại 15°+30°k.
- Đêm 2: hai đảo r28 tâm (0,0,0)/(70,0,0), cầu [26,44]×[-2,2]. Hai bục đúng tọa độ/phóng Y14, ngang24 hướng tâm đối diện; giữ vận tốc ngang tới khi chạm đất, vẫn lướt được. Sáu đèn và hai bộ điểm sinh đúng ticket.
- Đêm 3: đảo r45, vành tầng 1 r12–24/z>0/Y3, tầng 2 r8/Y6. Vách đứng chặn đi lên; bước ra rơi xuống. Dốc rộng3 tại30°/150°, r30/Y0→r24/Y3. Bục (0,3,13) Y12/ngang8 hướng −Z đáp tầng2; tháp r2/base6/cao8 chặn đi xuyên. Đèn/30 điểm đom đóm/16 điểm sương đúng ticket.
- Gió Đêm 3: cảnh báo ở tick 1680 của chu kỳ đầu, active [1800,2100), lặp mỗi1800. Hướng chọn theo seed khi bắt đầu cảnh báo; đẩy 2 m/s. Lá và âm thanh báo trước 120 bước, không ảnh hưởng RNG gameplay.
- Spawn Bóng Mực: 2 tại300 rồi1 ở 300+k×480/420/360; cap6/8/10. Chỉ điểm cách người chơi ≥15 m, ngoài vùng sáng và chưa có bóng chiếm chỗ; hết điểm thì bỏ lượt.

## Tick, schema và các giả định còn mơ hồ

1. Snapshot 0 trước input. Mỗi `step` tăng tick; pause xử lý đầu tiên. Bước đang paused không tăng sim_tick, không giảm bất kỳ timer nào. Resume được xử lý trước, rồi chạy gameplay trong cùng bước resume.
2. Thứ tự: input/pause → giảm timer/thời gian → di chuyển/nhảy/dash/pad/gió/rơi → nhặt → nạp đèn → vùng sáng có hiệu lực ngay → pulse → enemy movement → cướp rồi hit → spawn → kết thúc → snapshot.
3. `night_start` ghi sau snapshot0, tick0, một lần mỗi lần chạy CLI; không có điểm/sự kiện nhặt/thắp do dựng scenario. Trạng thái đã terminal tại0 không nhận thưởng khởi tạo.
4. Độ dài theo mét; tọa độ làm tròn3 chữ số lúc xuất, không làm tròn trong logic. Góc spawn dùng `(r*cos(angle), y, r*sin(angle))`; hai dốc vì vậy nằm ở nửa z>0.
5. Ticket chỉ chỉ rõ spawn (0,0,0) ở Đêm1, Đêm2 dùng tâm A. **Đêm3 giả định spawn (0,0,−30)** vì gốc nằm bên trong khối tầng2/tháp, không phải chỗ đứng chơi hợp lệ. Scenario.player.pos luôn được giữ nguyên ở tick0. Nếu giảng viên quy định spawn Đêm3 khác, cần sửa cả logic/render/spec/test.
6. Wander đi theo một hướng seeded và rẽ khi chạm vật cản; không bổ sung pathfinding ngoài ticket. Spawning mặc định60 tick nếu không nêu thời gian; không gây hit trong lúc spawning, pulse vẫn có thể trúng từ bước sau sinh.
7. Khoảng cách nhặt/hit dùng XZ + chênh Y riêng như bảng. Tương tác và vùng sáng dùng XZ; chỉ pulse được chuyển sang khoảng cách3D. Tâm default Bóng Mực cao0,8 m so với mặt đứng; scenario ghi chính xác tâm đã cung cấp.
8. Đom đóm random không có TTL: snapshot ttl_s=null; dropped có số giây còn lại. Dropped không chiếm tài nguyên vĩnh viễn, timer đứng yên khi paused.
9. Charms scenario thay danh sách; có thể dùng `{id,pos,available,respawn_ticks}`. Bỏ pos với C1/C2 mặc định sẽ lấy vị trí chuẩn. available=false mà không nêu hồi bùa dùng2700. Drifters dùng `{id,pos,state,stolen,state_ticks_left}`. Motes vẫn nhận mảng tọa độ v1.0; thêm dạng `{id,pos,kind,ttl_ticks}` (hoặc ttl_s) cho test dropped.
10. Nhặt Bùa không chiếm ô carried và không bị chặn khi túi đầy. Snapshot `invuln` là boolean; cooldown/charm/TTL/respawn dùng giây. Có thêm player.respawn_s và shade.state_ticks_left để truy vết; các trường bắt buộc đều giữ đủ.
11. Id có cùng tiền tố số được xét theo số (S2 trước S10); các id khác so theo chuỗi. Id tự sinh không trùng id scenario. Cùng seed/inputs/scenario cho output giống byte.
12. Tích phân vận tốc rồi vị trí mỗi bước1/60. Bục có ưu tiên hơn nhảy thường nếu chân đang chạm bục, kể cả nhấn Space. Khi lướt giữa không trung, giữ Y và tạm giữ vy; hết lướt tiếp tục vy đó. Sau hồi sinh có một bước đứng ở spawn, vận tốc0; từ bước sau nhận chuyển động.

## Sáng tạo được phép

“Dải sao dẫn bình minh”: mỗi đèn thắp hiện thêm sao/đường nối trên trời, hạt vàng quanh đèn, một âm sắc trong giai điệu pentatonic gốc. Chỉ view/audio đọc tiến độ, không thêm thực thể logic, điểm, RNG hoặc event headless.

Tắt trong Cài đặt hoặc bằng `?creative=0`. Mã headless không import view/audio/settings. Test dựng cảnh bật/tắt và determinism không được dùng để tuyên bố FPS/hình ảnh đã đạt.

## Kết quả và bàn giao

Kết quả tự động ở docs/proof/phase-2/summary.json và tests.tap; chưa có kết quả render thật/FPS/âm thanh. Nút Đo FPS 720p có warmup3 s rồi đo30 s chơi thật, xuất JSON; chỉ coi ≥30 FPS đã đạt khi có file đo thật.

Hướng dẫn sản phẩm ở docs/game/README.md; tài liệu lab và README gốc giữ nguyên theo yêu cầu. Tag phase-1 và bằng chứng cũ không đổi. Mọi test bị Ticket-02 thay luật được giải thích ở phase-2-changes.md. Không tạo Release cuối v1.0.0 ở Phase2.
