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
Config.PATROL_MISS_PENALTY = 15

-- ───────── 소리 (선택) ─────────
-- Creator Store에서 쓸 수 있는 사운드 ID를 넣으면 재생됩니다. 0이면 자막만 나와요.
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
	"4층은 없습니다. 4층 표지판이 보이면 즉시 경비실로.",
	"전화가 오면 받으세요. 단, 당신 이름을 부르면 끊으세요.",
	"운동장에 의자가 있으면 쳐다보지 마세요.",
	"시계탑이 거꾸로 가면 건물에 들어가지 마세요.",
	"복도의 학생에게 말을 걸지 마세요. 학생들은 모두 하교했습니다.",
	"동상이 자리에 없다면, 찾지 마세요.",
}
-- 가끔 수칙 종이에 몰래 나타나는 9번
Config.RULE_NINE = "9. 경비원은 한 명입니다. 경비실에 누가 앉아 있다면, 당신은 누구입니까?"

-- ───────── 인트로 (차 타고 학교로) ─────────
-- 자동차가 지나갈 길 (X, Z). 마지막 점이 주차 위치(IntroCar가 원래 놓인 자리)입니다.
Config.INTRO_PATH = {
	Vector3.new(-520, 0, 233),
	Vector3.new(-260, 0, 233),
	Vector3.new(-70, 0, 233),
	Vector3.new(-22, 0, 230),
	Vector3.new(-2, 0, 216),
	Vector3.new(0, 0, 198),
	Vector3.new(0, 0, 184),
	Vector3.new(12, 0, 178),
	Vector3.new(32, 0, 175),
	Vector3.new(40.5, 0, 169),
	Vector3.new(40.5, 0, 162),
}
Config.INTRO_SECONDS = 26
Config.INTRO_LINES = {
	{ 1.0, "11월 13일 금요일, 밤 9시 50분." },
	{ 5.0, "공유: 야간 경비 알바, 시급 3만 원… 이 정도면 꿀알바지." },
	{ 10.5, "공유: 송천고등학교. 여기구나." },
	{ 15.0, "철컥— 정문이 혼자 열렸다." },
	{ 21.0, "공유: …주차하고, 경비실부터 가 보자." },
}
Config.AFTER_INTRO_LINES = {
	{ 0.0, "끼이이익… 쾅." },
	{ 2.2, "공유: …방금 문, 누가 닫았지?" },
	{ 5.0, "책상 위에 '근무 수칙'이 붙어 있다. 꼭 읽어 보자." },
}

return Config
