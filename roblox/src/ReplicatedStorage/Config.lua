-- 싸이 뛰어! 나폴리탄 괴담: 송천고 야간 경비 — 설정
-- 숫자만 바꾸면 되는 것들을 모아 둔 곳

local Config = {}

-- ───────── 공유 스킨 (무료) ─────────
-- roblox/clothes/guard_shirt.png, guard_pants.png 를 Studio에서 업로드(무료)한 뒤
-- 나온 "이미지 ID" 숫자를 넣으세요. 0이면 옷 대신 몸 색깔로 남색 유니폼을 흉내 냅니다.
Config.SHIRT_IMAGE_ID = 0
Config.PANTS_IMAGE_ID = 0
-- (선택) 마켓의 무료 머리·얼굴 아이템 ID. 0이면 플레이어 원래 머리 대신 기본 짧은 머리 모양 파츠를 씌움
Config.HAIR_ACCESSORY_ID = 0
Config.FACE_ID = 0
Config.SKIN_COLOR = Color3.fromRGB(234, 196, 160)
Config.HERO_NAME = "공유"
-- 플레이어는 공유가 아니다: 공유가 당근에서 구한 대타 경비원 5명. 로비·차 안에선 자기 옷, 경비실에 도착하면 남색 경비복으로 갈아입는다(이름표는 각자 자기 이름).
-- false 로 바꾸면 각자 자기 아바타 그대로 들어온다
Config.GUARD_OUTFIT = true

-- ───────── 움직임 (1인칭) ─────────
Config.WALK_SPEED = 9
Config.SPRINT_SPEED = 15
Config.STAMINA_SECONDS = 6
Config.FIELD_OF_VIEW = 72

-- ───────── 시간 ─────────
Config.SECONDS_PER_GAME_HOUR = 75 -- 22:00~06:00 = 8시간 = 10분
Config.SHIFT_START_HOUR = 22
Config.SHIFT_HOURS = 8

-- ───────── 이상현상 ─────────
Config.ANOMALY_MIN_GAP = 22
Config.ANOMALY_MAX_GAP = 40
Config.MAX_ACTIVE_ANOMALIES = 2
Config.FIRST_ANOMALY_DELAY = 20

-- ───────── 정신력 ─────────
Config.START_SANITY = 100
Config.PATROL_MISS_PENALTY = 10
-- 정신력이 깎일 때 이만큼만 깎인다 (0.6 = 원래의 60%). 낮출수록 오래 버틴다
Config.SANITY_DAMAGE_SCALE = 0.6
-- 순찰을 다 돌면 정신력 회복
Config.PATROL_DONE_BONUS = 6

-- ───────── 소리 (선택) ─────────
-- Creator Store에서 쓸 수 있는 사운드 ID를 넣으면 재생됩니다. 0이면 자막만 나와요.
-- ───────── 손글씨 그림 글자 (분필·피·수첩) ─────────
-- roblox/text_atlas/atlas_1.png ~ atlas_4.png 를 Studio → Asset Manager → Images → Import 로 올리고,
-- 각 그림의 이미지 ID 를 순서대로 넣는다. 0 이면 손글씨 대신 기본 글꼴로 보인다.
Config.TEXT_ATLAS_IDS = { 0, 0, 0, 0, 0, 0, 0 }
-- 이미 올려 둔 데칼 ID (aied0 계정). 게임이 시작할 때 서버가 InsertService 로 열어 진짜 이미지 ID 를 찾는다.
-- 위 TEXT_ATLAS_IDS 에 이미지 ID 를 직접 넣으면 그쪽이 먼저 쓰인다.
-- 1~4: 손글씨(분필·피·수첩), 5~7: 동네 간판 글씨 (가게마다 다른 한글 글꼴)
Config.TEXT_ATLAS_DECAL_IDS = { 75904825982096, 116811792359111, 116869249478191, 77362890761808, 109478106162967, 99908418300107, 104821182031812 }
-- 벽·바닥·천장 실사 텍스처 (tools/make_textures.js 로 만들어 aied0 계정에 데칼로 올림). 0 이면 기본 재질 그대로
-- 나뭇잎 뭉치 그림 (tools/make_leaves.js, 투명 배경). 나무의 LeafG/LeafZ/LeafP 판에 붙는다
-- 나무껍질 그림 (메시 팩 나무 줄기에 입힘)
Config.BARK_DECALS = { bark = 134397603485015, pinebark = 95573024406047 }
Config.LEAF_DECALS = { LeafG = 74745740424068, LeafZ = 82472763357930, LeafP = 94881683993132 }
Config.SURFACE_TEXTURE_DECALS = {
	paint = 129088089710208, -- 칠한 콘크리트 벽
	lower = 124372305476660, -- 회색 아랫벽
	brick = 95197686120475, -- 붉은 벽돌
	floor = 129399345107290, -- 복도 인조석 바닥
	wood = 132809575128768, -- 교실 마루
	ceiling = 114844697474167, -- 천장 텍스
	concrete = 138719808625405, -- 바깥 콘크리트
}

-- ───────── 메시 팩 (나무·여학생·책걸상·출근 차량 SUV) ─────────
-- assets/SongcheonAssets.glb 를 올려 둔 모델 ID (aied0 계정). 게임이 시작할 때 서버가 불러온다.
-- Studio 에서 직접 Import 3D 로 가져와 둔 SongcheonAssets 가 있으면 그쪽을 먼저 쓴다.
-- 고품질 공유 몸의 텍스처 (tools/assets/gongyoo_hq.js 가 구운 그림 → 데칼로 올림)
Config.MESH_TEXTURE_DECALS = {
	gh_head_cap = 91458336028174,
	gh_head_eyes = 102945202487575,
	gh_head_face = 84896168763291,
	gh_head_hair = 135069122105224,
	gh_leftfoot_shoe = 122429209385536,
	gh_lefthand_skin = 138938561450724,
	gh_leftlowerarm_skin = 139149288480907,
	gh_leftlowerleg_pants = 133135357268159,
	gh_leftupperarm_skin = 127932520665118,
	gh_leftupperarm_sleeve = 88810730351392,
	gh_leftupperleg_pants = 125718103929228,
	gh_lowertorso_belt = 75350726331780,
	gh_lowertorso_pants = 133726497303302,
	gh_rightfoot_shoe = 126242877010420,
	gh_righthand_skin = 130625957705595,
	gh_rightlowerarm_skin = 135823607028644,
	gh_rightlowerleg_pants = 93506349595044,
	gh_rightupperarm_skin = 99342451285915,
	gh_rightupperarm_sleeve = 112488820085522,
	gh_rightupperleg_pants = 99347561704269,
	gh_uppertorso_neck = 80152779144903,
	gh_uppertorso_shirt = 73738108588896,
}
Config.MESH_PACK_ID = 124452211900927

Config.SOUNDS = {
	Ambience = 0, -- 밤 학교 배경음 (반복)
	PhoneRing = 0, -- 전화벨
	Knock = 0, -- 철문 두드리는 소리
	Bell = 0, -- 학교 종소리
	Whisper = 0, -- 속삭임
	Static = 0, -- 방송 잡음
	GateClose = 0, -- 철문 닫히는 소리
	Car = 0, -- 자동차 엔진
	Chalk = 0, -- 분필 긁는 소리
	DoorSlide = 0, -- 교실 미닫이문 드르륵
	Switch = 0, -- 전등 스위치 딸깍
	-- 전화 목소리 (직접 녹음하거나 만든 음성 파일을 올려서 ID를 넣으면 수화기에서 들린다. 0이면 자막만)
	PhoneVoiceVice1 = 0, -- 교감: "아, 공유 씨? 첫날이라 걱정돼서요. 순찰 잘 부탁해요."
	PhoneVoiceVice2 = 0, -- 교감: "혹시 4층에 불이 켜져 있어도 올라가지 마세요. 우리 학교는 3층까지예요."
	PhoneVoiceStranger = 0, -- ???: "공유 씨… 공유 씨 거기 있죠? 문 좀 열어 줘요. 추워요."
	PhoneBreath = 0, -- 수화기 너머 숨소리 (말 없는 몇 초)
}

-- ───────── 근무 수칙 (경비실 벽 종이와 같은 내용) ─────────
Config.RULES = {
	"근무는 22:00 ~ 06:00. 06시 전엔 절대 정문을 열지 마세요.",
	"매시 정각 전, 1층·2층·3층 순찰함에 체크하세요.",
	"전화가 오면 받으세요. 단, 당신 이름을 부르면 끊으세요.",
	"4층은 없습니다.",
	"운동장에 의자가 있으면 쳐다보지 마세요.",
	"시계탑이 거꾸로 가면 건물에 들어가지 마세요.",
	"복도의 학생에게 말을 걸지 마세요. 학생들은 모두 하교했습니다.",
	"동상이 자리에 없다면, 찾지 마세요.",
}
-- 가끔 수칙 종이에 몰래 나타나는 9번
Config.RULE_NINE = "9. 경비원은 한 명입니다. 경비실에 누가 앉아 있다면, 당신은 누구입니까?"

-- ───────── 로비 · 출근 차량 (SUV 타고 학교로) ─────────
-- 처음 들어오면 편의점 앞(로비)에서 시작. 검은 SUV 옆에서 '탑승' 하면, 첫 사람이 탄 뒤 10초 있다가 출발한다.
-- 한 서버 최대 5명 = SUV 좌석 5개. (최대 인원은 Studio → Game Settings → Places → Server Size 를 5 로 맞춰야 진짜로 5명까지만 들어온다)
Config.MAX_PLAYERS = 5
Config.DEPART_DELAY = 10 -- 첫 탑승 후 출발까지 (초)
Config.LATE_ARRIVAL_SECONDS = 6 -- 차가 이미 떠난 뒤 들어온 사람은 이만큼 뒤에 경비실로 (택시 타고 늦게 온 셈)
-- 자동차가 지나갈 길 (X, Z). 첫 점 = 로비에 서 있는 자리, 마지막 점 = 학교 주차 자리
Config.INTRO_PATH = {
	Vector3.new(-226, 0, 136),
	Vector3.new(-170, 0, 135),
	Vector3.new(-70, 0, 133),
	Vector3.new(-22, 0, 130),
	Vector3.new(-2, 0, 116),
	Vector3.new(0, 0, 98),
	Vector3.new(0, 0, 84),
	Vector3.new(12, 0, 78),
	Vector3.new(32, 0, 75),
	Vector3.new(40.5, 0, 69),
	Vector3.new(40.5, 0, 62),
}
Config.INTRO_SECONDS = 26
Config.INTRO_LINES = {
	{ 0.5, "11월 13일 금요일, 밤 9시 50분." },
	{ 4.5, "글 올린 '공유'라는 사람은 안 나왔다. 전화도 안 받는다." },
	{ 8.5, "하룻밤에 시급 3만 원… 이 정도면 꿀알바지." },
	{ 12.0, "송천고등학교. …생각보다 많이 낡았다." },
	{ 15.0, "철컥— 정문이 혼자 열렸다." },
	{ 20.5, "주차장에 은색 차가 한 대 서 있다. 57누 2010… 공유 차다." },
}
Config.AFTER_INTRO_LINES = {
	{ 0.0, "끼이이익… 쾅." },
	{ 2.2, "…방금 문, 누가 닫았지?" },
	{ 4.8, "경비실 옷걸이에 경비복이 걸려 있다. 갈아입었다." },
	{ 8.6, "책상 위 쪽지: \"죄송해요. 저는 도저히 못 하겠어요. 수칙… 꼭 지키세요. — 공유\"" },
	{ 14.0, "쪽지 옆에 '근무 수칙'이 붙어 있다. 꼭 읽어 보자. [R]" },
}

-- ───────── 처음 들어올 때 나오는 오프닝 (공유가 직접 나오는 짧은 장면) ─────────
-- 공유가 차에서 내려 경비실로 → 근무 수칙을 읽고 → 놀라고 → 당근에 대타 5명 글을 올리고 → 정문 밖으로 도망친다
-- 오프닝의 공유 (사용자 설정화 기준): 가운데 가르마 갈색 머리, 얇은 사각 안경, 호박색 눈, 무표정,
-- 플레이어와 같은 경비원 차림(남색 근무복·경비 모자·이름표 '공유'). 얼굴 = textures/gongyoo_face.png (aied0 계정 데칼). 0 이면 기본 얼굴
-- 공유 키 163cm (1 m = 3.1 스터드). 플레이어 기본 캐릭터보다 조금 작다
Config.HERO_HEIGHT_STUDS = 1.63 * 3.1
Config.ACTOR_FACE_DECAL = 135799406385689
Config.OPENING_TEXT = {
	arrive = "[싸이 경비용역] 공유 씨, 오늘 밤부터 송천고등학교 야간 경비입니다.",
	arrive2 = "송천고는 작년에 새로 지은 최신식 학교… 라고 들었는데.",
	read = "경비실 책상 위에 '근무 수칙' 수첩이 펼쳐져 있다.",
	rule = "4. 4층은 없습니다.",
	shock = "공유: …뭐야, 이거.",
	post = "[당근 알바] 학교 야간 경비 대타 5명 구해요. 오늘 밤 10시, 시급 3만 원. 송천고 앞 편의점.",
	sorry = "공유: …죄송합니다.",
	run = "그리고 공유는, 차도 버려 둔 채 도망쳤다.",
	slam = "쾅.",
	finish = "지원자 5명. 오늘 밤 10시, 송천고 앞 편의점.",
}

return Config
