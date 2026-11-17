-- 싸이 뛰어! 나폴리탄 괴담: 송천고 야간 경비 — 서버 메인
-- 맵을 짓고, 근무 시간(22:00~06:00)·순찰·정신력·엔딩을 관리합니다.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local ServerScriptService = game:GetService("ServerScriptService")

local Config = require(ReplicatedStorage:WaitForChild("Config"))

-- 맵을 다 지을 때까지 캐릭터를 만들지 않음 (허공으로 떨어지지 않게)
Players.CharacterAutoLoads = false

-- ───────── 리모트 ─────────
local remotes = Instance.new("Folder")
remotes.Name = "NightShiftRemotes"
local function remote(name)
	local r = Instance.new("RemoteEvent")
	r.Name = name
	r.Parent = remotes
	return r
end
local Subtitle = remote("Subtitle") -- (글, 초, 색이름)
local IntroFinished = remote("IntroFinished")
local ChairGaze = remote("ChairGaze")
local Effect = remote("Effect") -- (종류)
local Ending = remote("Ending") -- (종류)
remotes.Parent = ReplicatedStorage

-- ───────── 맵 ─────────
-- 손글씨 그림 ID 를 먼저 찾아 둔다 (올려 둔 데칼 → 이미지)
pcall(function()
	require(game:GetService("ReplicatedStorage"):WaitForChild("AtlasText")).Resolve()
end)
local Builder = require(ServerScriptService:WaitForChild("SchoolBuilder"))
local school = Builder.Build(workspace, true)
-- 벽·바닥·천장에 실사 텍스처를 붙인다 (데칼 이미지를 못 불러오면 기본 재질 그대로)
task.spawn(function()
	local ok, err = pcall(function()
		require(ServerScriptService:WaitForChild("SurfaceTextures")).Apply(school)
		require(ServerScriptService:WaitForChild("SurfaceTextures")).ApplyLeaves(school)
	end)
	if not ok then
		warn("[SurfaceTextures] " .. tostring(err))
	end
end)
workspace:SetAttribute("MapReady", true)

local function tagged(tag)
	return CollectionService:GetTagged(tag)
end
local function first(tag)
	return tagged(tag)[1]
end

-- ───────── 밤 분위기 ─────────
Lighting.ClockTime = 22
Lighting.Brightness = 1.2
Lighting.Ambient = Color3.fromRGB(10, 12, 18)
Lighting.OutdoorAmbient = Color3.fromRGB(38, 44, 64)
Lighting.EnvironmentDiffuseScale = 1
Lighting.EnvironmentSpecularScale = 1
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.25
Lighting.ExposureCompensation = 0.15
Lighting.GeographicLatitude = 37.5 -- 서울
pcall(function()
	Lighting.Technology = Enum.Technology.Future -- Studio에서만 바뀌는 경우가 있음. 안 되면 직접 Future로
end)
local function effect(class, props)
	local e = Lighting:FindFirstChildOfClass(class) or Instance.new(class)
	for k, v in pairs(props) do
		e[k] = v
	end
	e.Parent = Lighting
	return e
end
effect("Atmosphere", { Density = 0.32, Offset = 0.05, Color = Color3.fromRGB(86, 96, 124), Decay = Color3.fromRGB(26, 28, 44), Glare = 0.2, Haze = 1.4 })
effect("ColorCorrectionEffect", { Brightness = 0, Contrast = 0.14, Saturation = -0.12, TintColor = Color3.fromRGB(226, 232, 255) })
effect("BloomEffect", { Intensity = 0.55, Size = 30, Threshold = 1.25 })
effect("SunRaysEffect", { Intensity = 0.015, Spread = 0.5 })
local sky = Lighting:FindFirstChildOfClass("Sky") or Instance.new("Sky")
sky.StarCount = 2500
sky.MoonAngularSize = 13
sky.CelestialBodiesShown = true
sky.Parent = Lighting

local function playSound(name, parent, looped)
	local id = Config.SOUNDS[name]
	if not id or id == 0 then
		return nil
	end
	local s = Instance.new("Sound")
	s.SoundId = "rbxassetid://" .. id
	s.Looped = looped or false
	s.RollOffMaxDistance = 200
	s.Parent = parent or workspace
	s:Play()
	if not looped then
		s.Ended:Connect(function()
			s:Destroy()
		end)
	end
	return s
end
playSound("Ambience", workspace, true)

-- ───────── 공통 도구 ─────────
local api = {}
api.Subtitle = Subtitle
api.Effect = Effect
api.playSound = playSound
api.school = school

local function rootOf(player)
	local ch = player.Character
	return ch and ch:FindFirstChild("HumanoidRootPart")
end
api.rootOf = rootOf

function api.inside(part, pos)
	local rel = part.CFrame:PointToObjectSpace(pos)
	local h = part.Size / 2
	return math.abs(rel.X) <= h.X and math.abs(rel.Y) <= h.Y and math.abs(rel.Z) <= h.Z
end

function api.activePlayers()
	local list = {}
	for _, p in ipairs(Players:GetPlayers()) do
		if p:GetAttribute("IntroDone") and not p:GetAttribute("Ended") then
			local ch = p.Character
			local hum = ch and ch:FindFirstChildOfClass("Humanoid")
			if hum and hum.Health > 0 and rootOf(p) then
				table.insert(list, p)
			end
		end
	end
	return list
end

function api.say(player, text, seconds, color)
	Subtitle:FireClient(player, text, seconds or 4, color or "white")
end
function api.sayAll(text, seconds, color)
	for _, p in ipairs(api.activePlayers()) do
		api.say(p, text, seconds, color)
	end
end
function api.sayNear(pos, radius, text, seconds, color)
	for _, p in ipairs(api.activePlayers()) do
		local r = rootOf(p)
		if r and (r.Position - pos).Magnitude <= radius then
			api.say(p, text, seconds, color)
		end
	end
end

function api.teleportToBooth(player)
	local spawnPart = first("BoothSpawn")
	local r = rootOf(player)
	if spawnPart and r then
		player.Character:PivotTo(CFrame.new(spawnPart.Position + Vector3.new(0, 3.5, 0)) * CFrame.Angles(0, math.rad(180), 0))
	end
end

local endFor -- 아래에서 정의

function api.addSanity(player, delta, reason)
	if not player:GetAttribute("IntroDone") or player:GetAttribute("Ended") then
		return
	end
	local s = math.clamp((player:GetAttribute("Sanity") or Config.START_SANITY) + delta, 0, 100)
	player:SetAttribute("Sanity", s)
	if reason then
		api.say(player, reason, 4, delta < 0 and "red" or "green")
	end
	if delta < 0 then
		Effect:FireClient(player, "hurt")
	end
	if s <= 0 then
		endFor(player, "SANITY")
	end
end

-- ───────── 근무 시간 ─────────
local shift = { running = false, minutes = 0, lastHour = 0 }
workspace:SetAttribute("ShiftMinutes", 0)
workspace:SetAttribute("ShiftRunning", false)

function api.hour()
	return math.floor(shift.minutes / 60) -- 0 = 22시대, 7 = 05시대
end
function api.shiftRunning()
	return shift.running
end

local function resetPatrol(player)
	for f = 1, 3 do
		player:SetAttribute("Patrol" .. f, false)
	end
end

function endFor(player, kind)
	if player:GetAttribute("Ended") then
		return
	end
	player:SetAttribute("Ended", true)
	Ending:FireClient(player, kind)
	if kind ~= "CLEAR" then
		task.delay(9, function()
			if player.Parent then
				player:SetAttribute("Sanity", Config.START_SANITY)
				player:SetAttribute("Ended", false)
				resetPatrol(player)
				player:LoadCharacter()
			end
		end)
	end
end
api.endFor = endFor

local Anomalies = require(ServerScriptService:WaitForChild("Anomalies"))

local function startShift()
	if shift.running then
		return
	end
	shift.running = true
	shift.minutes = 0
	shift.lastHour = 0
	workspace:SetAttribute("ShiftRunning", true)
	for _, p in ipairs(Players:GetPlayers()) do
		resetPatrol(p)
	end
	Anomalies.Start(api)
end

local function finishShift()
	shift.running = false
	workspace:SetAttribute("ShiftRunning", false)
	Anomalies.StopAll()
	for _, p in ipairs(api.activePlayers()) do
		endFor(p, "CLEAR")
	end
	-- 20초 뒤 새 밤 시작 (다시 하기)
	task.delay(20, function()
		for _, p in ipairs(Players:GetPlayers()) do
			p:SetAttribute("Ended", false)
			p:SetAttribute("Sanity", Config.START_SANITY)
			resetPatrol(p)
			if p:GetAttribute("IntroDone") then
				p:LoadCharacter()
			end
		end
		shift.minutes = 0
		workspace:SetAttribute("ShiftMinutes", 0)
		if #Players:GetPlayers() > 0 then
			startShift()
		end
	end)
end

local function onHourPassed(h)
	-- 정각: 순찰 확인
	for _, p in ipairs(api.activePlayers()) do
		local done = 0
		for f = 1, 3 do
			if p:GetAttribute("Patrol" .. f) then
				done = done + 1
			end
		end
		if done < 3 then
			api.addSanity(p, -Config.PATROL_MISS_PENALTY, string.format("순찰을 다 돌지 못했다 (%d/3). 어딘가에서 발소리가 따라온다…", done))
		else
			api.say(p, "순찰 완료. 무사히 한 시간을 넘겼다.", 3, "green")
		end
		resetPatrol(p)
	end
	local clockHour = (Config.SHIFT_START_HOUR + h) % 24
	if clockHour == 0 then
		api.sayAll("자정. 학교 종이 울렸다. …아무도 없는데.", 4)
		playSound("Bell", first("ClockCenter"))
	elseif clockHour == 3 then
		api.sayAll("새벽 3시. 이상하게 조용하다.", 4)
	end
end

-- ───────── 시계탑 ─────────
local clockCenter = first("ClockCenter")
local hourHand = first("ClockHour")
local minuteHand = first("ClockMinute")
local handZ = {}
if hourHand and minuteHand then
	handZ[hourHand] = hourHand.Position.Z
	handZ[minuteHand] = minuteHand.Position.Z
end
local backwardAngle = 0
local function setHand(hand, deg)
	local c = clockCenter.Position
	hand.CFrame = CFrame.new(c.X, c.Y, handZ[hand]) * CFrame.Angles(0, 0, -math.rad(deg)) * CFrame.new(0, hand.Size.Y / 2, 0)
end

-- ───────── 매 프레임 ─────────
RunService.Heartbeat:Connect(function(dt)
	if shift.running then
		shift.minutes = shift.minutes + dt * 60 / Config.SECONDS_PER_GAME_HOUR
		local h = math.floor(shift.minutes / 60)
		if h > shift.lastHour then
			shift.lastHour = h
			if h >= Config.SHIFT_HOURS then
				shift.minutes = Config.SHIFT_HOURS * 60
				finishShift()
			else
				onHourPassed(h)
			end
		end
		workspace:SetAttribute("ShiftMinutes", shift.minutes)
	end
	local hours = Config.SHIFT_START_HOUR + shift.minutes / 60
	Lighting.ClockTime = hours % 24
	if clockCenter and hourHand and minuteHand then
		if Anomalies.clockBackward then
			backwardAngle = backwardAngle - dt * 240
			setHand(minuteHand, backwardAngle)
			setHand(hourHand, backwardAngle / 12)
		else
			setHand(minuteHand, (shift.minutes % 60) / 60 * 360)
			setHand(hourHand, (hours % 12) / 12 * 360)
			backwardAngle = (shift.minutes % 60) / 60 * 360
		end
	end
end)

-- ───────── 늘 깜빡이는 조명 ─────────
task.spawn(function()
	while true do
		task.wait(math.random(15, 40) / 10)
		for _, part in ipairs(tagged("FlickerLight")) do
			if math.random() < 0.35 then
				local light = part:FindFirstChildWhichIsA("Light")
				task.spawn(function()
					for _ = 1, math.random(2, 5) do
						if light then
							light.Enabled = false
						end
						part.Material = Enum.Material.SmoothPlastic
						task.wait(math.random(3, 12) / 100)
						if light then
							light.Enabled = light:GetAttribute("Off") ~= true
						end
						if not (light and light:GetAttribute("Off")) then
							part.Material = Enum.Material.Neon
						end
						task.wait(math.random(3, 20) / 100)
					end
				end)
			end
		end
	end
end)
-- 꺼져 있는 등은 깜빡일 때 켜지지 않도록 표시
for _, part in ipairs(tagged("FlickerLight")) do
	local light = part:FindFirstChildWhichIsA("Light")
	if light and not light.Enabled then
		light:SetAttribute("Off", true)
	end
end

-- ───────── 교실 미닫이문 ─────────
-- 문짝(PrimaryPart "DoorLeaf")이 SlideX 만큼 옆으로 밀린다. "문 열기 / 문 닫기" 프롬프트.
local doors = {}
function api.slideDoor(door, wantOpen, seconds)
	local state = doors[door]
	if not state or state.busy then
		return false
	end
	if wantOpen == nil then
		wantOpen = not state.open
	end
	if wantOpen == state.open then
		return false
	end
	state.busy = true
	state.open = wantOpen
	state.prompt.ActionText = wantOpen and "문 닫기" or "문 열기"
	local v = Instance.new("CFrameValue")
	v.Value = door:GetPivot()
	v.Changed:Connect(function(cf)
		door:PivotTo(cf)
	end)
	local tw = TweenService:Create(v, TweenInfo.new(seconds or 0.55, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Value = wantOpen and state.opened or state.closed,
	})
	tw:Play()
	playSound("DoorSlide", door.PrimaryPart)
	tw.Completed:Connect(function()
		v:Destroy()
		state.busy = false
	end)
	return true
end
function api.doorsNear(pos, radius)
	local list = {}
	for door in pairs(doors) do
		if door.Parent and (door:GetPivot().Position - pos).Magnitude < radius then
			table.insert(list, door)
		end
	end
	return list
end
local function setupDoor(door)
	local leaf = door:IsA("Model") and door.PrimaryPart
	if not leaf or doors[door] then
		return
	end
	local offset = Vector3.new(leaf:GetAttribute("SlideX") or 3.5, 0, 0)
	local state = { open = leaf:GetAttribute("Open") == true, busy = false }
	local pivot = door:GetPivot()
	state.closed = state.open and (pivot - offset) or pivot
	state.opened = state.closed + offset
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = state.open and "문 닫기" or "문 열기"
	prompt.ObjectText = "미닫이문"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 7
	prompt.RequiresLineOfSight = false
	prompt.Parent = leaf
	state.prompt = prompt
	doors[door] = state
	prompt.Triggered:Connect(function()
		api.slideDoor(door)
	end)
end
for _, door in ipairs(tagged("SlidingDoor")) do
	setupDoor(door)
end
CollectionService:GetInstanceAddedSignal("SlidingDoor"):Connect(setupDoor)

-- ───────── 여닫이문 (경비실 문, 현관 유리문, 비상구, 화장실 칸) ─────────
-- 모델의 PrimaryPart "DoorLeaf"(투명, 몸을 막음)에 경첩 위치(HX, HZ)와 여는 각도(Swing)가 적혀 있다.
-- Locked 속성이 있으면 열리지 않고 그 말만 나온다.
local hinges = {}
function api.swingDoor(door, wantOpen, seconds)
	local state = hinges[door]
	if not state or state.busy then
		return false
	end
	if wantOpen == nil then
		wantOpen = not state.open
	end
	if wantOpen == state.open then
		return false
	end
	state.busy = true
	state.open = wantOpen
	state.prompt.ActionText = wantOpen and "문 닫기" or "문 열기"
	local v = Instance.new("NumberValue")
	v.Value = wantOpen and 0 or 1
	v.Changed:Connect(function(t)
		door:PivotTo(state.at(t))
	end)
	local tw = TweenService:Create(v, TweenInfo.new(seconds or 0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Value = wantOpen and 1 or 0 })
	tw:Play()
	playSound("DoorSlide", door.PrimaryPart)
	tw.Completed:Connect(function()
		door:PivotTo(state.at(wantOpen and 1 or 0))
		v:Destroy()
		state.busy = false
	end)
	return true
end
local function setupHinge(door)
	local leaf = door:IsA("Model") and door.PrimaryPart
	if not leaf or hinges[door] then
		return
	end
	local closed = door:GetPivot()
	local hinge = CFrame.new(leaf:GetAttribute("HX") or leaf.Position.X, leaf.Position.Y, leaf:GetAttribute("HZ") or leaf.Position.Z)
	local swing = math.rad(leaf:GetAttribute("Swing") or 90)
	local locked = leaf:GetAttribute("Locked")
	local state = { open = false, busy = false }
	function state.at(t)
		return hinge * CFrame.Angles(0, swing * t, 0) * hinge:Inverse() * closed
	end
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "문 열기"
	prompt.ObjectText = "문"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 8
	prompt.RequiresLineOfSight = false
	prompt.Parent = leaf
	state.prompt = prompt
	hinges[door] = state
	if leaf:GetAttribute("Open") == true and not locked then
		state.open = true
		prompt.ActionText = "문 닫기"
		door:PivotTo(state.at(1))
	end
	prompt.Triggered:Connect(function(player)
		if locked then
			api.say(player, locked, 3)
			playSound("Knock", leaf)
			return
		end
		api.swingDoor(door)
	end)
end
for _, door in ipairs(tagged("HingeDoor")) do
	setupHinge(door)
end
CollectionService:GetInstanceAddedSignal("HingeDoor"):Connect(setupHinge)

-- 잠긴 문 (옥상 문, 화장실 세 번째 칸): 눌러 보면 잠겨 있다는 말이 나온다
local function setupLocked(part)
	if not part:IsA("BasePart") or part:FindFirstChild("LockPrompt") then
		return
	end
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "LockPrompt"
	prompt.ActionText = "문 열기"
	prompt.ObjectText = "문"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 7
	prompt.RequiresLineOfSight = false
	prompt.Parent = part
	prompt.Triggered:Connect(function(player)
		if part.CanCollide then
			api.say(player, part:GetAttribute("Locked") or "잠겨 있다.", 3)
		end
	end)
end
for _, part in ipairs(tagged("LockedDoor")) do
	setupLocked(part)
end
CollectionService:GetInstanceAddedSignal("LockedDoor"):Connect(setupLocked)

-- ───────── 교실 전등 스위치 ─────────
-- 앞문 옆 스위치로 그 방의 형광등(Tube)과 조명을 켜고 끈다.
function api.setRoomLights(room, on)
	for _, d in ipairs(room:GetDescendants()) do
		if d:IsA("BasePart") and d.Name == "Tube" then
			d.Material = on and Enum.Material.Neon or Enum.Material.SmoothPlastic
			d.Color = on and Color3.fromRGB(246, 248, 255) or Color3.fromRGB(222, 224, 222)
		elseif d:IsA("Light") and d.Parent and (d.Parent.Name == "LampBody" or d.Parent.Name == "BoardLampBody" or d.Parent.Name == "LampFill") then
			-- 아래로 비추는 SurfaceLight + 천장·벽을 밝히는 약한 PointLight
			d.Enabled = on
			d.Brightness = on and (d:IsA("PointLight") and 0.5 or 1.2) or 0
		end
	end
	room:SetAttribute("LightsOn", on)
end
for _, plate in ipairs(tagged("RoomSwitch")) do
	local room = plate.Parent
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "불 켜기"
	prompt.ObjectText = "전등 스위치"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 6
	prompt.RequiresLineOfSight = false
	prompt.Parent = plate
	prompt.Triggered:Connect(function()
		local on = not room:GetAttribute("LightsOn")
		api.setRoomLights(room, on)
		prompt.ActionText = on and "불 끄기" or "불 켜기"
		playSound("Switch", plate)
	end)
	room:GetAttributeChangedSignal("LightsOn"):Connect(function()
		prompt.ActionText = room:GetAttribute("LightsOn") and "불 끄기" or "불 켜기"
	end)
end

-- ───────── 순찰함 ─────────
for _, box in ipairs(tagged("PatrolPoint")) do
	local floor = box:GetAttribute("Floor")
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "순찰 체크"
	prompt.ObjectText = "순찰함 " .. floor .. "F"
	prompt.HoldDuration = 0.6
	prompt.MaxActivationDistance = 9
	prompt.RequiresLineOfSight = false
	prompt.Parent = box
	prompt.Triggered:Connect(function(player)
		if not shift.running or player:GetAttribute("Ended") then
			return
		end
		if player:GetAttribute("Patrol" .. floor) then
			api.say(player, floor .. "층은 이번 시간에 이미 체크했다.", 2.5)
			return
		end
		player:SetAttribute("Patrol" .. floor, true)
		local done = 0
		for f = 1, 3 do
			if player:GetAttribute("Patrol" .. f) then
				done = done + 1
			end
		end
		api.say(player, string.format("%dF 순찰 완료 (%d/3)", floor, done), 2.5, "green")
	end)
end

-- ───────── 정문 ─────────
local gateModel = school:FindFirstChild("MainGate", true)
local gateLock = first("GateLock")
local gateOpen = false
local function moveGate(open)
	if not gateModel or gateOpen == open then
		return
	end
	gateOpen = open
	local base = gateModel:GetAttribute("ClosedPivot")
	if not base then
		gateModel:SetAttribute("ClosedPivot", gateModel:GetPivot())
		base = gateModel:GetPivot()
	end
	local target = open and (base * CFrame.new(-28, 0, 0)) or base
	local v = Instance.new("CFrameValue")
	v.Value = gateModel:GetPivot()
	v.Changed:Connect(function(cf)
		gateModel:PivotTo(cf)
	end)
	local tw = TweenService:Create(v, TweenInfo.new(3, Enum.EasingStyle.Sine), { Value = target })
	tw:Play()
	tw.Completed:Connect(function()
		v:Destroy()
	end)
	playSound("GateClose", gateLock)
end
if gateModel then
	gateModel:SetAttribute("ClosedPivot", gateModel:GetPivot())
end
if gateLock then
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "정문 열기"
	prompt.ObjectText = "정문"
	prompt.HoldDuration = 1.5
	prompt.MaxActivationDistance = 10
	prompt.RequiresLineOfSight = false
	prompt.Parent = gateLock
	prompt.Triggered:Connect(function(player)
		if shift.running and shift.minutes < Config.SHIFT_HOURS * 60 then
			-- 수칙 1번 위반
			moveGate(true)
			Effect:FireClient(player, "jumpscare")
			endFor(player, "GATE")
			task.delay(6, function()
				moveGate(false)
			end)
		else
			moveGate(true)
			api.say(player, "아침 공기가 들어온다. 수고했어, " .. Config.HERO_NAME .. ".", 4, "green")
			task.delay(12, function()
				moveGate(false)
			end)
		end
	end)
end

-- ───────── 플레이어 ─────────
local GuardOutfit = require(ServerScriptService:WaitForChild("GuardOutfit"))

local function onCharacter(player, character)
	local hrp = character:WaitForChild("HumanoidRootPart", 10)
	local hum = character:WaitForChild("Humanoid", 10)
	if not hrp or not hum then
		return
	end
	task.wait()
	api.teleportToBooth(player)
	if not player:GetAttribute("IntroDone") then
		hrp.Anchored = true -- 인트로 동안 가만히
	end
	hum.Died:Connect(function()
		task.delay(Players.RespawnTime, function()
			if player.Parent and player.Character == character then
				player:LoadCharacter()
			end
		end)
	end)
	GuardOutfit.Apply(player, character)
end

Players.PlayerAdded:Connect(function(player)
	player:SetAttribute("Sanity", Config.START_SANITY)
	player:SetAttribute("IntroDone", false)
	player:SetAttribute("Ended", false)
	resetPatrol(player)
	player.CharacterAdded:Connect(function(ch)
		onCharacter(player, ch)
	end)
	player:LoadCharacter()
end)
for _, player in ipairs(Players:GetPlayers()) do
	player:SetAttribute("Sanity", Config.START_SANITY)
	player:SetAttribute("IntroDone", player:GetAttribute("IntroDone") or false)
	resetPatrol(player)
	player.CharacterAdded:Connect(function(ch)
		onCharacter(player, ch)
	end)
	task.spawn(function()
		player:LoadCharacter()
	end)
end

IntroFinished.OnServerEvent:Connect(function(player)
	if player:GetAttribute("IntroDone") then
		return
	end
	player:SetAttribute("IntroDone", true)
	player:SetAttribute("Sanity", Config.START_SANITY)
	local hrp = rootOf(player)
	if hrp then
		hrp.Anchored = false
	end
	api.teleportToBooth(player)
	startShift()
end)

ChairGaze.OnServerEvent:Connect(function(player)
	Anomalies.OnChairGaze(player)
end)
