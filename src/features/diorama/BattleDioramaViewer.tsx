// src/features/diorama/BattleDioramaViewer.tsx
import { useState, useEffect, useRef } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'

// DỮ LIỆU ĐƯỢC BỔ SUNG MỐC THỨ 7: SỰ HỒI SINH
const CEDAR_FALLS_TIMELINE = [
    {
        date: 'Đầu năm 1967', shortDate: 'Đầu 1967', title: 'Âm mưu "Bóc vỏ trái đất"',
        action: 'prepare',
        audioSrc: '/huy/vo-step-1.mp3'
    },
    {
        date: '19:00 - 08/01/1967', shortDate: 'Tối 08/01', title: 'Bức tử Làng Bến Súc',
        action: 'tactical_map',
        audioSrc: '/huy/vo-step-2.mp3'
    },
    {
        date: '01:00 - 09/01/1967', shortDate: '01:00 09/01', title: 'Không kích B-52',
        action: 'bombing',
        audioSrc: '/huy/vo-step-3.mp3'
    },
    {
        date: '07:00 - 09/01/1967', shortDate: '07:00 09/01', title: 'Thiết giáp & Xe ủi càn quét',
        action: 'tanks_attack',
        audioSrc: '/huy/vo-step-4.mp3'
    },
    {
        date: 'Giữa tháng 01/1967', shortDate: 'Giữa 01/67', title: 'Tunnel Rats sập bẫy',
        action: 'underground',
        audioSrc: '/huy/vo-step-5.mp3'
    },
    {
        date: '26/01/1967', shortDate: '26/01/1967', title: 'Bản hùng ca Đất Thép',
        action: 'end',
        audioSrc: '/huy/vo-step-6.mp3'
    },
    {
        date: '1968', shortDate: 'Hồi Sinh', title: 'Vĩ thanh: Sự Hồi Sinh',
        desc: 'Chỉ 2 ngày sau khi Mỹ rút quân, quân Giải phóng đã quay lại kiểm soát hoàn toàn Tam Giác Sắt. Một năm sau, mạng lưới địa đạo bất diệt này trở thành bàn đạp chiến lược cho Cuộc Tổng tiến công Xuân Mậu Thân 1968.',
        action: 'revival',
        audioSrc: '/huy/vo-step-7.mp3'
    }
];

const LOCATION_TAGS = [
    { name: "SÔNG SÀI GÒN", top: "85%", left: "80%" },
    { name: "TAM GIÁC SẮT", top: "75%", left: "45%" },
    { name: "BẾN SÚC", top: "68%", left: "15%" },
    { name: "BẾN CÁT", top: "60%", left: "70%" },
];

export function BattleDioramaViewer() {
    const [isIntro, setIsIntro] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeInfo, setActiveInfo] = useState<{title: string, desc: string} | null>(null);

    const activeEvent = CEDAR_FALLS_TIMELINE[currentStep];
    const totalSteps = CEDAR_FALLS_TIMELINE.length;

    // AUDIO REFS
    const voRef = useRef<HTMLAudioElement>(null);
    const introBgmRef = useRef<HTMLAudioElement>(null);
    const narrationRef = useRef<HTMLAudioElement>(null);

    // NHẠC NỀN
    const bgmRef = useRef<HTMLAudioElement>(null);
    const extraBgmRef = useRef<HTMLAudioElement>(null);

    // ÂM THANH VFX CHIẾN TRƯỜNG
    const heliRef = useRef<HTMLAudioElement>(null);
    const bombRef = useRef<HTMLAudioElement>(null);
    const tankRef = useRef<HTMLAudioElement>(null);
    const gunRef = useRef<HTMLAudioElement>(null);
    const fireRef = useRef<HTMLAudioElement>(null);
    const dozerRef = useRef<HTMLAudioElement>(null);

    // THIẾT LẬP ÂM LƯỢNG BAN ĐẦU
    useEffect(() => {
        if (voRef.current) voRef.current.volume = 1.0;
        if (introBgmRef.current) introBgmRef.current.volume = 0.4;
        if (narrationRef.current) narrationRef.current.volume = 1.0;

        if (bgmRef.current) bgmRef.current.volume = 0.2;
        if (extraBgmRef.current) extraBgmRef.current.volume = 0.3;

        if (heliRef.current) heliRef.current.volume = 0.4;
        if (bombRef.current) bombRef.current.volume = 0.6;
        if (tankRef.current) tankRef.current.volume = 0.15;
        if (gunRef.current) gunRef.current.volume = 0.5;
        if (fireRef.current) fireRef.current.volume = 0.5;
        if (dozerRef.current) dozerRef.current.volume = 0.1;
    }, []);

    const handleFinishIntro = () => {
        setIsIntro(false);
        voRef.current?.pause();
        introBgmRef.current?.pause();
        setIsPlaying(true);
    };

    // LOGIC INTRO
    useEffect(() => {
        if (isIntro) {
            introBgmRef.current?.play().catch(()=>{});
            voRef.current?.play().catch(()=>{});
        }
    }, [isIntro]);

    // QUẢN LÝ PHÁT ÂM THANH THUYẾT MINH, NHẠC NỀN & DỪNG VFX KHI PAUSE
    useEffect(() => {
        if (isIntro) {
            extraBgmRef.current?.pause();
            return;
        }

        if (isPlaying) {
            bgmRef.current?.play().catch(() => {});
            extraBgmRef.current?.play().catch(() => {});
            narrationRef.current?.play().catch(() => {});
            // Ghi chú: VFX sẽ được kích hoạt play() ở useEffect bên dưới dựa theo currentStep
        } else {
            bgmRef.current?.pause();
            extraBgmRef.current?.pause();
            narrationRef.current?.pause();

            // ĐÃ THÊM: Bắt buộc DỪNG TOÀN BỘ âm thanh VFX khi bấm Pause!
            heliRef.current?.pause();
            bombRef.current?.pause();
            tankRef.current?.pause();
            gunRef.current?.pause();
            fireRef.current?.pause();
            dozerRef.current?.pause();
        }
    }, [isPlaying, isIntro, currentStep]);

    // QUẢN LÝ VFX SOUND KÍCH HOẠT THEO TỪNG GIAI ĐOẠN
    useEffect(() => {
        // Tắt hết VFX cũ trước khi chuyển mốc mới.
        // ĐẶC BIỆT LƯU Ý: Đã đổi if (!isPlaying) thành if (!isPlaying) return; để tránh kích hoạt nhầm.
        if (!isPlaying || isIntro) return;

        heliRef.current?.pause(); bombRef.current?.pause(); tankRef.current?.pause(); gunRef.current?.pause();
        fireRef.current?.pause(); dozerRef.current?.pause();

        if (activeEvent.action === 'prepare') {
            if (heliRef.current) { heliRef.current.currentTime = 0; heliRef.current.play().catch(()=>{}); }
        } else if (activeEvent.action === 'tactical_map') {
            if (fireRef.current) { fireRef.current.currentTime = 0; fireRef.current.play().catch(()=>{}); }
        } else if (activeEvent.action === 'bombing') {
            if (bombRef.current) { bombRef.current.currentTime = 0; bombRef.current.play().catch(()=>{}); }
        } else if (activeEvent.action === 'tanks_attack') {
            if (tankRef.current) { tankRef.current.currentTime = 0; tankRef.current.play().catch(()=>{}); }
            if (dozerRef.current) { dozerRef.current.currentTime = 0; dozerRef.current.play().catch(()=>{}); }
        } else if (activeEvent.action === 'underground' || activeEvent.action === 'end') {
            if (gunRef.current) { gunRef.current.currentTime = 0; gunRef.current.play().catch(()=>{}); }
        } else if (activeEvent.action === 'revival') {
            // Mốc Vĩ Thanh: Tắt mọi âm thanh chiến tranh khói lửa, chỉ giữ nhạc nền và giọng đọc
        }
    }, [currentStep, activeEvent.action, isPlaying, isIntro]);

    // CHUYỂN CẢNH KHI AUDIO KẾT THÚC
    const handleNarrationEnded = () => {
        if (isPlaying && !isIntro) {
            setCurrentStep((prev) => {
                if (prev >= totalSteps - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }
    };

    const togglePlay = () => setIsPlaying(!isPlaying);

    const handleTimelineClick = (index: number) => {
        setCurrentStep(index);
        setIsPlaying(true);
        setActiveInfo(null);
    };

    return (
        <div className="relative w-full h-full bg-[#050505] overflow-hidden flex flex-col font-sans select-none">

            <style>{`
                @keyframes bomb-drop {
                    0% { transform: translateY(-50vh) rotate(45deg); opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateY(0) rotate(45deg); opacity: 0; }
                }
                @keyframes dust-roll {
                    0% { transform: scale(0.8) translateX(0); opacity: 0.2; }
                    50% { opacity: 0.8; }
                    100% { transform: scale(1.5) translateX(30px) translateY(-10px); opacity: 0; }
                }
                @keyframes intro-scroll {
                    0% { transform: translateY(10%); opacity: 0; }
                    3% { opacity: 1; transform: translateY(0%); }
                    90% { opacity: 1; transform: translateY(-100%); }
                    100% { transform: translateY(-120%); opacity: 0; }
                }
                @keyframes embers-fly {
                    0% { transform: translateY(100vh) translateX(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-10vh) translateX(50px) scale(0.3); opacity: 0; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) scale(0.85); }
                    50% { transform: translateY(-8px) scale(0.85); }
                }
                @keyframes float-mascot {
                    0%, 100% { transform: translateY(0px) rotate(-5deg); }
                    50% { transform: translateY(-15px) rotate(0deg); }
                }
                @keyframes rat-enter {
                    0% { transform: translateX(-40px) rotate(5deg); opacity: 0; }
                    10% { transform: translateX(0) rotate(5deg); opacity: 1; }
                    40% { transform: translateX(40px) rotate(5deg); opacity: 1; } 
                    42% { transform: translateX(40px) translateY(-20px) rotate(-30deg) scale(1.1); opacity: 0; } 
                    100% { opacity: 0; }
                }
                @keyframes flashlight-sweep {
                    0% { opacity: 0; transform: rotate(-10deg); }
                    10% { opacity: 0.8; transform: rotate(-10deg); }
                    25% { transform: rotate(15deg); }
                    40% { transform: rotate(-5deg); opacity: 0.8; }
                    42%, 100% { opacity: 0; }
                }
                @keyframes trap-boom {
                    0%, 39% { opacity: 0; transform: scale(0.1); }
                    41% { opacity: 1; transform: scale(1.5); }
                    45%, 100% { opacity: 0; transform: scale(2); }
                }
                @keyframes rat-enter-2 {
                    0% { transform: translateX(30px) scaleX(-1); opacity: 0; }
                    10% { transform: translateX(15px) scaleX(-1); opacity: 1; }
                    40% { transform: translateX(-10px) scaleX(-1); opacity: 1; } 
                    42% { transform: translateX(-10px) translateY(-20px) rotate(20deg) scale(1.1) scaleX(-1); opacity: 0; } 
                    100% { opacity: 0; }
                }
                @keyframes flashlight-sweep-2 {
                    0% { opacity: 0; transform: rotate(10deg); }
                    10% { opacity: 0.8; transform: rotate(10deg); }
                    25% { transform: rotate(-5deg); }
                    40% { transform: rotate(5deg); opacity: 0.8; }
                    42%, 100% { opacity: 0; }
                }
                @keyframes trap-boom-2 {
                    0%, 39% { opacity: 0; transform: scale(0.1); }
                    41% { opacity: 1; transform: scale(1.5); }
                    45%, 100% { opacity: 0; transform: scale(2); }
                }

                .animate-bomb { animation: bomb-drop 1s ease-in infinite; }
                .animate-dust { animation: dust-roll 1.5s linear infinite; }
                .animate-intro-text { animation: intro-scroll 90s linear forwards; }
                .animate-float { animation: float 4s ease-in-out infinite; }
                .animate-mascot { animation: float-mascot 4s ease-in-out infinite; }
            `}</style>

            <audio ref={voRef} src="/huy/voiceover.mp3" onEnded={handleFinishIntro} />
            <audio ref={introBgmRef} src="/huy/epic-intro.mp3" loop />
            <audio ref={narrationRef} src={activeEvent.audioSrc} onEnded={handleNarrationEnded} />

            <audio ref={bgmRef} src="/huy/bgm-war.mp3" loop />
            <audio ref={extraBgmRef} src="/huy/dennish18-modern-war-129016.mp3" loop />

            <audio ref={heliRef} src="/huy/heli.mp3" />
            <audio ref={bombRef} src="/huy/bomb.mp3" />
            <audio ref={tankRef} src="/huy/tank.mp3" />
            <audio ref={gunRef} src="/huy/gunfire.mp3" />
            <audio ref={fireRef} src="/huy/fire.mp3" loop />
            <audio ref={dozerRef} src="/huy/bulldozer-engine.mp3" />

            {/* ========================================= */}
            {/* MÀN HÌNH LỜI TỰA (PROLOGUE) */}
            {/* ========================================= */}
            <div className={`absolute inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-1000 ${isIntro ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-[#050505]/70 backdrop-blur-2xl"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0275FB]/10 via-transparent to-transparent mix-blend-screen"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[50vh] bg-[#0275FB]/15 rounded-[100%] blur-[100px] animate-[pulse_4s_ease-in-out_infinite] mix-blend-screen pointer-events-none"></div>

                {/* MASCOT DẪN ĐƯỜNG */}
                <div className="absolute top-8 left-8 xl:top-12 xl:left-16 z-50 pointer-events-none flex flex-col items-center">
                    <div className="relative animate-mascot group cursor-default">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#FDC908]/40 rounded-full blur-[25px] animate-[pulse_3s_ease-in-out_infinite] mix-blend-screen -z-10"></div>
                        <img src="/huy/mascot-10.png" alt="Mascot Hướng dẫn" className="w-32 md:w-40 xl:w-48 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-110" />
                    </div>
                </div>

                {/* VFX TÀN LỬA */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen z-0">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="absolute bottom-0 w-2 h-2 bg-[#FDC908] rounded-full blur-[2px]"
                             style={{ left: `${(i * 13) % 100}%`, animation: `embers-fly ${4 + (i % 5)}s ease-in infinite`, animationDelay: `${(i % 7)}s`, opacity: 0.2 + ((i % 5) / 10) }}></div>
                    ))}
                    {[...Array(10)].map((_, i) => (
                        <div key={`yellow-${i}`} className="absolute bottom-0 w-1.5 h-1.5 bg-[#FFF2C3] rounded-full blur-[1px]"
                             style={{ left: `${(i * 27) % 100}%`, animation: `embers-fly ${3 + (i % 4)}s ease-in infinite`, animationDelay: `${(i % 5)}s` }}></div>
                    ))}
                </div>

                <div className="relative z-10 flex flex-col items-center w-[95%] max-w-5xl h-full py-8 justify-start">
                    <div className="animate-pulse text-[#FFF2C3] text-[10px] uppercase tracking-[0.4em] font-bold mb-4 drop-shadow-md">
                        <MaterialIcon name="headphones" className="text-sm mr-2 align-middle inline-block" />
                        Hãy bật âm thanh để có trải nghiệm tốt nhất
                    </div>
                    <div className="flex flex-col items-center gap-1 mb-4">
                        <span className="text-[#38bdf8] font-bold text-sm md:text-base tracking-[0.4em] uppercase drop-shadow-[0_0_8px_rgba(2,117,251,0.8)]">Chiến dịch</span>
                        <h1 className="text-[#FDC908] font-black text-6xl md:text-8xl tracking-widest drop-shadow-[0_0_30px_rgba(253,201,8,0.6)] leading-none my-2 text-center">CEDAR FALLS</h1>
                        <span className="text-white font-bold text-xs md:text-sm tracking-[0.2em] uppercase mt-2 drop-shadow-md opacity-80 text-center">"Bóc vỏ trái đất" tại Tam Giác Sắt (1967)</span>
                    </div>

                    <div className="relative w-full h-[45vh] overflow-hidden mt-4" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}>
                        <div className="absolute inset-x-0 top-full animate-[intro-scroll_90s_linear_forwards] flex flex-col gap-6 text-[#FFF2C3]/90 text-sm md:text-lg font-medium leading-relaxed px-4 md:px-12 text-center pb-[50vh]">
                            <p>Trong chiến tranh xâm lược Việt Nam, đế quốc Mỹ đã huy động một lực lượng quân sự khổng lồ nặn ra một chế độ ngụy quân ngụy quyền theo kiểu thực dân mới. Một cỗ máy chiến tranh đồ sộ đã được thiết lập nhằm đánh bại cuộc kháng chiến của nhân dân Việt Nam.</p>
                            <p>Nhưng mọi cố gắng và nỗ lực của Mỹ đã bị thất bại thảm hại trước sự lãnh đạo tài tình của Đảng, sự đoàn kết, tài trí, thông minh và quyết tâm giải phóng miền Nam Việt Nam, thống nhất đất nước của quân và dân ta.</p>
                            <p>Sài Gòn Gia Định là trung tâm của tập đoàn quân sự Mỹ Ngụy. Năm 1965, Mỹ bắt đầu đổ bộ quân viễn chinh vào miền Nam Việt Nam, tiến hành chiến lược Chiến tranh cục bộ với âm mưu thâm độc: Bình định và Tìm diệt nhằm trực phá toàn bộ các lực lượng cách mạng của ta.</p>
                            <p>Trên các chiến trường miền Nam, phong trào diệt Mỹ của quân và dân ta ngày càng nâng cao làm cho kẻ địch bị quẫn túng và thua đau. Sau những bất ngờ, địch phát hiện ra các lực lượng chiến đấu của ta đã xuất phát từ trong lòng đất và các chiến hào.</p>
                            <p>Chúng quyết tâm phá hủy địa đạo, đánh bật lực lượng cách mạng ra xa tạo vành đai an toàn bảo vệ Sài Gòn. Cuộc hành quân của đêm hồi đầu năm 1966 nhằm bình định phá nát địa đạo Củ Chi bị thất bại. Vùng chiến sự tô bắc ngày càng uy hiếp trực tiếp Sài Gòn.</p>
                            <p>Nhận rõ tầm quan trọng chiến lược của lá chắn vùng Tây Bắc Sài Gòn, đầu năm 1967, các chuyên gia quân sự sừng sỏ nhất của Mỹ sau khi nghiên cứu kỹ đã liều lĩnh vạch ra kế hoạch mở trận càn quét trên hướng Tây Bắc mang tên <span className="text-[#FDC908] font-black uppercase tracking-wider shadow-yellow-500 drop-shadow-md">Cedar Falls</span> vào vùng Tam Giác Sắt.</p>
                            <p className="text-xl md:text-2xl font-black text-white mt-4 drop-shadow-[0_0_10px_white]">Đó là cuộc hành binh bóc vỏ Trái Đất...</p>
                            <p>nhằm tiêu diệt cơ quan lãnh đạo trong khu vực miền Nam và khu ủy bộ chỉ huy quân khu Sài Gòn Gia Định và các đơn vị của ta. Phá hủy vùng căn cứ và hệ thống địa đạo Tây Nam Bến Cát và địa đạo Củ Chi.</p>
                        </div>
                    </div>
                </div>

                <button onClick={handleFinishIntro} className="absolute bottom-8 right-8 px-6 py-2 bg-[#0275FB]/20 hover:bg-[#0275FB]/40 border border-[#0275FB]/50 rounded-full text-white text-xs font-black uppercase tracking-widest transition-colors backdrop-blur-md z-20 flex items-center gap-2 shadow-[0_0_15px_rgba(2,117,251,0.3)]">
                    Bỏ qua <MaterialIcon name="skip_next" className="text-sm" />
                </button>
            </div>

            {/* ========================================= */}
            {/* LỚP 1 - LỚP 4: SA BÀN, BẢN ĐỒ, MÔ HÌNH VFX */}
            {/* ========================================= */}
            <div className={`absolute inset-0 transition-all duration-[2000ms] flex items-center justify-center ${isIntro ? 'animate-[slow-zoom_78s_linear] blur-[3px]' : 'scale-100 blur-0'}`}>
                <img src="/huy/nen-sa-ban.png" className="absolute inset-0 w-full h-full object-cover opacity-90" alt="Sa bàn Cedar Falls" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 mix-blend-multiply"></div>
                <div className="absolute bottom-0 w-full h-[40%] bg-[radial-gradient(ellipse_at_center,rgba(253,201,8,0.05)_0%,transparent_80%)] animate-pulse"></div>
            </div>

            {/* MỚI: LỚP VĨ THANH - SỰ HỒI SINH (TẦNG ĐỊA ĐẠO TỎA SÁNG VÀNG RỰC RỠ) */}
            {activeEvent.action === 'revival' && (
                <div className="absolute inset-0 z-30 transition-opacity duration-[3000ms] opacity-100">
                    {/* Lớp phủ vàng ấm từ đáy sa bàn bốc lên */}
                    <div className="absolute bottom-0 w-full h-[60%] bg-gradient-to-t from-[#FDC908]/30 via-[#FDC908]/10 to-transparent animate-[pulse_4s_ease-in-out_infinite] mix-blend-color-dodge pointer-events-none"></div>

                    {/* Các luồng sáng rực rỡ tại 3 tầng địa đạo */}
                    <div className="absolute top-[30%] left-[25%] w-40 h-20 bg-yellow-400/50 blur-[30px] animate-[pulse_3s_ease-in-out_infinite] mix-blend-screen"></div>
                    <div className="absolute top-[45%] left-[55%] w-48 h-24 bg-[#FDC908]/60 blur-[40px] animate-[pulse_4s_ease-in-out_infinite] mix-blend-screen" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-[55%] left-[80%] w-32 h-32 bg-orange-400/50 blur-[35px] animate-[pulse_3.5s_ease-in-out_infinite] mix-blend-screen" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute top-[35%] left-[75%] w-24 h-24 bg-yellow-300/40 blur-[25px] animate-[pulse_2.5s_ease-in-out_infinite] mix-blend-screen" style={{ animationDelay: '1.5s' }}></div>
                    <div className="absolute top-[60%] left-[30%] w-36 h-20 bg-[#FDC908]/40 blur-[30px] animate-[pulse_4.5s_ease-in-out_infinite] mix-blend-screen" style={{ animationDelay: '0.8s' }}></div>

                    {/* Điểm nhấn ngôi sao lấp lánh tượng trưng cho mầm sống/hy vọng */}
                    {[...Array(15)].map((_, i) => (
                        <div key={`star-${i}`} className="absolute w-1.5 h-1.5 bg-white rounded-full blur-[1px] animate-ping"
                             style={{
                                 top: `${30 + Math.random() * 40}%`,
                                 left: `${10 + Math.random() * 80}%`,
                                 animationDuration: `${2 + Math.random() * 3}s`,
                                 animationDelay: `${Math.random() * 2}s`
                             }}>
                        </div>
                    ))}
                </div>
            )}

            <div className={`absolute inset-0 z-[5] pointer-events-none transition-opacity duration-1000 ${activeEvent.action === 'revival' ? 'opacity-0' : 'opacity-100'}`}>
                {LOCATION_TAGS.map((tag, idx) => (
                    <div key={idx} className="absolute flex items-center gap-1.5 px-3 py-1 bg-[#1E293B]/80 border border-[#475569] backdrop-blur-sm rounded-md shadow-lg transition-opacity duration-500"
                         style={{ top: tag.top, left: tag.left, transform: 'translate(-50%, -50%) perspective(500px) rotateX(20deg)', opacity: (tag.name === 'BẾN SÚC' && currentStep > 0) ? 0.3 : 1 }}>
                        <div className={`w-1.5 h-1.5 rounded-full ${tag.name === 'BẾN SÚC' && currentStep === 1 ? 'bg-red-500 animate-ping' : 'bg-[#FDC908] animate-pulse'}`}></div>
                        <span className={`font-bold text-[9px] uppercase tracking-widest ${tag.name === 'BẾN SÚC' && currentStep === 1 ? 'text-red-400' : 'text-gray-300'}`}>{tag.name}</span>
                    </div>
                ))}
            </div>

            <svg width="100%" height="100%" className={`absolute inset-0 z-[6] pointer-events-none transition-opacity duration-1000 ${activeEvent.action === 'tactical_map' ? 'opacity-100' : 'opacity-0'}`}>
                <rect x="65%" y="65%" width="30%" height="30%" fill="rgba(2, 117, 251, 0.15)" stroke="#0275FB" strokeWidth="3" strokeDasharray="10 10" className="animate-pulse" />
                <text x="68%" y="80%" fill="#0275FB" fontSize="16" fontWeight="bold" style={{textShadow: '0 0 10px #0275FB'}}>CÁI ĐE (SƯ ĐOÀN 25)</text>
                <path d="M 20% 85% L 45% 70% M 45% 70% L 35% 65% M 45% 70% L 45% 80%" fill="none" stroke="#ef4444" strokeWidth="6" className="animate-pulse" style={{filter: 'drop-shadow(0 0 10px red)'}} />
                <text x="25%" y="80%" fill="#ef4444" fontSize="16" fontWeight="bold" style={{textShadow: '0 0 10px red'}}>CÁI BÚA (SƯ ĐOÀN 1)</text>
            </svg>

            <div className={`absolute inset-0 z-10 pointer-events-none overflow-hidden transition-opacity duration-500 ${(isIntro || activeEvent.action === 'revival') ? 'opacity-0' : 'opacity-100'}`}>
                {(currentStep === 1 || currentStep === 2) && (
                    <div className="absolute z-20" style={{ top: '65%', left: '20%', transform: 'translate(-50%, -50%)' }}>
                        <div className="absolute w-24 h-24 bg-orange-600/70 blur-[15px] animate-pulse rounded-full mix-blend-color-dodge"></div>
                        <div className="absolute w-12 h-12 bg-yellow-400/90 blur-[10px] animate-ping rounded-full mix-blend-color-dodge"></div>
                        <div className="absolute -top-32 -left-10 w-32 h-64 bg-black/80 blur-[25px] animate-[pulse_3s_ease-in-out_infinite]"></div>
                    </div>
                )}
                {currentStep >= 3 && (
                    <div className="absolute z-10" style={{ top: '65%', left: '20%', transform: 'translate(-50%, -50%)' }}>
                        <div className="w-32 h-16 bg-black/80 blur-[15px] rounded-[100%] mix-blend-multiply"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-8 bg-red-600/30 blur-[10px] animate-pulse mix-blend-color-dodge"></div>
                    </div>
                )}

                <div className="absolute transition-all duration-[10000ms] ease-in-out flex flex-col items-center"
                     style={{ right: currentStep >= 1 && currentStep < 5 ? '8%' : '-20%', bottom: currentStep >= 1 && currentStep < 5 ? '12%' : '-20%', opacity: currentStep >= 1 && currentStep < 5 ? 1 : 0 }}>
                    <div className="relative animate-float">
                        <img src="/huy/boat-transparent.png" alt="River Patrol Boat" className="w-32 drop-shadow-[15px_15px_10px_rgba(0,0,0,0.6)]" />
                        {activeEvent.action === 'tanks_attack' && (
                            <div className="absolute top-[30%] left-[10%] w-10 h-10 bg-yellow-400 blur-md animate-[pulse_0.1s_infinite] mix-blend-color-dodge rounded-full"></div>
                        )}
                    </div>
                </div>

                <div className="absolute transition-all duration-[8000ms] ease-in-out flex flex-col items-center z-30"
                     style={{ left: activeEvent.action === 'prepare' || activeEvent.action === 'tactical_map' ? '15%' : activeEvent.action === 'bombing' ? '50%' : '120%', top: activeEvent.action === 'bombing' ? '12%' : '5%', opacity: currentStep < 3 ? 1 : 0, transform: 'scale(0.95)' }}>
                    <img src="/huy/heli-transparent.png" alt="Huey Helicopter" className="w-48 drop-shadow-[0_40px_20px_rgba(0,0,0,0.8)]" />
                </div>

                {activeEvent.action === 'bombing' && (
                    <div className="absolute inset-0 z-20">
                        <div className="absolute inset-0 bg-orange-500/10 mix-blend-color-dodge animate-pulse"></div>
                        <div className="absolute top-[80%] left-[25%] -translate-x-1/2 -translate-y-1/2">
                            <svg className="absolute -top-10 left-10 w-4 h-12 fill-black drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] animate-bomb" viewBox="0 0 24 24"><path d="M12,2A3,3 0 0,0 9,5C9,9 3,14 3,19A3,3 0 0,0 6,22H18A3,3 0 0,0 21,19C21,14 15,9 15,5A3,3 0 0,0 12,2M12,4A1,1 0 0,1 13,5C13,8.5 17.5,13.2 18.8,17.4C18.9,17.7 19,18.1 19,18.5H5C5,18.1 5.1,17.7 5.2,17.4C6.5,13.2 11,8.5 11,5A1,1 0 0,1 12,4Z" /></svg>
                            <div className="absolute -top-64 -left-32 w-64 h-96 bg-gray-900/90 blur-[50px] animate-[pulse_3s_ease-in-out_infinite]"></div>
                            <div className="absolute w-72 h-72 bg-orange-600/50 rounded-full blur-[40px] animate-ping"></div>
                            <div className="absolute w-32 h-32 bg-yellow-300/80 rounded-full blur-[20px] animate-ping" style={{ animationDelay: '0.1s' }}></div>
                        </div>
                        <div className="absolute top-[65%] left-[50%] -translate-x-1/2 -translate-y-1/2">
                            <svg className="absolute -top-16 left-0 w-5 h-16 fill-black drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] animate-bomb" style={{animationDelay: '0.2s'}} viewBox="0 0 24 24"><path d="M12,2A3,3 0 0,0 9,5C9,9 3,14 3,19A3,3 0 0,0 6,22H18A3,3 0 0,0 21,19C21,14 15,9 15,5A3,3 0 0,0 12,2M12,4A1,1 0 0,1 13,5C13,8.5 17.5,13.2 18.8,17.4C18.9,17.7 19,18.1 19,18.5H5C5,18.1 5.1,17.7 5.2,17.4C6.5,13.2 11,8.5 11,5A1,1 0 0,1 12,4Z" /></svg>
                            <div className="absolute -top-80 -left-40 w-80 h-[500px] bg-black/80 blur-[60px] animate-[pulse_4s_ease-in-out_infinite]"></div>
                            <div className="absolute w-96 h-96 bg-red-600/40 rounded-full blur-[60px] animate-ping" style={{ animationDelay: '0.2s' }}></div>
                            <div className="absolute w-40 h-40 bg-yellow-500/70 rounded-full blur-[30px] animate-ping" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                        <div className="absolute top-[70%] left-[80%] -translate-x-1/2 -translate-y-1/2">
                            <svg className="absolute -top-12 -left-10 w-4 h-12 fill-black drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] animate-bomb" style={{animationDelay: '0.4s'}} viewBox="0 0 24 24"><path d="M12,2A3,3 0 0,0 9,5C9,9 3,14 3,19A3,3 0 0,0 6,22H18A3,3 0 0,0 21,19C21,14 15,9 15,5A3,3 0 0,0 12,2M12,4A1,1 0 0,1 13,5C13,8.5 17.5,13.2 18.8,17.4C18.9,17.7 19,18.1 19,18.5H5C5,18.1 5.1,17.7 5.2,17.4C6.5,13.2 11,8.5 11,5A1,1 0 0,1 12,4Z" /></svg>
                            <div className="absolute -top-48 -left-24 w-48 h-64 bg-gray-900/80 blur-[40px] animate-pulse"></div>
                            <div className="absolute w-64 h-64 bg-orange-700/50 rounded-full blur-[50px] animate-ping" style={{ animationDelay: '0.15s' }}></div>
                            <div className="absolute w-24 h-24 bg-white/60 rounded-full blur-[15px] animate-ping" style={{ animationDelay: '0.25s' }}></div>
                        </div>
                    </div>
                )}

                <div className="absolute transition-all duration-[10000ms] ease-in-out flex items-center gap-6 z-20"
                     style={{ bottom: activeEvent.action === 'tanks_attack' || activeEvent.action === 'underground' ? '8%' : '-30%', left: activeEvent.action === 'tanks_attack' || activeEvent.action === 'underground' ? '25%' : '-20%', opacity: currentStep >= 3 && currentStep < 5 ? 1 : 0, transform: 'scale(0.95)' }}>
                    <div className="relative">
                        <img src="/huy/tank-transparent.png" alt="M48 Tank" className="w-56 drop-shadow-[15px_15px_10px_rgba(0,0,0,0.8)] relative z-10" />
                        {activeEvent.action === 'tanks_attack' && (
                            <div className="absolute top-[25%] right-[0%] w-16 h-16 bg-orange-400 blur-xl animate-[pulse_0.1s_infinite] mix-blend-color-dodge z-20"></div>
                        )}
                    </div>
                    <div className="relative">
                        <img src="/huy/bulldozer-transparent.png" alt="Rome Plow Bulldozer" className="w-48 drop-shadow-[15px_15px_10px_rgba(0,0,0,0.8)] relative z-10" />
                        {activeEvent.action === 'tanks_attack' && (
                            <div className="absolute bottom-[-10%] right-[-10%] w-32 h-24 bg-[#5c4033] blur-[25px] animate-dust z-0"></div>
                        )}
                    </div>
                </div>

                {activeEvent.action === 'underground' && (
                    <div className="absolute inset-0 z-30 mix-blend-color-dodge">
                        <div className="absolute top-[31%] left-[16%] -translate-x-1/2 -translate-y-1/2">
                            <div className="w-16 h-16 bg-yellow-400/90 blur-xl animate-ping" style={{ animationDuration: '0.3s' }}></div>
                            <div className="absolute inset-0 w-32 h-32 bg-orange-500/40 blur-2xl animate-pulse -translate-x-1/4 -translate-y-1/4"></div>
                        </div>
                        <div className="absolute top-[31%] left-[81%] -translate-x-1/2 -translate-y-1/2">
                            <div className="w-20 h-20 bg-white/80 blur-xl animate-ping" style={{ animationDuration: '0.4s', animationDelay: '0.1s' }}></div>
                        </div>
                        <div className="absolute top-[41%] left-[45%] -translate-x-1/2 -translate-y-1/2">
                            <div className="w-24 h-24 bg-red-500/80 blur-2xl animate-ping" style={{ animationDuration: '0.5s' }}></div>
                            <div className="absolute inset-0 w-12 h-12 bg-yellow-200/90 blur-lg animate-ping" style={{ animationDuration: '0.2s', animationDelay: '0.15s' }}></div>
                        </div>
                        <div className="absolute top-[50%] left-[18%] -translate-x-1/2 -translate-y-1/2">
                            <div className="w-16 h-16 bg-orange-400/90 blur-xl animate-ping" style={{ animationDuration: '0.25s', animationDelay: '0.05s' }}></div>
                        </div>
                        <div className="absolute top-[52%] left-[50%] -translate-x-1/2 -translate-y-1/2">
                            <div className="w-32 h-32 bg-yellow-500/50 blur-2xl animate-pulse"></div>
                            <div className="absolute inset-0 w-14 h-14 bg-white/90 blur-lg animate-ping" style={{ animationDuration: '0.35s', animationDelay: '0.2s' }}></div>
                        </div>
                        <div className="absolute top-[52%] left-[83%] -translate-x-1/2 -translate-y-1/2">
                            <div className="w-20 h-20 bg-yellow-300/80 blur-xl animate-ping" style={{ animationDuration: '0.3s', animationDelay: '0.1s' }}></div>
                            <div className="absolute inset-0 w-40 h-40 bg-red-600/30 blur-3xl animate-pulse"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* LỚP 6: HOTSPOTS - ĐÃ CẤU HÌNH ĐỂ ẨN Ở MỐC REVIVAL BẰNG CÁCH GIỮ NGUYÊN ĐIỀU KIỆN currentStep */}
            {currentStep === 1 && !isIntro && (
                <div className="absolute z-40 flex flex-col items-center gap-1 cursor-pointer group"
                     style={{ left: '25%', top: '65%', transform: 'translate(-50%, -50%)' }}
                     onClick={() => setActiveInfo({ title: 'Bức Tử Làng Bến Súc', desc: 'Sáng 08/01/1967, Mỹ bất ngờ bao vây Bến Súc. Hàng ngàn dân thường bị cưỡng chế di dời. Sau đó, công binh Mỹ dùng xe ủi đất và lửa thiêu rụi hoàn toàn nhà cửa, ruộng vườn, biến ngôi làng trù phú thành vùng "đất chết" trên bản đồ.' })}>
                    <div className="relative flex justify-center items-center z-10 transition-transform duration-300 group-hover:scale-125">
                        <img src="/huy/fire.gif" alt="Bến Súc chìm trong biển lửa" className="w-20 h-24 object-contain mix-blend-screen drop-shadow-[0_0_15px_rgba(255,100,0,0.8)]" />
                        <div className="absolute bottom-2 w-8 h-4 bg-red-600/50 rounded-[100%] blur-sm animate-ping -z-10"></div>
                    </div>
                    <span className="text-white font-bold text-[10px] bg-black/60 border border-orange-500/50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-sm mt-[-5px]">Khám Phá Bến Súc</span>
                </div>
            )}

            {currentStep === 4 && !isIntro && (
                <>
                    <div className="absolute z-40 flex flex-col items-center gap-1 cursor-pointer group"
                         style={{ left: '16%', top: '31%', transform: 'translate(-50%, -50%)' }}
                         onClick={() => setActiveInfo({ title: 'Đội Quân "Lính Chuột Cống" Thất Bại', desc: 'Cedar Falls là chiến dịch đầu tiên Mỹ sử dụng đặc nhiệm Tunnel Rats xâm nhập hệ thống ngầm. Tại tầng 1, lính Mỹ liên tục dính mìn gạt và hầm chông được ngụy trang hoàn hảo.' })}>
                        <div className="relative w-32 h-16 z-10 transition-transform duration-300 group-hover:scale-110">
                            <div className="absolute top-[35%] left-[50%] w-24 h-6 bg-gradient-to-r from-yellow-100/40 to-transparent origin-left rounded-full blur-[2px] animate-[flashlight-sweep_5s_infinite] mix-blend-screen z-20 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 w-24 h-12 animate-[rat-enter_5s_infinite] z-10 pointer-events-none drop-shadow-[0_5px_5px_rgba(0,0,0,0.9)]">
                                <img src="/huy/tunnel-rat.png" alt="Tunnel Rat 1" className="w-full h-full object-contain filter brightness-90 contrast-125" />
                            </div>
                            <div className="absolute top-[20%] left-[80%] w-16 h-16 animate-[trap-boom_5s_infinite] z-30 pointer-events-none flex items-center justify-center">
                                <div className="absolute w-full h-full bg-orange-600/90 rounded-full blur-[10px] mix-blend-color-dodge"></div>
                                <div className="absolute w-1/2 h-1/2 bg-yellow-200/90 rounded-full blur-[5px] mix-blend-color-dodge"></div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute z-40 flex flex-col items-center gap-1 cursor-pointer group"
                         style={{ left: '82%', top: '42%', transform: 'translate(-50%, -50%)' }}
                         onClick={() => setActiveInfo({ title: 'Hầm Chữ U Chống Khói Độc', desc: 'Khu vực tầng 2 hoàn toàn tối tăm không ánh đèn. Tại đây, lính Mỹ gặp phải hệ thống ngách hầm chữ U ngập nước chặn đứng hơi độc, biến thành mồ chôn lực lượng viễn chinh.' })}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-24 bg-orange-500/20 rounded-full blur-[20px] animate-pulse pointer-events-none -z-10"></div>
                        <div className="relative w-24 h-20 z-10 transition-transform duration-300 group-hover:scale-110">
                            <div className="absolute top-[45%] right-[60%] w-24 h-8 bg-gradient-to-l from-yellow-200/60 to-transparent origin-right rounded-full blur-[3px] animate-[flashlight-sweep-2_5s_infinite] mix-blend-screen z-20 pointer-events-none"></div>
                            <div className="absolute top-0 right-0 w-20 h-16 animate-[rat-enter-2_5s_infinite] z-10 pointer-events-none drop-shadow-[0_0_12px_rgba(253,201,8,0.5)]">
                                <img src="/huy/tunnel-rat-2.png" alt="Tunnel Rat 2" className="w-full h-full object-contain filter brightness-90 contrast-110" />
                            </div>
                            <div className="absolute top-[40%] right-[80%] w-16 h-16 animate-[trap-boom-2_5s_infinite] z-30 pointer-events-none flex items-center justify-center">
                                <div className="absolute w-full h-full bg-orange-600/90 rounded-full blur-[10px] mix-blend-color-dodge"></div>
                                <div className="absolute w-1/2 h-1/2 bg-yellow-200/90 rounded-full blur-[5px] mix-blend-color-dodge"></div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeInfo && !isIntro && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-[#0F172A]/95 backdrop-blur-2xl p-7 rounded-2xl border border-red-500/50 shadow-[0_0_80px_rgba(239,68,68,0.3)]">
                    <p className="text-red-500 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MaterialIcon name="target" className="text-base" /> TIÊU ĐIỂM CHIẾN TRẬN
                    </p>
                    <h3 className="text-white text-xl font-black mb-4">{activeInfo.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-6">{activeInfo.desc}</p>
                    <button onClick={() => setActiveInfo(null)} className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-xs font-black tracking-widest transition-colors shadow-[0_5px_20px_rgba(239,68,68,0.4)]">
                        ĐÓNG BÁO CÁO
                    </button>
                </div>
            )}

            {/* ========================================= */}
            {/* LỚP 7: BẢNG ĐIỀU KHIỂN TIMELINE CÂY (ĐÃ CĂN CHỈNH LẠI PADDING & VỊ TRÍ CHỮ) */}
            {/* ========================================= */}
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl bg-[#0275FB]/20 backdrop-blur-md border border-[#0275FB]/40 rounded-xl px-4 pt-2.5 pb-4 shadow-[0_10px_30px_rgba(2,117,251,0.2)] transition-transform duration-1000 ${isIntro ? 'translate-y-32' : 'translate-y-0'}`}>

                {/* ROW 1: Nút Play & Thanh Timeline */}
                <div className="flex items-center w-full">
                    {/* Nút Play */}
                    <div className="flex flex-col items-center shrink-0 w-12">
                        <button onClick={togglePlay} className="w-8 h-8 bg-gradient-to-br from-[#FDC908] to-[#e07d0b] text-black rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(253,201,8,0.5)] hover:scale-105 transition-transform">
                            <MaterialIcon name={isPlaying ? "pause" : "play_arrow"} className="text-sm" />
                        </button>
                    </div>

                    {/* Timeline Tree */}
                    <div className="relative flex-1 h-6 flex items-center mx-6">
                        <div className="absolute left-0 right-0 h-1 bg-[#FFF2C3]/30 rounded-full z-0"></div>
                        <div className="absolute left-0 h-1 bg-[#FDC908] rounded-full z-0 transition-all duration-500 ease-out shadow-[0_0_10px_#FDC908]"
                             style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}></div>
                        {CEDAR_FALLS_TIMELINE.map((event, idx) => {
                            const isPassed = idx <= currentStep;
                            const isActive = idx === currentStep;
                            const leftPos = `${(idx / (totalSteps - 1)) * 100}%`;

                            return (
                                <div
                                    key={idx}
                                    className="absolute top-1/2 flex flex-col items-center cursor-pointer group z-10"
                                    style={{ left: leftPos, transform: 'translate(-50%, -50%)' }}
                                    onClick={() => handleTimelineClick(idx)}
                                >
                                    <div className={`w-3 h-3 rounded-full border-[2px] transition-all duration-300 ${
                                        isActive ? 'bg-[#FDC908] border-white shadow-[0_0_10px_#FDC908] scale-150' :
                                            isPassed ? 'bg-[#FDC908] border-[#0275FB] scale-110' :
                                                'bg-[#FFF2C3] border-[#0275FB]/80 group-hover:border-white group-hover:scale-125'
                                    }`}></div>

                                    {/* Kéo chữ lên (top-4 thay vì top-5) để không bị tràn khung */}
                                    <span className={`absolute top-4 w-24 text-center text-[9px] font-black uppercase tracking-wider transition-colors ${
                                        isActive ? 'text-[#FDC908] drop-shadow-[0_0_5px_rgba(253,201,8,0.8)]' :
                                            isPassed ? 'text-white drop-shadow-md' :
                                                'text-[#FFF2C3]/70 group-hover:text-[#FFF2C3]'
                                    }`}>
                                        {event.shortDate}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}