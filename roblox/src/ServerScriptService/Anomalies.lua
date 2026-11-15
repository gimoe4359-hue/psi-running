-- 이상현상 모음
-- 근무 중에 무작위로 하나씩(최대 Config.MAX_ACTIVE_ANOMALIES 개 동시) 일어납니다.
-- 근무 수칙과 연결된 이상현상은 수칙을 어기면 정신력이 깎입니다.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local Anomalies = {}
Anomalies.clockBackward = false

local api
local defs = {}
local active = {}
local generation = 0
local lastName = nil

local function tagged(tag)
	return CollectionService:GetTagged(tag)
end
local function first(tag)
	return tagged(tag)[1]
end
local function pick(list)
	return list[math.random(1, #list)]
end

local function def(name, minHour, duration, start, stop)
	table.insert(defs, { name = name, minHour = minHour, duration = duration, start = start, stop = stop or function() end })
end
local function findDef(name)
	for _, d in ipairs(defs) do
		if d.name == name then
			return d
		end
	end
	return nil
end

-- ───────── 파트로 만드는 소품 ─────────
local function block(parent, name, size, cf, color, mat)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	p.Anchored = true
	p.CanCollide = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

-- 얼굴을 긴 머리로 가린 학생. baseCF = 발밑, LookVector = 바라보는 쪽
local function makeStudent(baseCF)
	local m = Instance.new("Model")
	m.Name = "AnomalyStudent"
	local uni = Color3.fromRGB(26, 29, 38)
	local skirt = Color3.fromRGB(58, 26, 30)
	local pale = Color3.fromRGB(190, 184, 176)
	local hair = Color3.fromRGB(6, 6, 6)
	local function at(x, y, z)
		return baseCF * CFrame.new(x, y, z)
	end
	local torso = block(m, "Torso", Vector3.new(2, 2, 1), at(0, 3, 0), uni, Enum.Material.Fabric)
	block(m, "Collar", Vector3.new(0.5, 0.9, 0.05), at(0, 3.5, -0.53), Color3.fromRGB(215, 215, 208))
	block(m, "Skirt", Vector3.new(2.1, 0.9, 1.1), at(0, 1.75, 0), skirt, Enum.Material.Fabric)
	block(m, "LeftLeg", Vector3.new(0.8, 1.4, 0.8), at(-0.5, 0.7, 0), pale)
	block(m, "RightLeg", Vector3.new(0.8, 1.4, 0.8), at(0.5, 0.7, 0), pale)
	block(m, "LeftArm", Vector3.new(1, 2, 1), at(-1.5, 3, 0), uni, Enum.Material.Fabric)
	block(m, "RightArm", Vector3.new(1, 2, 1), at(1.5, 3, 0), uni, Enum.Material.Fabric)
	block(m, "Head", Vector3.new(1.2, 1.2, 1.2), at(0, 4.6, 0), pale)
	block(m, "HairFront", Vector3.new(1.35, 2.6, 0.25), at(0, 4.0, -0.68), hair, Enum.Material.Fabric)
	block(m, "HairTop", Vector3.new(1.35, 0.5, 1.35), at(0, 5.3, 0), hair, Enum.Material.Fabric)
	block(m, "HairBack", Vector3.new(1.35, 2.6, 1.1), at(0, 4.0, 0.15), hair, Enum.Material.Fabric)
	m.PrimaryPart = torso
	return m
end

local function makeChair(baseCF)
	local m = Instance.new("Model")
	m.Name = "AnomalyChair"
	local wood = Color3.fromRGB(196, 160, 112)
	local metal = Color3.fromRGB(138, 142, 148)
	local function at(x, y, z)
		return baseCF * CFrame.new(x, y, z)
	end
	local seat = block(m, "Seat", Vector3.new(1.6, 0.15, 1.7), at(0, 1.62, 0), wood, Enum.Material.Wood)
	block(m, "Back", Vector3.new(1.6, 1.4, 0.15), at(0, 2.6, 0.8), wood, Enum.Material.Wood)
	for _, xz in ipairs({ { -0.7, -0.75 }, { 0.7, -0.75 }, { -0.7, 0.75 }, { 0.7, 0.75 } }) do
		block(m, "Leg", Vector3.new(0.12, 1.6, 0.12), at(xz[1], 0.8, xz[2]), metal, Enum.Material.Metal)
	end
	m.PrimaryPart = seat
	return m
end

local function labelOf(part)
	local gui = part and part:FindFirstChild("Text")
	return gui and gui:FindFirstChild("Label")
end

local function nearestPlayer(pos, maxDist)
	local best, bestD = nil, maxDist
	for _, p in ipairs(api.activePlayers()) do
		local r = api.rootOf(p)
		if r then
			local d = (r.Position - pos).Magnitude
			if d < bestD then
				best, bestD = p, d
			end
		end
	end
	return best, bestD
end

-- ═════════════════════════ 이상현상 정의 ═════════════════════════

-- 1. 복도 조명이 미친 듯이 깜빡인다
def("Flicker", 0, 14, function(st)
	st.saved = {}
	for _, part in ipairs(tagged("CorridorLight")) do
		local light = part:FindFirstChildWhichIsA("Light")
		st.saved[part] = { part.Material, light and light.Enabled }
	end
	local zone = first("BuildingZone")
	for _, p in ipairs(api.activePlayers()) do
		if zone and api.inside(zone, api.rootOf(p).Position) then
			api.say(p, "복도 불빛이 미친 듯이 깜빡인다.", 3)
		end
	end
	task.spawn(function()
		while not st.stopped do
			for part in pairs(st.saved) do
				local on = math.random() < 0.45
				part.Material = on and Enum.Material.Neon or Enum.Material.SmoothPlastic
				local light = part:FindFirstChildWhichIsA("Light")
				if light then
					light.Enabled = on
					light.Brightness = on and 0.9 or 0
				end
			end
			task.wait(math.random(5, 18) / 100)
		end
	end)
end, function(st)
	for part, s in pairs(st.saved) do
		part.Material = s[1]
		local light = part:FindFirstChildWhichIsA("Light")
		if light then
			light.Enabled = s[2] and true or false
			light.Brightness = s[2] and 0.7 or 0
		end
	end
end)

-- 2. 경비실 전화 (수칙 4)
def("Phone", 0, 30, function(st)
	local base = first("Phone")
	local booth = first("BoothZone")
	st.base = base
	st.color = base.Color
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "전화 받기"
	prompt.ObjectText = "경비실 전화"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 8
	prompt.RequiresLineOfSight = false
	prompt.Parent = base
	st.prompt = prompt
	task.spawn(function()
		local blink = false
		while not st.stopped and not st.answered do
			api.sayNear(booth.Position, 140, "따르릉— 따르릉— 경비실 전화가 울린다.", 2.6, "yellow")
			api.playSound("PhoneRing", base)
			for _ = 1, 8 do
				if st.stopped or st.answered then
					break
				end
				blink = not blink
				base.Color = blink and Color3.fromRGB(255, 80, 80) or st.color
				task.wait(0.5)
			end
		end
		base.Color = st.color
	end)
	prompt.Triggered:Connect(function(player)
		if st.stopped then
			return
		end
		if st.answered then
			if st.waitingHangup and player == st.answerer then
				st.hungUp = true
				prompt.Enabled = false
			end
			return
		end
		st.answered = true
		st.answerer = player
		prompt.Enabled = false
		if math.random() < 0.45 then
			api.say(player, "교감: 아, " .. Config.HERO_NAME .. " 씨? 첫날이라 걱정돼서요. 순찰 잘 부탁해요.", 4)
			task.delay(4.2, function()
				api.say(player, "교감: …혹시 4층에 불이 켜져 있어도 올라가지 마세요. 우리 학교는 3층까지예요.", 5)
			end)
			task.delay(9.5, function()
				Anomalies.Stop("Phone")
			end)
		else
			api.say(player, "…………", 2)
			task.delay(2.2, function()
				if st.stopped then
					return
				end
				api.say(player, "???: " .. Config.HERO_NAME .. " 씨… " .. Config.HERO_NAME .. " 씨 거기 있죠? 문 좀 열어 줘요. 추워요.", 5, "red")
				st.waitingHangup = true
				prompt.ActionText = "전화 끊기"
				prompt.Enabled = true
				task.delay(6, function()
					if st.stopped then
						return
					end
					if st.hungUp then
						api.addSanity(player, 5, "뚝. 전화를 끊었다. 수칙대로 했다.")
					else
						api.addSanity(player, -30, "수화기 너머에서 웃음소리가 들린다. \"…찾았다.\"")
						api.Effect:FireClient(player, "static")
					end
					Anomalies.Stop("Phone")
				end)
			end)
		end
	end)
end, function(st)
	if st.prompt then
		st.prompt:Destroy()
	end
	if st.base then
		st.base.Color = st.color
	end
	if not st.answered then
		for _, p in ipairs(api.activePlayers()) do
			api.addSanity(p, -8, "아무도 전화를 받지 않았다. 벨소리가 뚝 끊겼다.")
		end
	end
end)

-- 3. 운동장 한가운데 의자 (수칙 5)
def("Chair", 1, 50, function(st)
	local spot = first("ChairSpot")
	local booth = first("BoothZone")
	local pos = Vector3.new(spot.Position.X, spot.Position.Y - 0.05, spot.Position.Z)
	local face = Vector3.new(booth.Position.X, pos.Y, booth.Position.Z)
	st.model = makeChair(CFrame.lookAt(pos, face))
	st.model.Parent = workspace
	st.warned = {}
end, function(st)
	if st.model then
		st.model:Destroy()
	end
end)
function Anomalies.OnChairGaze(player)
	local st = active.Chair
	if not st then
		return
	end
	if not st.warned[player] then
		st.warned[player] = true
		api.addSanity(player, -5, "운동장의 의자를 봐 버렸다. …저 의자, 아까는 없었는데.")
	else
		api.addSanity(player, -5)
	end
end

-- 4. 시계탑이 거꾸로 (수칙 6)
def("ClockBackward", 1, 40, function(st)
	Anomalies.clockBackward = true
	st.warned = {}
	api.sayAll("끼릭… 끼릭… 어디선가 태엽 감기는 소리가 난다.", 4)
	local zone = first("BuildingZone")
	task.spawn(function()
		while not st.stopped do
			for _, p in ipairs(api.activePlayers()) do
				local r = api.rootOf(p)
				if r and zone and api.inside(zone, r.Position) then
					if not st.warned[p] then
						st.warned[p] = true
						api.addSanity(p, -5, "시계탑이 거꾸로 돌고 있다! 건물 밖으로 나가야 해!")
					else
						api.addSanity(p, -3)
					end
				end
			end
			task.wait(1)
		end
	end)
end, function()
	Anomalies.clockBackward = false
end)

-- 5. 복도 끝의 학생 (수칙 7)
def("Student", 0, 45, function(st)
	local spot = pick(tagged("FigureSpot"))
	local pos = Vector3.new(spot.Position.X, spot.Position.Y - 0.05, spot.Position.Z)
	local look = Vector3.new(pos.X > 0 and -1 or 1, 0, 0)
	st.model = makeStudent(CFrame.lookAt(pos, pos + look))
	st.model.Parent = workspace
	api.playSound("Whisper", st.model.PrimaryPart)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "말 걸기"
	prompt.ObjectText = "학생"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 16
	prompt.RequiresLineOfSight = false
	prompt.Parent = st.model.PrimaryPart
	prompt.Triggered:Connect(function(player)
		if st.stopped then
			return
		end
		api.Effect:FireClient(player, "jumpscare")
		api.addSanity(player, -35, "학생: …선생님. 저 아직 집에 못 갔어요.")
		Anomalies.Stop("Student")
	end)
	task.spawn(function()
		while not st.stopped do
			local p, d = nearestPlayer(pos, 9)
			if p then
				api.Effect:FireClient(p, "static")
				api.say(p, "…방금 거기 누가 서 있지 않았나?", 3)
				Anomalies.Stop("Student")
				break
			end
			task.wait(0.2)
		end
	end)
end, function(st)
	if st.model then
		st.model:Destroy()
	end
end)

-- 6. 있을 리 없는 4층 (수칙 3)
def("FourthFloor", 2, 50, function(st)
	local sign
	for _, s in ipairs(tagged("StairSign")) do
		if s:GetAttribute("Floor") == 3 then
			sign = s
		end
	end
	st.sign = sign
	local label = labelOf(sign)
	if label then
		st.text, st.color = label.Text, label.TextColor3
		label.Text = "4F ↑"
		label.TextColor3 = Color3.fromRGB(200, 0, 0)
	end
	st.light = Instance.new("PointLight")
	st.light.Color = Color3.fromRGB(255, 30, 30)
	st.light.Range = 18
	st.light.Brightness = 2
	st.light.Parent = sign
	api.sayNear(sign.Position, 70, "계단 위쪽에서 붉은 불빛이 새어 나온다.", 3, "red")
	local zone = first("RoofStairZone")
	st.hit = {}
	task.spawn(function()
		while not st.stopped do
			for _, p in ipairs(api.activePlayers()) do
				local r = api.rootOf(p)
				if r and zone and not st.hit[p] and api.inside(zone, r.Position) then
					st.hit[p] = true
					api.Effect:FireClient(p, "jumpscare")
					api.addSanity(p, -40, "4층에서… 무언가가 내려다보고 있었다.")
					api.teleportToBooth(p)
				end
			end
			task.wait(0.2)
		end
	end)
end, function(st)
	local label = labelOf(st.sign)
	if label and st.text then
		label.Text = st.text
		label.TextColor3 = st.color
	end
	if st.light then
		st.light:Destroy()
	end
end)

-- 7. 사라진 소녀상 (수칙 8)
def("Statue", 2, 60, function(st)
	local fig = first("StatueFigure")
	local pedestal = first("StatuePedestal")
	st.fig = fig
	st.orig = fig:GetPivot()
	local spot = pick(tagged("FigureSpot"))
	local pos = Vector3.new(spot.Position.X, spot.Position.Y + 0.7, spot.Position.Z)
	local dir = Vector3.new(pos.X > 0 and -1 or 1, 0, 0)
	fig:PivotTo(CFrame.lookAt(pos, pos - dir))
	st.hinted = {}
	task.spawn(function()
		while not st.stopped do
			for _, p in ipairs(api.activePlayers()) do
				local r = api.rootOf(p)
				if r and pedestal and not st.hinted[p] and (r.Position - pedestal.Position).Magnitude < 28 then
					st.hinted[p] = true
					api.say(p, "…책 읽는 소녀상이 받침대 위에 없다.", 3.5)
				end
			end
			local p = nearestPlayer(pos, 9)
			if p then
				api.Effect:FireClient(p, "jumpscare")
				api.addSanity(p, -30, "소녀상: 이 책, 다 읽었어. …다음은 너야.")
				Anomalies.Stop("Statue")
				break
			end
			task.wait(0.2)
		end
	end)
end, function(st)
	if st.fig and st.orig then
		st.fig:PivotTo(st.orig)
	end
end)

-- 8. 교내 방송
def("Broadcast", 0, 14, function(st)
	local onair = first("OnAirSign")
	local label = labelOf(onair)
	if label then
		st.labelColor = label.TextColor3
		label.TextColor3 = Color3.fromRGB(255, 40, 40)
	end
	st.onair = onair
	st.saved = {}
	for _, part in ipairs(tagged("CorridorLight")) do
		local light = part:FindFirstChildWhichIsA("Light")
		st.saved[part] = { part.Material, light and light.Enabled }
		part.Material = Enum.Material.SmoothPlastic
		if light then
			light.Enabled = false
		end
	end
	api.playSound("Static", onair)
	for _, p in ipairs(api.activePlayers()) do
		api.Effect:FireClient(p, "static")
	end
	api.sayAll("[교내 방송] 지지직… 아직 학교에 남아 있는 " .. Config.HERO_NAME .. " 학생은…", 4.5, "static")
	task.delay(4.6, function()
		if not st.stopped then
			api.sayAll("[교내 방송] …3학년 4반 교실로… 와 주세요… 다들 기다리고 있어요…", 5, "static")
		end
	end)
end, function(st)
	local label = labelOf(st.onair)
	if label and st.labelColor then
		label.TextColor3 = st.labelColor
	end
	for part, s in pairs(st.saved or {}) do
		part.Material = s[1]
		local light = part:FindFirstChildWhichIsA("Light")
		if light then
			light.Enabled = s[2] and true or false
		end
	end
end)

-- 9. 칠판 글씨
def("Blackboard", 1, 45, function(st)
	st.saved = {}
	local line = pick({ "뒤를 보지 마", "아직 안 갔어", Config.HERO_NAME .. " 선생님 안녕하세요", "4층으로 와", "다 같이 기다리는 중" })
	for _, b in ipairs(tagged("Blackboard")) do
		local label = labelOf(b)
		if label then
			st.saved[label] = { label.Text, label.TextColor3 }
			label.Text = line
			label.TextColor3 = Color3.fromRGB(255, 225, 225)
		end
	end
end, function(st)
	for label, s in pairs(st.saved) do
		label.Text = s[1]
		label.TextColor3 = s[2]
	end
end)

-- 10. 교실 책상이 전부 뒤로 돌아 있다
def("Desks", 0, 70, function(st)
	local rooms = tagged("Classroom")
	local room = pick(rooms)
	st.saved = {}
	for _, m in ipairs(room:GetChildren()) do
		if m:IsA("Model") and CollectionService:HasTag(m, "DeskSet") then
			local cf = m:GetBoundingBox()
			local turn = cf * CFrame.Angles(0, math.rad(180), 0) * cf:Inverse()
			for _, part in ipairs(m:GetDescendants()) do
				if part:IsA("BasePart") then
					st.saved[part] = part.CFrame
					part.CFrame = turn * part.CFrame
				end
			end
		end
	end
	api.sayAll("어딘가에서 의자 끄는 소리가 한꺼번에 들렸다. 드르륵—", 3.5)
end, function(st)
	for part, cf in pairs(st.saved) do
		part.CFrame = cf
	end
end)

-- 11. 미술실 석고상이 고개를 돌린다
def("Bust", 3, 60, function(st)
	local bust = first("PlasterBust")
	st.bust = bust
	st.orig = bust:GetPivot()
	st.told = {}
	task.spawn(function()
		while not st.stopped do
			local p, d = nearestPlayer(st.orig.Position, 70)
			if p then
				local r = api.rootOf(p)
				local target = Vector3.new(r.Position.X, st.orig.Position.Y, r.Position.Z)
				bust:PivotTo(CFrame.lookAt(st.orig.Position, target) * CFrame.Angles(0, math.rad(90), 0))
				if d < 30 and not st.told[p] then
					st.told[p] = true
					api.say(p, "석고상이… 이쪽을 보고 있다?", 3)
				end
			end
			task.wait(0.1)
		end
	end)
end, function(st)
	if st.bust and st.orig then
		st.bust:PivotTo(st.orig)
	end
end)

-- 12. 정문을 두드리는 소리 (수칙 1과 연결)
def("Knock", 3, 30, function(st)
	local lock = first("GateLock")
	local lines = {
		"쾅! 쾅! 쾅! 누군가 정문 철문을 두드린다.",
		"학생 목소리: 경비 아저씨! 문 좀 열어 주세요! 집에 가야 돼요!",
		"학생 목소리: 아저씨, 거기 있는 거 다 알아요.",
		"…철문 틈으로 하얀 손가락이 꼼지락거린다.",
	}
	task.spawn(function()
		local i = 1
		while not st.stopped do
			api.sayNear(lock.Position, 170, lines[i], 4, i == 4 and "red" or "white")
			api.playSound("Knock", lock)
			for _, p in ipairs(api.activePlayers()) do
				local r = api.rootOf(p)
				if r and (r.Position - lock.Position).Magnitude < 60 then
					api.Effect:FireClient(p, "shake")
				end
			end
			i = i % #lines + 1
			task.wait(6)
		end
	end)
end)

-- 13. CCTV 화면
def("CCTV", 0, 25, function(st)
	st.saved = {}
	local screens = tagged("CCTVScreen")
	for _, s in ipairs(screens) do
		st.saved[s] = s.Color
	end
	api.sayNear(first("BoothZone").Position, 40, "CCTV 화면이 하나씩 빨갛게 변한다.", 3, "red")
	task.spawn(function()
		for _, s in ipairs(screens) do
			if st.stopped then
				return
			end
			s.Color = Color3.fromRGB(150, 20, 20)
			task.wait(0.8)
		end
		for _, s in ipairs(screens) do
			if s:GetAttribute("Cam") == 4 then
				s.Color = Color3.fromRGB(230, 230, 230)
			end
		end
		api.sayNear(first("BoothZone").Position, 40, "4번 화면에… 누군가 카메라를 올려다보며 서 있다.", 4, "red")
	end)
end, function(st)
	for s, c in pairs(st.saved) do
		s.Color = c
	end
end)

-- 14. 화장실 세 번째 칸 노크
def("Restroom", 1, 35, function(st)
	local doors = tagged("StallDoor3")
	local door = pick(doors)
	st.door = door
	st.color = door.Color
	local label = labelOf(door)
	st.label = label
	st.text = label and label.Text
	if label then
		label.Text = "똑 똑"
	end
	task.spawn(function()
		local lines = { "똑, 똑.", "…거기 누구 있어요?", "똑, 똑, 똑.", "\"휴지 좀 주실래요?\"" }
		local i = 1
		while not st.stopped do
			api.sayNear(door.Position, 30, "(화장실 세 번째 칸) " .. lines[i], 3.5, i == 4 and "red" or "white")
			api.playSound("Knock", door)
			i = i % #lines + 1
			task.wait(5)
		end
	end)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "문 열기"
	prompt.ObjectText = "세 번째 칸"
	prompt.HoldDuration = 0.8
	prompt.MaxActivationDistance = 7
	prompt.RequiresLineOfSight = false
	prompt.Parent = door
	st.prompt = prompt
	prompt.Triggered:Connect(function(player)
		if st.stopped then
			return
		end
		api.Effect:FireClient(player, "jumpscare")
		api.addSanity(player, -25, "…안에는 아무도 없었다. 바닥이 젖어 있다.")
		Anomalies.Stop("Restroom")
	end)
end, function(st)
	if st.prompt then
		st.prompt:Destroy()
	end
	if st.label and st.text then
		st.label.Text = st.text
	end
end)

-- ═════════════════════════ 관리 ═════════════════════════
function Anomalies.Trigger(name)
	local d = findDef(name)
	if not d or active[name] then
		return
	end
	local st = {}
	active[name] = st
	lastName = name
	local ok, err = pcall(d.start, st)
	if not ok then
		warn("[Anomaly] " .. name .. " 시작 실패: " .. tostring(err))
		active[name] = nil
		st.stopped = true
		return
	end
	task.delay(d.duration, function()
		if active[name] == st then
			Anomalies.Stop(name)
		end
	end)
end

function Anomalies.Stop(name)
	local st = active[name]
	if not st then
		return
	end
	active[name] = nil
	st.stopped = true
	local d = findDef(name)
	local ok, err = pcall(d.stop, st)
	if not ok then
		warn("[Anomaly] " .. name .. " 정리 실패: " .. tostring(err))
	end
end

function Anomalies.StopAll()
	generation = generation + 1
	local names = {}
	for name in pairs(active) do
		table.insert(names, name)
	end
	for _, name in ipairs(names) do
		Anomalies.Stop(name)
	end
end

function Anomalies.Start(a)
	api = a
	generation = generation + 1
	local myGen = generation
	task.spawn(function()
		task.wait(Config.FIRST_ANOMALY_DELAY)
		while myGen == generation do
			local count = 0
			for _ in pairs(active) do
				count = count + 1
			end
			if count < Config.MAX_ACTIVE_ANOMALIES and #api.activePlayers() > 0 then
				local pool = {}
				for _, d in ipairs(defs) do
					if not active[d.name] and d.name ~= lastName and api.hour() >= d.minHour then
						table.insert(pool, d)
					end
				end
				if #pool > 0 then
					Anomalies.Trigger(pick(pool).name)
				end
			end
			task.wait(math.random(Config.ANOMALY_MIN_GAP, Config.ANOMALY_MAX_GAP))
		end
	end)
end

Anomalies.Active = active
return Anomalies
