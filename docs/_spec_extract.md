**TIMELENS --- ĐẶC TẢ FRONTEND**

*Nâng cấp FE tương thích BE --- Online & Offline*

Cải thiện trên UX/UI cũ --- KHÔNG overwrite \| Bám API BE đã có

1\. Nguyên Tắc Vàng (đọc trước khi code)

> **FE ĐÃ CÓ SẴN và đang chạy. Tài liệu này là NÂNG CẤP, không phải
> build lại. TUYỆT ĐỐI không rewrite cấu trúc features/ + shared/, không
> đổi layout Stitch. Chỉ thêm/sửa theo đúng đặc tả.**

- **Không overwrite:** giữ nguyên component, layout, routing đã có. Chỉ
  thêm AppMode + sửa data binding khi cần.

- **Không bịa màu:** dùng ĐÚNG token trong design/tokens.ts +
  globals.css (theme dark neo-heritage). KHÔNG hardcode hex, KHÔNG mang
  màu từ tài liệu pitch vào đè theme.

- **Bám Stitch:** mọi màn tham chiếu folder Stitch ưu tiên (3) \> (2)
  \> (1) \> base. Polish = khớp pixel với screen.png, không sáng tạo
  layout mới.

- **Bám BE:** list API qua getListData/getPageData, lỗi qua useToast +
  getFriendlyErrorMessage, copy tiếng Việt.

- **Tránh overthinking:** mỗi task 1 mục tiêu, xong là sang việc kế.
  Stuck \> 3 tiếng → đơn giản hoá, đi tiếp.

- **Trước khi báo xong:** chạy npm run lint + npm run build phải pass.

2\. Tình Trạng FE Hiện Tại

Stack (giữ nguyên)

- React 19 + TypeScript + Vite 8, React Router 7, Tailwind CSS 4, Axios,
  jsQR, \@photo-sphere-viewer, Material Symbols

Cấu trúc (không đổi)

> src/
>
> ├── pages/ \# Màn hình route-level
>
> ├── features/ \# auth, locations, gamification,
>
> │ \# profile, chat, viral, panorama, demo
>
> ├── shared/ \# api, auth, config, router, ui/toast
>
> ├── components/ \# layout (SideNav, TopNav, AppLayout)
>
> ├── assets/images.ts# Registry ảnh Stitch (fallback)
>
> └── design/tokens.ts# Theme dark neo-heritage (DÙNG CÁI NÀY)

Trạng thái các màn (cần polish phần 🟡)

  ---------------------------------------------
  **Nhóm**      **Màn ✅ ổn**    **Màn 🟡 cần
                                 polish**
  ------------- ---------------- --------------
  **Online**    Login, Explore,  Tour360, Chat,
                HeritageDetail   TimePortal

  **Offline**   Scan             Quests,
                (camera+jsQR)    QuestDetail,
                                 SecretStory,
                                 PhotoFrame,
                                 Share

  **Chung**     ---              Home, Profile,
                                 Leaderboard,
                                 Artifacts
  ---------------------------------------------

3\. Design System Bắt Buộc

> Mục tiêu: giao diện mới phải đồng nhất với theme đang chạy. Cách duy
> nhất đúng: dùng token có sẵn, không tự định nghĩa.

Màu sắc

- **Nguồn chân lý:** design/tokens.ts + globals.css. Mở file này đọc tên
  biến trước khi dùng.

- Theme: dark neo-heritage (nền tối, accent heritage, text sáng). Mọi
  component mới kế thừa token này.

- Component mới: dùng class Tailwind ánh xạ token hoặc CSS variable đã
  định nghĩa. KHÔNG viết hex trực tiếp như #1a1a1a.

> **KHÔNG mang màu navy #1F4E79 / cam từ tài liệu pitch (.docx) vào FE.
> Đó là màu cho document Word, KHÔNG phải theme app. App giữ theme dark
> neo-heritage hiện có.**

Typography + Icon

- Font: giữ font đang dùng trong globals.css (không đổi font family)

- Icon: Material Symbols (đã tích hợp) --- dùng nhất quán, không trộn
  icon set khác

Component tái dùng

- Toast: shared/ui/toast (error/success/info) --- dùng cho mọi thông báo

- Nav: SideNav + TopNav variants có sẵn --- mở rộng, không tạo nav mới

- Ảnh: ưu tiên field BE → fallback assets/images.ts

4\. Kiến Trúc Online / Offline (trọng tâm)

> v4 yêu cầu phân 2 chế độ. FE đã có hết màn, chỉ cần GROUP lại theo
> mode + thêm context, KHÔNG xóa hay tạo màn mới.

  --------------------------------------------------
  **Chế độ**    **Ý       **Các màn thuộc  **Badge
                nghĩa**   về**             UI**
  ------------- --------- ---------------- ---------
  **ONLINE**    Khám phá  Explore →        \'Khám
                từ xa (ở  HeritageDetail → phá từ
                nhà)      Tour360 (Virtual xa\'
                          Tour) → Chat →   
                          TimePortal       

  **OFFLINE**   Trải      Scan (check-in)  \'Đang
                nghiệm    → Quests →       tại di
                tại di    QuestDetail →    tích\'
                tích      SecretStory →    
                          PhotoFrame →     
                          Share            

  **CHUNG**     Cả 2 mode Home, Profile,   ---
                dùng được Leaderboard,     
                          Artifacts        
  --------------------------------------------------

**Nguyên tắc phân mode:** mode chỉ thay đổi (1) màn nào được
highlight/ưu tiên trong nav, (2) badge context ở TopNav, (3) gợi ý hành
động tiếp theo. KHÔNG khoá hay ẩn hoàn toàn màn của mode kia --- user
vẫn truy cập được nếu muốn.

5\. Mode Selection + AppModeContext (component MỚI)

> Đây là phần MỚI duy nhất cần thêm. Đặt trong shared/, không đụng
> features/.

Đặc tả ModeSelectPage

- Hiển thị sau login (lần đầu) hoặc khi user bấm đổi mode

- Câu hỏi: \'Bạn đang ở đâu?\' --- 2 card lớn lựa chọn:

- Card 1: icon nhà + \'Khám phá từ xa\' + mô tả ngắn \'Tham quan 360°,
  trò chuyện AI, xem ảnh xưa-nay\'

- Card 2: icon vị trí + \'Đang tại di tích\' + mô tả \'Check-in, nhiệm
  vụ, chụp ảnh kỷ niệm\'

- Chọn xong → lưu vào AppModeContext + localStorage → điều hướng vào màn
  phù hợp

- Style: dùng token theme, layout card giống style card Explore đã có
  (tái dùng)

Đặc tả AppModeContext

> // shared/context/AppModeContext.tsx
>
> type AppMode = \'online\' \| \'offline\';
>
> // Lưu mode + persist localStorage key \'timelens_mode\'
>
> // Cung cấp: mode, setMode(m), toggleMode()
>
> // Default: đọc localStorage, nếu chưa có → null
>
> // (chưa chọn → hiện ModeSelectPage)

TopNav badge + nút đổi mode

- TopNav hiện badge nhỏ: \'Khám phá từ xa\' (online) / \'Đang tại di
  tích\' (offline)

- Bấm badge → mở lại ModeSelectPage để đổi

Prompt Cursor --- Mode Selection

> Context: TimeLens FE (React 19 + TS + Vite, feature-sliced).
>
> Theme dark neo-heritage trong design/tokens.ts. Đã có
>
> TopNav trong components/, ToastProvider trong shared/ui.
>
> Task: Thêm chế độ Online/Offline. KHÔNG sửa logic feature
>
> nào, chỉ thêm context + 1 màn chọn mode + badge nav.
>
> 1\. Tạo shared/context/AppModeContext.tsx:
>
> \- type AppMode = \'online\' \| \'offline\'
>
> \- state mode (persist localStorage \'timelens_mode\')
>
> \- expose: mode, setMode, toggleMode
>
> \- default null nếu chưa chọn
>
> 2\. Tạo pages/ModeSelectPage.tsx:
>
> \- Câu hỏi \'Bạn đang ở đâu?\' + 2 card lựa chọn
>
> \- Online: \'Khám phá từ xa\', Offline: \'Đang tại di tích\'
>
> \- Tái dùng style card của Explore (không tạo style mới)
>
> \- Chọn → setMode → navigate vào màn phù hợp
>
> 3\. TopNav: thêm badge hiện mode hiện tại, bấm → mở
>
> ModeSelectPage đổi mode.
>
> 4\. Router: nếu mode null → render ModeSelectPage sau login.
>
> Ràng buộc:
>
> \- Dùng token design/tokens.ts, KHÔNG hardcode màu.
>
> \- KHÔNG rewrite features/. Context đặt ở shared/.
>
> \- Copy tiếng Việt. Chạy lint + build pass.
>
> Output: AppModeContext + ModeSelectPage + TopNav update.

6\. PHẦN ONLINE --- Đặc Tả Từng Màn

> Online = \'Khám phá từ xa\'. Flow: Explore → HeritageDetail → Tour360
> / Chat / TimePortal. Trọng tâm: Virtual Tour view FPT + Chat cite
> nguồn.

6.1 ExplorePage (đã ✅, giữ)

- Hiện trạng: list locations + map, fallback ảnh khi coverImage lỗi

- **API:** GET /api/locations?page=0&size=20 → data.items\[\]
  (paginated)

- **Cần làm:** chỉ fallback ảnh khi coverImage null/404 (log warning).
  Khi vào từ Online mode → ưu tiên nút \'Tham quan 360°\' + \'Trò chuyện
  AI\' trên card.

6.2 HeritageDetailPage (đã ✅, giữ)

- **API:** GET /api/locations/{id}, /api/characters/by-location/{id},
  /api/photo-pairs/by-location/{id}

- **Cần làm:** đảm bảo 3 link rõ: Tour 360° / Chat / Time Portal. Online
  mode highlight 3 nút này.

- **Lưu ý:** characters trả 2 nhân vật (Chị Năm + Hướng dẫn viên) ---
  hiển thị đúng 2, không hardcode 6.

6.3 Tour360Page → NÂNG thành Virtual Tour (🟡 quan trọng)

> **Đây là phần WOW nhất cho online. Nâng từ panorama đơn thành Virtual
> Tour đa scene (view FPT). Xem đặc tả riêng mục 8.**

- **API:** GET /api/panoramas/by-location/{id} (data=array), GET
  /api/hotspots/by-panorama/{id} (type:scene → contentRef = UUID scene
  đích)

6.4 ChatPage (🟡 polish)

- **API:** POST /api/chat {characterId, message, conversationId}, GET
  /api/chat/conversations/{id}/messages (paginated)

- **Cần làm:** reply là STRING có dòng \'Nguồn: \...\' ở cuối → hiển thị
  NGUYÊN VĂN (không cắt). Render dòng Nguồn nhạt hơn, cỡ nhỏ hơn để phân
  biệt.

- **Lưu ý:** cần truyền characterId + conversationId. Rate limit chat →
  422 BUSINESS_RULE → toast nhẹ nhàng. Cần JWT.

- **Empty state:** khi mở chat lần đầu → hiện 3-4 câu hỏi gợi ý (\'Cuộc
  sống trong địa đạo thế nào?\'\...).

6.5 TimePortalPage --- Photo Slider (🟡 polish)

- **API:** GET /api/photo-pairs/by-location/{id} (data=array)

- **Cần làm:** slider xưa/nay mượt (react-compare-slider), caption năm +
  chú thích. Loading skeleton khi ảnh nặng.

- **Lưu ý:** đây là ảnh kép xưa-nay (slider lướt --- KHÔNG làm AR, AR là
  roadmap).

7\. PHẦN OFFLINE --- Đặc Tả Từng Màn

> Offline = \'Đang tại di tích\'. Flow: Scan → Quests → SecretStory →
> PhotoFrame → Share. Trọng tâm: gamification loop chạy mượt.

7.1 ScanPage (đã ✅, giữ camera+jsQR)

- **API:** POST /api/checkins {locationId, latitude, longitude, qrCode}.
  Demo: POST /api/demo/checkin khi DEMO_ENABLED

- **Cần làm:** tùy chọn auto check-in sau khi decode QR (debounce +
  confirm toast). QR format: \'timelens:location:{uuid}\'.

- **Lỗi:** 422 BUSINESS_RULE (GPS xa / QR sai / đã check-in) → toast rõ.
  Camera denied → hướng dẫn bật quyền.

7.2 QuestsPage + QuestDetailPage (🟡 polish)

- **API:** GET /api/quests?locationId= (paginated), GET
  /api/me/quests?status= (JWT), POST /api/quests/{id}/start, GET
  /api/quests/{id}/progress

- **Cần làm:** GỠ seed card Stitch ép cứng (Dấu ấn Hoàng Thành\...) ---
  chỉ seed khi VITE_DEMO_MODE. Progress bar từ currentStep/stepsTotal
  thật.

- **Lưu ý:** status: not_started → in_progress → completed. Tab Đang làm
  / Hoàn thành / Tất cả.

7.3 SecretStoryPage (🟡 polish)

- **API:** GET secret-story (trả nội dung khi đủ điều kiện, từ chối nếu
  chưa)

- **Cần làm:** trạng thái khóa (mờ + ổ khóa) → animation mở khóa → nội
  dung. Validate server-side, FE chỉ hiển thị.

7.4 PhotoFramePage + SharePage (🟡 polish)

- **API:** GET /api/photo-frames (frames), upload creation, prefill +
  record share

- **Cần làm:** Canvas composite ảnh + khung + watermark, xuất
  1080x1080 + 1080x1920. Web Share API + fallback download.

- **Gotcha:** set crossOrigin=\'anonymous\' khi load ảnh (tránh canvas
  taint). Test toBlob trên iOS Safari. Giới hạn 1080px tránh crash
  mobile.

8\. Virtual Tour View FPT --- Đặc Tả Nâng Cấp

> Nâng Tour360Page từ panorama đơn → đa scene nối nhau (tổng thể → chi
> tiết → chọn hướng đi). Dùng Virtual Tour plugin của Photo Sphere
> Viewer (FE đã có \@photo-sphere-viewer).

Dữ liệu từ BE

- GET /api/panoramas/by-location/{id} → danh sách scene (id, imageUrl)

- GET /api/hotspots/by-panorama/{id} → hotspot type:scene, contentRef =
  UUID scene đích (để nối)

UUID Củ Chi (hardcode tạm được khi demo)

  --------------------------------------------------
  **Scene**   **UUID**
  ----------- --------------------------------------
  Cổng vào    22222222-2222-2222-2222-222222222222
  (gốc)       

  Bếp Hoàng   22222222-2222-2222-2222-222222222221
  Cầm         

  Phòng họp   22222222-2222-2222-2222-222222222223
  --------------------------------------------------

Ảnh tạm → ảnh thật

- **Tuần 1:** dùng Google Street View Củ Chi tạm để test cấu trúc tour

- **Tuần 3:** thay imageUrl bằng ảnh 360 thật (BE update qua SQL) --- FE
  không cần đổi code, chỉ ảnh đổi

Prompt Cursor --- Virtual Tour

> Context: TimeLens FE, Tour360Page (feature panorama) đang
>
> render 1 panorama đơn bằng \@photo-sphere-viewer.
>
> Task: Nâng thành Virtual Tour đa scene kiểu view FPT ---
>
> đi từ tổng thể đến chi tiết, mỗi scene có mũi tên chuyển
>
> sang scene kế. KHÔNG rewrite page, chỉ nâng viewer.
>
> 1\. npm i \@photo-sphere-viewer/virtual-tour-plugin
>
> 2\. Fetch panoramas + hotspots từ feature panorama API:
>
> \- GET /api/panoramas/by-location/{id} → scenes
>
> \- GET /api/hotspots/by-panorama/{id} → links
>
> (type:scene, contentRef = UUID scene đích)
>
> 3\. Map sang nodes VirtualTourPlugin:
>
> nodes: \[{ id, panorama: imageUrl,
>
> links: \[{ nodeId: contentRef }\] }\]
>
> 4\. Giữ info hotspot click hiện card (đã có).
>
> 5\. Nếu API chưa có ảnh thật → tạm dùng URL Street View.
>
> Ràng buộc:
>
> \- Lazy load plugin (giảm bundle).
>
> \- Giới hạn/nén ảnh, mobile không crash.
>
> \- Dùng getData/getListData cho API, lỗi qua useToast.
>
> \- KHÔNG đổi layout, chỉ thay viewer logic.
>
> Output: Tour360Page dùng VirtualTourPlugin nối \>=3 scene,
>
> lint + build pass.

9\. Polish UI --- Loading / Error / Empty States

> Áp dụng cho mọi màn 🟡. Mục tiêu: không bao giờ trắng màn hình khi
> lỗi/đang tải/rỗng.

  --------------------------------------------------------
  **Trạng       **Khi nào**   **Hiển thị**
  thái**                      
  ------------- ------------- ----------------------------
  **Loading**   Đang gọi API  Skeleton hoặc spinner, không
                / load ảnh    để trống
                nặng (360,    
                frame)        

  **Error**     API fail, GPS Toast (useToast +
                off, camera   getFriendlyErrorMessage) +
                denied, mạng  nút thử lại
                chậm          

  **Empty**     Chưa badge /  Illustration + text hướng
                chưa quest /  dẫn hành động
                leaderboard   
                trống         
  --------------------------------------------------------

Empty state cụ thể từng màn

- Profile: chưa badge → \'Hoàn thành nhiệm vụ để nhận huy hiệu đầu
  tiên\'

- Quests: chưa quest → \'Chưa có nhiệm vụ, hãy check-in tại di tích\'

- Leaderboard: entries rỗng → \'Chưa có dữ liệu xếp hạng\' (hiếm khi vì
  seed topup có data)

- Chat: chưa có tin nhắn → câu hỏi gợi ý

Prompt Cursor --- Polish states

> Context: TimeLens FE, các màn 🟡: Tour360, Chat,
>
> TimePortal, Quests, QuestDetail, SecretStory, PhotoFrame,
>
> Share, Profile, Leaderboard. So pixel với Stitch screen.png
>
> (folder ưu tiên (3)\>(2)\>(1)).
>
> Task: Thêm loading/error/empty states + pixel parity.
>
> Làm TỪNG MÀN một, báo cáo từng màn xong.
>
> 1\. Loading: skeleton/spinner cho API call + ảnh nặng.
>
> 2\. Error: dùng useToast + getFriendlyErrorMessage. Không
>
> để trắng màn. GPS/camera denied → hướng dẫn rõ.
>
> 3\. Empty: illustration + text tiếng Việt hướng dẫn.
>
> 4\. Pixel: spacing, font-size H1, tab active, card height
>
> khớp screen.png. KHÔNG rewrite component.
>
> Ràng buộc:
>
> \- Dùng token design/tokens.ts, không hardcode màu.
>
> \- List API qua getListData/getPageData.
>
> \- Copy tiếng Việt, không lộ thuật ngữ dev.
>
> \- Mỗi màn xong: lint + build pass rồi mới sang màn kế.
>
> Bắt đầu từ: Explore, Quests, Leaderboard, Profile, Scan
>
> (ưu tiên theo plan).

10\. Quy Tắc Tích Hợp API (bám BE contract)

Envelope

> // Success: { success, message, data }
>
> // Error: { success:false, code, message,
>
> // timestamp, fieldErrors }
>
> getData(res) // unwrap data (object)
>
> getListData(res) // data là array trực tiếp
>
> getPageData(res) // data.items\[\] + page/totalItems

Phân loại endpoint

  ----------------------------------------------------
  **Loại data**    **Endpoint**         **Hàm dùng**
  ---------------- -------------------- --------------
  **Paginated      locations, quests,   getPageData
  (data.items)**   me/quests, chat      
                   messages             

  **Array (data    characters,          getListData
  trực tiếp)**     photo-pairs,         
                   panoramas, hotspots  

  **Object**       location detail,     getData
                   profile/me, quest    
                   progress             

  **entries\[\]    leaderboard          đọc
  (riêng)**        (data.entries\[\])   data.entries
  ----------------------------------------------------

Error code → xử lý

- 422 VALIDATION_ERROR → map fieldErrors lên form (login/register) +
  toast

- 422 BUSINESS_RULE → toast message (GPS xa, rate limit chat\...)

- 401 UNAUTHORIZED → interceptor tự refresh; fail → clearSession +
  redirect login

- 404 NOT_FOUND → empty/not found UI

- Validation là 422 (KHÔNG phải 400)

Auth

- Header: Authorization: Bearer {accessToken}

- Interceptor 401 → POST /api/auth/refresh → retry. Đã có, không sửa.

> **Refresh token BE in-memory → mất khi BE restart. KHÔNG critical cho
> dev, nhưng khi demo production: login presenter TRƯỚC, đừng restart BE
> giữa buổi.**

11\. Checklist FE + Kỷ Luật Tránh Overthinking

Checklist nâng cấp FE

- [ ] AppModeContext + ModeSelectPage + TopNav badge

- [ ] Online flow group đúng: Explore → Detail → Tour360 → Chat →
  TimePortal

- [ ] Offline flow group đúng: Scan → Quests → Secret → PhotoFrame →
  Share

- [ ] Tour360 nâng thành Virtual Tour đa scene (view FPT)

- [ ] Chat hiển thị nguyên văn reply (có dòng Nguồn cuối)

- [ ] Gỡ seed card Quests ép cứng (chỉ seed khi DEMO_MODE)

- [ ] Loading/error/empty states mọi màn 🟡

- [ ] Pixel parity Stitch các màn ưu tiên

- [ ] Dùng token theme, KHÔNG hardcode màu

- [ ] lint + build pass

Kỷ luật tránh overthinking

- KHÔNG rewrite features/ + shared/ --- chỉ thêm/sửa theo đặc tả

- KHÔNG đổi layout Stitch khi chỉ tích hợp/binding data

- KHÔNG tự sáng tạo màu/font/component mới --- dùng cái có sẵn

- KHÔNG làm AR --- slider + QR giữ nguyên, AR là roadmap

- Mỗi màn 1 mục tiêu, xong là sang việc kế, không gold-plating

- Stuck \> 3 tiếng → đơn giản hoá, hardcode tạm, đi tiếp, polish sau

> **FE đã chạy + tích hợp 100% API. Tài liệu này chỉ nâng cấp: thêm
> Online/Offline + Virtual Tour + polish states. Bám đặc tả, dùng token
> sẵn có, không overwrite → FE đẹp + đúng + tương thích BE, sẵn sàng
> CP3.**

*TimeLens --- Đặc tả Frontend (nâng cấp, tương thích BE)*

CTO Đặng Thuận Phát --- HistAR Group 51 --- FPT University HCMC
