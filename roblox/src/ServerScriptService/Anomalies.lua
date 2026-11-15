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

-- 얼굴을 긴 머리로 가린 여학생 (교복). baseCF = 발밑, LookVector = 바라보는 쪽
-- SongcheonAssets(메시)를 가져왔으면 사람처럼 매끈한 메시 모델을 쓰고, 없으면 파트로 만든다.
local function cylinderBetween(parent, name, a, b, d, color, mat)
	local dir = b - a
	local p = block(parent, name, Vector3.new(dir.Magnitude, d, d), CFrame.lookAt((a + b) / 2, b) * CFrame.Angles(0, math.rad(90), 0), color, mat)
	p.Shape = Enum.PartType.Cylinder
	return p
end
local function makeGhost(baseCF, name)
	local okLib, AssetLibrary = pcall(require, script.Parent:WaitForChild("AssetLibrary", 2))
	if okLib and AssetLibrary then
		local m = AssetLibrary.CloneTemplate("Ghost")
		if m then
			m.Name = name or "AnomalyStudent"
			m:PivotTo(baseCF)
			for _, p in ipairs(m:GetDescendants()) do
				if p:IsA("BasePart") then
					p.Anchored = true
					p.CanCollide = false
				end
			end
			return m
		end
	end
	local m = Instance.new("Model")
	m.Name = name or "AnomalyStudent"
	local skin = Color3.fromRGB(214, 200, 190)
	local blouse = Color3.fromRGB(226, 226, 220)
	local navy = Color3.fromRGB(26, 30, 44)
	local hair = Color3.fromRGB(8, 7, 7)
	local function at(x, y, z)
		return (baseCF * CFrame.new(x, y, z)).Position
	end
	local root = block(m, "Root", Vector3.new(0.4, 0.2, 0.4), baseCF * CFrame.new(0, 0.1, 0), skin)
	root.Transparency = 1
	-- 다리 (흰 니삭스 + 검은 구두)
	for _, s in ipairs({ -1, 1 }) do
		local x = 0.2 * s
		block(m, "Shoe", Vector3.new(0.34, 0.22, 0.62), baseCF * CFrame.new(x, 0.11, -0.08), Color3.fromRGB(14, 14, 16), Enum.Material.SmoothPlastic)
		cylinderBetween(m, "Sock", at(x, 0.2, 0), at(x, 1.45, 0.02), 0.27, Color3.fromRGB(232, 232, 228), Enum.Material.Fabric)
		cylinderBetween(m, "Knee", at(x, 1.42, 0.02), at(x, 2.6, 0.0), 0.3, skin, Enum.Material.SmoothPlastic)
	end
	-- 주름치마: 판 12장을 원뿔처럼
	for i = 0, 11 do
		local a = i / 12 * math.pi * 2
		local cf = baseCF * CFrame.new(0, 3.05, 0) * CFrame.Angles(0, a, 0) * CFrame.new(0, 0, -0.5) * CFrame.Angles(math.rad(-9), 0, 0)
		block(m, "Skirt", Vector3.new(0.3, 1.05, 0.05), cf, navy, Enum.Material.Fabric)
	end
	-- 몸통: 블라우스 + 조끼
	cylinderBetween(m, "Blouse", at(0, 3.45, 0), at(0, 4.62, 0), 0.86, blouse, Enum.Material.Fabric)
	cylinderBetween(m, "Vest", at(0, 3.5, 0), at(0, 4.35, 0), 0.9, navy, Enum.Material.Fabric)
	block(m, "Ribbon", Vector3.new(0.22, 0.2, 0.06), baseCF * CFrame.new(0, 4.45, -0.46), Color3.fromRGB(120, 16, 22), Enum.Material.Fabric)
	-- 팔 (힘없이 늘어뜨림)
	for _, s in ipairs({ -1, 1 }) do
		local sh = at(0.5 * s, 4.5, 0)
		local el = at(0.62 * s, 3.65, 0.04)
		local wr = at(0.66 * s, 2.85, 0.08)
		local shBall = block(m, "Shoulder", Vector3.new(0.34, 0.34, 0.34), CFrame.new(sh), blouse, Enum.Material.Fabric)
		shBall.Shape = Enum.PartType.Ball
		cylinderBetween(m, "Sleeve", sh, el, 0.26, blouse, Enum.Material.Fabric)
		cylinderBetween(m, "Forearm", el, wr, 0.2, skin, Enum.Material.SmoothPlastic)
		block(m, "Hand", Vector3.new(0.12, 0.42, 0.22), CFrame.new(at(0.67 * s, 2.62, 0.09)), skin, Enum.Material.SmoothPlastic)
	end
	-- 목, 머리 (고개를 숙임)
	cylinderBetween(m, "Neck", at(0, 4.6, 0.02), at(0, 4.92, -0.04), 0.24, skin, Enum.Material.SmoothPlastic)
	local headCF = baseCF * CFrame.new(0, 5.2, -0.06) * CFrame.Angles(math.rad(-16), 0, math.rad(6))
	local head = block(m, "Head", Vector3.new(0.72, 0.72, 0.72), headCF, skin, Enum.Material.SmoothPlastic)
	head.Shape = Enum.PartType.Ball
	local cap = block(m, "HairCap", Vector3.new(0.8, 0.8, 0.8), headCF * CFrame.new(0, 0.06, 0.04), hair, Enum.Material.SmoothPlastic)
	cap.Shape = Enum.PartType.Ball
	-- 긴 생머리: 가닥 60개가 얼굴과 등을 덮음
	local rng = Random.new(13)
	for i = 1, 60 do
		local a = rng:NextNumber(0, math.pi * 2)
		local front = math.cos(a) < 0
		local len = front and rng:NextNumber(1.7, 2.3) or rng:NextNumber(1.9, 2.6)
		local top = headCF * CFrame.new(math.sin(a) * 0.36, 0.16, math.cos(a) * 0.36)
		local cf = CFrame.new(top.Position) * CFrame.Angles(0, -a, 0) * CFrame.Angles(math.rad(rng:NextNumber(-6, 6)) + (front and math.rad(-4) or 0), 0, 0) * CFrame.new(0, -len / 2, front and -0.06 or 0.06)
		block(m, "Hair", Vector3.new(rng:NextNumber(0.08, 0.16), len, 0.035), cf, hair, Enum.Material.SmoothPlastic)
	end
	m.PrimaryPart = root
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
	st.model = makeGhost(CFrame.lookAt(pos, pos + look))
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

-- 9. 칠판에 저절로 써지는 분필 글씨 "뒤를 돌아보지 마" (플레이어와 가까운 교실)
local ServerStorage = game:GetService("ServerStorage")
local function placeProp(name, targetPos)
	local folder = ServerStorage:FindFirstChild("AnomalyProps")
	local tpl = folder and folder:FindFirstChild(name, true)
	if not tpl or not tpl.PrimaryPart then
		return nil
	end
	local m = tpl:Clone()
	m:PivotTo(CFrame.new(targetPos))
	m.Parent = workspace
	return m
end
local function nearestTagged(tag, filter)
	local best, bestD = nil, math.huge
	for _, part in ipairs(tagged(tag)) do
		if not filter or filter(part) then
			local _, d = nearestPlayer(part.Position, 1e6)
			if d and d < bestD then
				best, bestD = part, d
			end
		end
	end
	return best
end
def("Blackboard", 1, 50, function(st)
	local board = nearestTagged("Blackboard", function(b)
		return b.Parent and CollectionService:HasTag(b.Parent, "Classroom")
	end) or pick(tagged("Blackboard"))
	st.board = board
	local m = placeProp("BoardWarning", board.Position + Vector3.new(board.Size.X / 2, 0, 0))
	if not m then
		return
	end
	st.model = m
	local strokes = {}
	for _, c in ipairs(m:GetChildren()) do
		if c:IsA("BasePart") and c.Name ~= "PropAnchor" then
			table.insert(strokes, { c, c.Transparency, c:GetAttribute("Seq") or 0 })
			c.Transparency = 1
		end
	end
	table.sort(strokes, function(x, y)
		return x[3] < y[3]
	end)
	-- 원래 칠판 글씨는 지워진다
	st.chalk = {}
	local chalk = board.Parent:FindFirstChild("Chalk")
	if chalk then
		for _, p in ipairs(chalk:GetDescendants()) do
			if p:IsA("BasePart") then
				st.chalk[p] = p.Transparency
				p.Transparency = 1
			end
		end
	end
	api.sayNear(board.Position, 45, "끼이익… 어디선가 분필 긁히는 소리가 난다.", 3.5)
	api.playSound("Chalk", board)
	task.spawn(function()
		for _, s in ipairs(strokes) do
			if st.stopped then
				return
			end
			s[1].Transparency = s[2]
			task.wait(0.05)
		end
	end)
end, function(st)
	if st.model then
		st.model:Destroy()
	end
	for p, t in pairs(st.chalk or {}) do
		p.Transparency = t
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

-- 13. CCTV 4번 화면 (2층 복도, 카메라 앞에 여학생이 서서 카메라를 올려다본다)
def("CCTV", 0, 35, function(st)
	local cam
	for _, c in ipairs(tagged("CCTVCam")) do
		if c:GetAttribute("Cam") == 4 then
			cam = c
		end
	end
	if not cam then
		return
	end
	-- 카메라 화면(세로 시야 72°) 안에 발끝까지 보이도록 카메라 앞 17 stud 복도에 세운다
	local look = cam.CFrame.LookVector
	local flat = Vector3.new(look.X, 0, look.Z).Unit
	local spot = cam.Position + flat * 17
	local floorY = cam:GetAttribute("FloorY") or (cam.Position.Y - 9)
	local pos = Vector3.new(spot.X, floorY, spot.Z)
	local face = Vector3.new(cam.Position.X, floorY, cam.Position.Z)
	st.model = makeGhost(CFrame.lookAt(pos, face), "CCTVGhost")
	st.model.Parent = workspace
	workspace:SetAttribute("CCTVAlert", 4)
	api.sayNear(first("BoothZone").Position, 40, "CCTV 4번 화면이 지지직거린다.", 3, "red")
	task.spawn(function()
		while not st.stopped do
			local p = nearestPlayer(pos, 10)
			if p then
				api.Effect:FireClient(p, "static")
				Anomalies.Stop("CCTV")
				break
			end
			task.wait(0.2)
		end
	end)
end, function(st)
	workspace:SetAttribute("CCTVAlert", 0)
	if st.model then
		st.model:Destroy()
	end
end)

-- 14. 화장실 세 번째 칸: 노크 소리, 거울에 피로 쓴 "열어줘", 문에 손자국 (플레이어와 가까운 층)
def("Restroom", 1, 45, function(st)
	local mirror = nearestTagged("RestroomMirror") or pick(tagged("RestroomMirror"))
	local door
	for _, d in ipairs(tagged("StallDoor3")) do
		if math.abs(d.Position.Y - mirror.Position.Y) < 6 then
			door = d
		end
	end
	door = door or pick(tagged("StallDoor3"))
	st.door = door
	st.model = placeProp("RestroomBlood", mirror.Position + Vector3.new(mirror.Size.X / 2, 0, 0))
	task.spawn(function()
		local lines = { "똑, 똑.", "…거기 누구 있어요?", "똑, 똑, 똑.", "\"…열어줘.\"" }
		local i = 1
		while not st.stopped do
			api.sayNear(door.Position, 32, "(화장실 세 번째 칸) " .. lines[i], 3.5, i == 4 and "red" or "white")
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
		api.addSanity(player, -25, "…안에는 아무도 없었다. 변기 안이 새빨갛다.")
		Anomalies.Stop("Restroom")
	end)
end, function(st)
	if st.prompt then
		st.prompt:Destroy()
	end
	if st.model then
		st.model:Destroy()
	end
end)

-- 15. 현관 거울에 피로 쓴 "너도 남아"
def("Mirror", 2, 50, function(st)
	local mirror = first("HallMirror")
	if not mirror then
		return
	end
	st.model = placeProp("HallMirrorBlood", mirror.Position + Vector3.new(mirror.Size.X / 2, 0, 0))
	st.told = {}
	task.spawn(function()
		while not st.stopped do
			for _, p in ipairs(api.activePlayers()) do
				local r = api.rootOf(p)
				if r and not st.told[p] and (r.Position - mirror.Position).Magnitude < 24 then
					st.told[p] = true
					api.say(p, "현관 거울에… 피로 쓴 글씨가 있다. 아까는 없었는데.", 4, "red")
				end
			end
			task.wait(0.3)
		end
	end)
end, function(st)
	if st.model then
		st.model:Destroy()
	end
end)

-- 16. 교실 미닫이문이 저절로 열렸다 닫혔다 (드르륵— 탕!)
def("Door", 0, 20, function(st)
	local players = api.activePlayers()
	if #players == 0 or not api.slideDoor then
		return
	end
	local p = pick(players)
	local r = api.rootOf(p)
	local list = r and api.doorsNear(r.Position, 45) or {}
	if #list == 0 then
		return
	end
	local door = pick(list)
	local pos = door:GetPivot().Position
	api.sayNear(pos, 50, "드르륵— 탕! 아무도 없는 교실 문이 저절로 움직였다.", 3.5)
	for _, q in ipairs(api.activePlayers()) do
		local rq = api.rootOf(q)
		if rq and (rq.Position - pos).Magnitude < 30 then
			api.addSanity(q, -3)
		end
	end
	task.spawn(function()
		for _ = 1, 3 do
			if st.stopped then
				break
			end
			api.slideDoor(door, nil, 0.22)
			task.wait(0.8 + math.random() * 1.4)
		end
	end)
end)

-- 17. 아무도 없는 교실에 불이 켜진다 (밖에서도 보인다)
def("ClassLights", 1, 40, function(st)
	local rooms = tagged("Classroom")
	if #rooms == 0 or not api.setRoomLights then
		return
	end
	local room = pick(rooms)
	st.room = room
	st.was = room:GetAttribute("LightsOn") == true
	api.setRoomLights(room, true)
	api.sayAll(string.format("%s학년 %s반 교실에 불이 켜졌다… 아무도 없을 텐데.", room.Name:sub(1, 1), room.Name:sub(3, 3)), 4)
	task.spawn(function()
		task.wait(30)
		for _ = 1, 4 do
			if st.stopped then
				return
			end
			api.setRoomLights(room, false)
			task.wait(0.08 + math.random() * 0.15)
			api.setRoomLights(room, true)
			task.wait(0.1 + math.random() * 0.4)
		end
	end)
end, function(st)
	if st.room then
		api.setRoomLights(st.room, st.was)
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
