# ⚔️ Tu Tiên Cửu Trọng Thiên — TikTok Live Interactive RPC Tool

Tool tương tác livestream TikTok phong cách **Tu Tiên Tiên Hiệp (Xianxia)** chuẩn tỷ lệ **9:16 (1080x1920)** tích hợp hiệu ứng hình ảnh, âm thanh tổng hợp và **giọng đọc Chị Google tiếng Việt (gTTS)** tốc độ cực nhanh (~0.4s).

Khán giả trên livestream TikTok có thể trực tiếp tu luyện, thăng cấp cảnh giới, vượt lôi kiếp, dâng tặng tiên dược và cùng nhau hợp lực trảm Yêu Thú Thế Giới.

---

## 🌟 Điểm Nổi Bật & Tính Năng

1. **26 Cảnh Giới Tu Tiên Chân Thực:**
   - Từ *Phàm Nhân*, *Luyện Khí 1-9*, *Trúc Cơ*, *Kim Đan*, *Nguyên Anh*, *Hóa Thần*, *Luyện Hư*, *Hợp Thể*, *Đại Thừa*, *Cửu Trọng Lôi Kiếp* đến *Chân Tiên Giáng Thế*.
   - Khán giả tích lũy Linh Khí / Tu Vi để mở khóa danh hiệu và tăng sức mạnh.

2. **Hệ Thống Yêu Thú Thế Giới (World Boss):**
   - Boss xuất hiện tuần tự: *Cửu Vĩ Hỏa Hồ* (5,000 HP), *Thôn Thiên Cự Mãng* (15,000 HP), *Hắc Ám Ma Long* (40,000 HP), *Huyết Kỳ Lân* (100,000 HP).
   - Khán giả gõ chat `"săn boss"` / `"trảm yêu"` hoặc dâng tiên dược để trừ máu Boss. Khi Boss bị hạ gục, toàn kênh rung chuyển và người kết liễu được thưởng lớn Tu Vi.

3. **Lôi Kiếp & Đột Phá Cảnh Giới (Tribulation Lightning):**
   - Khán giả gõ chat `"đột phá"` hoặc `"độ kiếp"` khi đủ điểm tu vi.
   - Hiệu ứng sấm sét Lôi Đình rền vang, chớp sáng toàn màn hình và tỷ lệ thành công/thất bại tùy thuộc vào cảnh giới.

4. **Giọng Đọc Google Tiếng Việt (gTTS Cực Nhanh & Mượt):**
   - Tích hợp Python UTF-8 daemon chuyên biệt, tốc độ tổng hợp chỉ ~0.4s.
   - Tự động phát âm thanh tên khán giả và sự kiện tu luyện.
   - **4 Tầng Chống Trùng Lời & Chống Spam:** Đảm bảo không bao giờ bị nói lặp hay chồng chéo 2 giọng cùng lúc.

5. **Giao Diện Tiên Hiệp OBS 9:16 Tuyệt Đẹp:**
   - Trận đồ Bát Quái xoay chuyển huyền ảo.
   - Phi kiếm lượn quanh đạo sĩ ngồi thiền trên đài sen phát sáng.
   - Bảng Xếp Hạng Thiên Kiêu (Top Đạo Hữu có Tu Vi cao nhất).
   - Dòng truyền âm động phủ hiển thị các bình luận và sự kiện theo thời gian thực.

6. **Chế Độ Tự Động Giả Lập (Auto-Simulation):**
   - Tự động giả lập các nhân vật tu tiên nổi tiếng (*Hàn Lập*, *Bạch Tiểu Thuần*, *Tiêu Viêm*, *Diệp Phàm*, *Thạch Hạo*, *Nam Cung Uyển*...) vào tương tác khi phòng live vắng khách.

---

## 📋 Lệnh Tương Tác Của Khán Giả Trên TikTok Live

| Khán Giả Thao Tác | Hành Động Trong Game | Phần Thưởng |
| :--- | :--- | :--- |
| **Thả Tim** (Tap màn hình) | Hấp thu Thiên Địa Linh Khí | +10 Linh Khí / Tim |
| Gõ chat **"ngồi thiền"** / **"tu luyện"** | Nhập định tu luyện | +120 Tu Vi + Giọng đọc TTS |
| Gõ chat **"săn boss"** / **"trảm yêu"** | Xuất chiêu kiếm khí trảm Boss | Trừ máu Boss theo cảnh giới |
| Gõ chat **"đột phá"** / **"độ kiếp"** | Dẫn động Thiên Kiếp Lôi Đình | Thăng cấp cảnh giới mới |
| **Tặng Quà** (Hoa hồng, Mũ, Nước hoa...) | Dâng cúng Tiên Dược Bảo Vật | Tu Vi tăng vọt + Sát thương Boss cực mạnh |
| Bình luận thông thường | Truyền âm mật nghị | Hiển thị lên màn hình và đọc TTS |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu Cầu Môi Trường
- **Node.js** (v18 trở lên)
- **Python** (v3.10+): Đã cài đặt thư viện `gtts` (`pip install gtts`)

### 2. Cài Đặt
```bash
cd D:\tutien
npm install
```

### 3. Cấu Hình `.env`
File `.env` nằm trong thư mục gốc `D:\tutien`:
```env
PORT=3001
TIKTOK_USER=ngoc03nv
SIGN_API_KEY=euler_NWE2ODQ0NDdiNWQ3NGI0OTRhNDVkMTViYzRjMjIxZjAzYTQxYWIyMDUyODkxZDQ3ZDdjNDQw
```

### 4. Khởi Động
Chạy file:
```bash
start.bat
```
Hoặc qua dòng lệnh:
```bash
node server.js
```

- Màn hình OBS: `http://localhost:3001`
- Bảng điều khiển Admin: `http://localhost:3001/admin`

---

## 🎥 Cài Đặt OBS Studio (Tỷ Lệ 9:16)

1. Trong **OBS Studio**, tại khung **Sources (Nguồn)**, nhấn `+` -> Chọn **Browser (Trình duyệt)**.
2. Đặt tên: `Tu Tiên TikTok Live`.
3. Điền các thông số:
   - **URL:** `http://localhost:3001`
   - **Width (Chiều rộng):** `1080`
   - **Height (Chiều cao):** `1920`
   - Tích chọn: **Control audio via OBS (Kiểm soát âm thanh qua OBS)** (để nghe giọng TTS và hiệu ứng trực tiếp trong OBS).
4. Nhấn **OK**.

---

## 🔌 Giao Thức JSON-RPC 2.0 & WebSocket

Server hỗ trợ API chuẩn JSON-RPC 2.0 qua cả HTTP POST `/rpc` và WebSocket `/ws`:
- `tutien.getState`: Lấy toàn bộ trạng thái hiện tại.
- `tutien.absorbQi`: Thu nạp linh khí.
- `tutien.meditate`: Nhập định tu luyện.
- `tutien.breakthrough`: Thử thách đột phá lôi kiếp.
- `tutien.attackBoss`: Trảm boss thế giới.
- `tutien.offerGift`: Tặng quà tiên dược.
- `tutien.speak`: Đọc câu văn bất kỳ bằng TTS tiếng Việt.
- `live.connect`: Kết nối tài khoản TikTok Live mới.
- `live.setAutoSim`: Bật/tắt chế độ tự động giả lập.
