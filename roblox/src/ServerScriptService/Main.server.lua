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
local FlashToggle = remote("Flashlight") -- (켜짐 여부) 다른 사람도 내 손전등 불빛을 본다
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
-- 정전된 듯 불 꺼진 학교: 손전등 없이는 거의 안 보일 만큼 어둡게
Lighting.ClockTime = 22
Lighting.Brightness = 0.55
Lighting.Ambient = Color3.fromRGB(3, 4, 6)
Lighting.OutdoorAmbient = Color3.fromRGB(16, 18, 28)
Lighting.EnvironmentDiffuseScale = 1
Lighting.EnvironmentSpecularScale = 1
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.25
Lighting.ExposureCompensation = -0.25
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
effect("Atmosphere", { Density = 0.45, Offset = 0.02, Color = Color3.fromRGB(44, 50, 66), Decay = Color3.fromRGB(10, 11, 18), Glare = 0, Haze = 2.2 })
effect("ColorCorrectionEffect", { Brightness = -0.02, Contrast = 0.24, Saturation = -0.38, TintColor = Color3.fromRGB(206, 218, 236) })
effect("BloomEffect", { Intensity = 0.45, Size = 26, Threshold = 1.3 })
effect("SunRaysEffect", { Intensity = 0, Spread = 0.5 })
local sky = Lighting:FindFirstChildOfClass("Sky") or Instance.new("Sky")
sky.StarCount = 900
sky.MoonAngularSize = 9
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
	if delta < 0 then
		delta = delta * (Config.SANITY_DAMAGE_SCALE or 1)
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
			api.addSanity(p, -Config.PATROL_MISS_PENALTY, string.format("순찰을 다 돌지 못했다 (%d/3). …불안하다.", done))
		else
			api.addSanity(p, Config.PATROL_DONE_BONUS or 0)
			api.say(p, "순찰 완료. 무사히 한 시간을 넘겼다. 조금 마음이 놓인다.", 3, "green")
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

-- 옥상 철문: 남쪽 모서리를 축으로 바깥(서쪽)으로 열린다
do
	local door = first("RoofDoor")
	if door then
		local closed = door.CFrame
		local hinge = closed * CFrame.new(0, 0, door.Size.Z / 2) -- 문 한쪽 끝
		local openCF = hinge * CFrame.Angles(0, math.rad(100), 0) * hinge:ToObjectSpace(closed)
		local isOpen = false
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = "문 열기"
		prompt.ObjectText = "옥상 문"
		prompt.HoldDuration = 0
		prompt.MaxActivationDistance = 8
		prompt.RequiresLineOfSight = false
		prompt.Parent = door
		prompt.Triggered:Connect(function()
			isOpen = not isOpen
			prompt.ActionText = isOpen and "문 닫기" or "문 열기"
			TweenService:Create(door, TweenInfo.new(0.9, Enum.EasingStyle.Sine), { CFrame = isOpen and openCF or closed }):Play()
			playSound("DoorSlide", door)
		end)
	end
end

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
	prompt.ActionText = "스위치 누르기"
	prompt.ObjectText = "전등 스위치"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 6
	prompt.RequiresLineOfSight = false
	prompt.Parent = plate
	-- 정전: 스위치를 눌러도 불이 안 들어온다 (이상현상이 켠 불만 끌 수 있다)
	prompt.Triggered:Connect(function(player)
		playSound("Switch", plate)
		if room:GetAttribute("LightsOn") then
			api.setRoomLights(room, false)
			api.say(player, "딸깍. …누가 켜 놓은 거지?", 3)
		else
			api.say(player, "딸깍, 딸깍. …불이 안 들어온다. 손전등에 의지하자.", 3)
		end
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
			api.say(player, "아침 공기가 들어온다. …살았다.", 4, "green")
			task.delay(12, function()
				moveGate(false)
			end)
		end
	end)
end

-- ───────── 로비 · 출근 차량 (SUV) ─────────
-- 처음 들어온 사람은 편의점 앞(로비)에서 시작한다. 검은 SUV 문 옆 '탑승' → 빈 자리에 앉는다(최대 5명).
-- 첫 사람이 앉으면 10초 카운트다운, 0이 되면 출발. 차는 서버 시계(SUVTripStart)에 맞춰 각 화면에서 움직이고,
-- 도착하면 서버가 모두를 자리에서 내려 경비실로 옮긴 뒤 근무를 시작한다.
-- 상태는 workspace 속성으로 알린다: SUVState(waiting/countdown/driving/arrived), SUVDepartAt, SUVTripStart, SUVSeat1~5(이름)
local IntroPath = require(ReplicatedStorage:WaitForChild("IntroPath"))
local GuardOutfit = require(ServerScriptService:WaitForChild("GuardOutfit"))
local suv = school:FindFirstChild("IntroCar")
local rideSeats = {}
local lobbyCF, parkedCF
local function groundY(pos, ignore)
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = ignore
	params.RespectCanCollide = true
	local hit = workspace:Raycast(Vector3.new(pos.X, pos.Y + 4, pos.Z), Vector3.new(0, -30, 0), params)
	return hit and hit.Position.Y or 0.22
end
if suv then
	for _, d in ipairs(suv:GetDescendants()) do
		if d:IsA("Seat") and d.Name == "RideSeat" then
			table.insert(rideSeats, d)
		end
	end
	table.sort(rideSeats, function(a, b)
		return (a:GetAttribute("SeatIndex") or 0) < (b:GetAttribute("SeatIndex") or 0)
	end)
	lobbyCF = suv:GetPivot()
	-- 기준점(차체 가운데)이 바닥에서 얼마나 떠 있는지
	local rideH = lobbyCF.Position.Y - groundY(lobbyCF.Position - Vector3.new(0, 2, 0), { suv })
	workspace:SetAttribute("SUVRideHeight", rideH)
	local endPos = Config.INTRO_PATH[#Config.INTRO_PATH]
	parkedCF = IntroPath.CFrameAt(Config.INTRO_SECONDS, groundY(Vector3.new(endPos.X, 4, endPos.Z), { suv }) + rideH)
end
workspace:SetAttribute("SUVState", "waiting")
for i = 1, Config.MAX_PLAYERS do
	workspace:SetAttribute("SUVSeat" .. i, "")
	workspace:SetAttribute("SUVSeatUser" .. i, 0)
end

function api.teleportToLobby(player)
	local sp = first("LobbySpawn")
	local r = rootOf(player)
	if sp and r then
		local off = Vector3.new((math.random() - 0.5) * math.max(0, sp.Size.X - 2), 3.5, (math.random() - 0.5) * math.max(0, sp.Size.Z - 2))
		local pos = sp.Position + off
		local look = lobbyCF and Vector3.new(lobbyCF.Position.X, pos.Y, lobbyCF.Position.Z) or pos + Vector3.new(0, 0, -1)
		player.Character:PivotTo(CFrame.lookAt(pos, look))
	end
end

local savedJump = {}
local function setJumpLocked(hum, locked)
	if locked then
		savedJump[hum] = { hum.JumpPower, hum.JumpHeight }
		hum.JumpPower = 0
		hum.JumpHeight = 0
	elseif savedJump[hum] then
		hum.JumpPower = savedJump[hum][1]
		hum.JumpHeight = savedJump[hum][2]
		savedJump[hum] = nil
	end
end

local function playerOn(seat)
	local occ = seat.Occupant
	return occ and Players:GetPlayerFromCharacter(occ.Parent), occ
end
local function refreshSeats()
	local n = 0
	for i, seat in ipairs(rideSeats) do
		local p = playerOn(seat)
		workspace:SetAttribute("SUVSeat" .. i, p and p.DisplayName or "")
		workspace:SetAttribute("SUVSeatUser" .. i, p and p.UserId or 0)
		if p then
			n = n + 1
		end
	end
	return n
end

-- 근무 시작 처리 (차로 왔든, 늦게 왔든)
local function finishIntro(player)
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
	-- 경비실에 도착하면 경비복으로 갈아입는다 (로비·차 안에서는 자기 옷)
	if Config.GUARD_OUTFIT and player.Character then
		task.spawn(GuardOutfit.Apply, player, player.Character)
	end
	startShift()
end

local prompts = {}
local lastOccupant = {}
local function exitBeside(hum)
	-- 출발 전에 내리면 인도 쪽 문 옆에 내려 준다
	local ch = hum.Parent
	if ch and ch.Parent and lobbyCF then
		local pos = lobbyCF.Position + lobbyCF.RightVector * 5.5
		ch:PivotTo(CFrame.new(Vector3.new(pos.X, groundY(pos, { suv, ch }) + 3.2, pos.Z)))
	end
end
for _, seat in ipairs(rideSeats) do
	seat:GetPropertyChangedSignal("Occupant"):Connect(function()
		local prev = lastOccupant[seat]
		lastOccupant[seat] = seat.Occupant
		local st = workspace:GetAttribute("SUVState")
		if prev and not seat.Occupant and prev.Parent and prev.Health > 0 then
			local p = Players:GetPlayerFromCharacter(prev.Parent)
			if st == "driving" and p and not p:GetAttribute("IntroDone") then
				task.defer(function()
					if not seat.Occupant then
						seat:Sit(prev) -- 달리는 중엔 못 내린다
					end
				end)
			elseif st == "waiting" or st == "countdown" then
				task.defer(exitBeside, prev)
			end
		end
		refreshSeats()
	end)
end
for _, door in ipairs(tagged("SUVDoor")) do
	if suv and door:IsDescendantOf(suv) then
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = "탑승"
		prompt.ObjectText = "출근 차량"
		prompt.HoldDuration = 0.4
		prompt.MaxActivationDistance = 11
		prompt.RequiresLineOfSight = false
		prompt.Parent = door
		table.insert(prompts, prompt)
		prompt.Triggered:Connect(function(player)
			local st = workspace:GetAttribute("SUVState")
			if player:GetAttribute("IntroDone") or (st ~= "waiting" and st ~= "countdown") then
				return
			end
			local ch = player.Character
			local hum = ch and ch:FindFirstChildOfClass("Humanoid")
			if not hum or hum.Health <= 0 or hum.SeatPart then
				return
			end
			for _, seat in ipairs(rideSeats) do
				if not seat.Occupant then
					seat:Sit(hum)
					return
				end
			end
			api.say(player, "자리가 다 찼어요 (최대 " .. Config.MAX_PLAYERS .. "명)", 2.5, "yellow")
		end)
	end
end

local function arrive(riders)
	if suv and parkedCF then
		suv:PivotTo(parkedCF)
	end
	for _, r in ipairs(riders) do
		local w = r.seat:FindFirstChild("SeatWeld")
		if w then
			w:Destroy()
		end
		if r.hum.Parent then
			r.hum.Sit = false
			setJumpLocked(r.hum, false)
		end
		if r.player.Parent then
			finishIntro(r.player)
		end
	end
	workspace:SetAttribute("SUVState", "arrived")
	refreshSeats()
end

local function depart()
	workspace:SetAttribute("SUVState", "driving")
	workspace:SetAttribute("SUVTripStart", workspace:GetServerTimeNow() + 0.4)
	for _, pr in ipairs(prompts) do
		pr.Enabled = false
	end
	local riders = {}
	for _, seat in ipairs(rideSeats) do
		local p, hum = playerOn(seat)
		if p then
			table.insert(riders, { player = p, hum = hum, seat = seat })
			setJumpLocked(hum, true)
		end
	end
	task.delay(Config.INTRO_SECONDS + 0.5, arrive, riders)
end

-- 카운트다운 + 차를 놓친 사람 처리
local lateSince = {}
task.spawn(function()
	while true do
		task.wait(0.2)
		local st = workspace:GetAttribute("SUVState")
		local n = refreshSeats()
		if st == "waiting" and n > 0 then
			workspace:SetAttribute("SUVDepartAt", workspace:GetServerTimeNow() + Config.DEPART_DELAY)
			workspace:SetAttribute("SUVState", "countdown")
		elseif st == "countdown" then
			if n == 0 then
				workspace:SetAttribute("SUVState", "waiting") -- 모두 내리면 처음부터
			elseif workspace:GetServerTimeNow() >= (workspace:GetAttribute("SUVDepartAt") or 0) then
				depart()
			end
		elseif st == "driving" or st == "arrived" or not suv then
			for _, p in ipairs(Players:GetPlayers()) do
				local hum = p.Character and p.Character:FindFirstChildOfClass("Humanoid")
				local riding = hum and hum.SeatPart and hum.SeatPart.Name == "RideSeat"
				if not p:GetAttribute("IntroDone") and hum and not riding then
					lateSince[p] = lateSince[p] or os.clock()
					if os.clock() - lateSince[p] >= Config.LATE_ARRIVAL_SECONDS then
						lateSince[p] = nil
						finishIntro(p)
					end
				end
			end
		end
	end
end)
Players.PlayerRemoving:Connect(function(p)
	lateSince[p] = nil
end)

-- ───────── 플레이어 ─────────

local function onCharacter(player, character)
	local hrp = character:WaitForChild("HumanoidRootPart", 10)
	local hum = character:WaitForChild("Humanoid", 10)
	if not hrp or not hum then
		return
	end
	task.wait()
	if player:GetAttribute("IntroDone") then
		api.teleportToBooth(player)
	else
		api.teleportToLobby(player) -- 처음엔 로비(편의점 앞)에서 출근 차량을 기다린다
	end
	hum.Died:Connect(function()
		task.delay(Players.RespawnTime, function()
			if player.Parent and player.Character == character then
				player:LoadCharacter()
			end
		end)
	end)
	if Config.GUARD_OUTFIT and player:GetAttribute("IntroDone") then
		GuardOutfit.Apply(player, character) -- 이미 근무 중(다시 살아남·새 밤)이면 바로 경비복
	end
	-- 가슴 앞에 든 손전등 (다른 플레이어에게 보이는 불빛). 내 화면에선 카메라에 붙은 손전등을 쓴다
	local fl = Instance.new("Part")
	fl.Name = "HeldFlashlight"
	fl.Size = Vector3.new(0.32, 0.32, 1.2)
	fl.Color = Color3.fromRGB(28, 28, 30)
	fl.Material = Enum.Material.Metal
	fl.CanCollide = false
	fl.CanQuery = false
	fl.CanTouch = false
	fl.Massless = true
	local lens = Instance.new("Part")
	lens.Name = "Lens"
	lens.Shape = Enum.PartType.Cylinder
	lens.Size = Vector3.new(0.06, 0.4, 0.4)
	lens.Material = Enum.Material.Neon
	lens.Color = Color3.fromRGB(255, 244, 220)
	lens.CanCollide = false
	lens.CanQuery = false
	lens.CanTouch = false
	lens.Massless = true
	lens.CFrame = fl.CFrame * CFrame.new(0, 0, -0.62) * CFrame.Angles(0, math.rad(90), 0)
	local lw = Instance.new("WeldConstraint")
	lw.Part0, lw.Part1 = fl, lens
	lw.Parent = fl
	lens.Parent = fl
	local beam = Instance.new("SpotLight")
	beam.Name = "Beam"
	beam.Face = Enum.NormalId.Front
	beam.Range = 50
	beam.Angle = 42
	beam.Brightness = 2.4
	beam.Color = Color3.fromRGB(255, 238, 210)
	beam.Shadows = true
	beam.Enabled = player:GetAttribute("FlashOn") ~= false
	beam.Parent = fl
	fl.CFrame = hrp.CFrame * CFrame.new(0.85, 0.9, -0.9)
	local w = Instance.new("WeldConstraint")
	w.Part0, w.Part1 = hrp, fl
	w.Parent = fl
	fl.Parent = character
	local function syncBeam()
		local on = player:GetAttribute("FlashOn") ~= false
		beam.Enabled = on
		lens.Material = on and Enum.Material.Neon or Enum.Material.Glass
	end
	syncBeam()
	player:GetAttributeChangedSignal("FlashOn"):Connect(syncBeam)
end

-- 오프닝의 공유 차림: 가운데 가르마 갈색 머리, 밝은 회색 정장(라펠), 흰 셔츠, 보라 넥타이, 검은 구두, 손에 손전등
local function dressGongYoo(actor)
	local function weld(parent, attach, name, size, offset, color, mat, shape)
		local p = Instance.new("Part")
		p.Name = name
		p.Size = size
		p.Color = color
		p.Material = mat or Enum.Material.SmoothPlastic
		p.CanCollide = false
		p.CanQuery = false
		p.CanTouch = false
		p.Massless = true
		p.CastShadow = false
		if shape then
			p.Shape = shape
		end
		p.CFrame = attach.CFrame * offset
		local w = Instance.new("WeldConstraint")
		w.Part0, w.Part1 = attach, p
		w.Parent = p
		p.Parent = parent
		return p
	end
	local folder = Instance.new("Folder")
	folder.Name = "Look"
	folder.Parent = actor
	-- 둥근 몸 메시 (메시 팩의 GongYooBody): 부위마다 붙이고 원래 네모난 부위는 투명하게. 얼굴 그림은 둥근 머리로 옮긴다
	local okLib, AssetLibrary = pcall(function()
		return require(ServerScriptService:WaitForChild("AssetLibrary"))
	end)
	local HEAD_SCALE, HEAD_DROP = 0.92, 0.05
	local tpl = okLib and AssetLibrary.CloneTemplate("GongYooBody")
	if tpl then
		local DEF = {
			Head = Vector3.new(1.2, 1.2, 1.2), UpperTorso = Vector3.new(2, 1.6, 1), LowerTorso = Vector3.new(2, 0.4, 1),
			LeftUpperArm = Vector3.new(1, 1.169, 1), RightUpperArm = Vector3.new(1, 1.169, 1), LeftLowerArm = Vector3.new(1, 1.052, 1), RightLowerArm = Vector3.new(1, 1.052, 1),
			LeftHand = Vector3.new(1, 0.3, 1), RightHand = Vector3.new(1, 0.3, 1), LeftUpperLeg = Vector3.new(1, 1.217, 1), RightUpperLeg = Vector3.new(1, 1.217, 1),
			LeftLowerLeg = Vector3.new(1, 1.193, 1), RightLowerLeg = Vector3.new(1, 1.193, 1), LeftFoot = Vector3.new(1, 0.3, 1), RightFoot = Vector3.new(1, 0.3, 1),
		}
		local headMesh
		for _, m in ipairs(tpl:GetChildren()) do
			local partName, pieceName = string.match(m.Name, "^(.-)__(.+)$")
			local rig = partName and actor:FindFirstChild(partName)
			if m:IsA("BasePart") and rig and DEF[partName] then
				local k = rig.Size / DEF[partName]
				local rel = m.Position * k
				if partName == "Head" then
					-- 머리를 사람 비율에 가깝게 줄이고 목 쪽으로 조금 내린다
					k = k * HEAD_SCALE
					rel = rel * HEAD_SCALE - Vector3.new(0, HEAD_DROP, 0)
				end
				m.Size = m.Size * k
				m.CFrame = rig.CFrame * CFrame.new(rel)
				m.Anchored = false
				m.CanCollide = false
				m.CanQuery = false
				m.CanTouch = false
				m.Massless = true
				local w = Instance.new("WeldConstraint")
				w.Part0, w.Part1 = rig, m
				w.Parent = m
				m.Parent = folder
				rig.Transparency = 1
				if partName == "Head" and pieceName == "Face" then
					headMesh = m
				end
			end
		end
		tpl:Destroy()
		if headMesh then
			local face = actor.Head:FindFirstChildWhichIsA("Decal")
			if face then
				face.Parent = headMesh
				face.Face = Enum.NormalId.Front
			end
		end
		for _, h in ipairs({ "LeftHand", "RightHand" }) do
			local part = actor:FindFirstChild(h)
			if part then
				part.Color = Config.SKIN_COLOR
			end
		end
		-- 플레이어와 같은 경비원 차림: 경비 모자·이름표 "공유"·금색 가슴 휘장·완장·손전등 (GuardOutfit.Gear)
		-- 근무복·모자·배지·벨트·경봉은 몸 메시에 들어 있다. 손전등만 오른손에 쥐여 준다
		do
			local hand = actor:FindFirstChild("RightHand")
			if hand then
				local body = weld(folder, hand, "Flashlight", Vector3.new(1.0, 0.3, 0.3), CFrame.new(0, -hand.Size.Y * 0.2 - 0.25, -0.4) * CFrame.Angles(0, math.rad(90), 0), Color3.fromRGB(34, 34, 36), Enum.Material.Metal, Enum.PartType.Cylinder)
				weld(folder, body, "Lens", Vector3.new(0.07, 0.32, 0.32), CFrame.new(0.51, 0, 0), Color3.fromRGB(255, 246, 216), Enum.Material.Neon, Enum.PartType.Cylinder)
			end
		end
		-- 완장: 네모 상자 대신 둥근 팔을 감싸는 고리
		local patch = actor:FindFirstChild("ArmPatch", true)
		local larm = actor:FindFirstChild("LeftUpperArm")
		if patch and larm then
			local w = patch:FindFirstChildOfClass("WeldConstraint")
			if w then
				w:Destroy()
			end
			patch.Shape = Enum.PartType.Cylinder
			patch.Size = Vector3.new(larm.Size.Y * 0.26, larm.Size.X * 0.8, larm.Size.Z * 0.8)
			patch.CFrame = larm.CFrame * CFrame.new(0, larm.Size.Y * 0.12, 0) * CFrame.Angles(0, 0, math.rad(90))
			local nw = Instance.new("WeldConstraint")
			nw.Part0, nw.Part1 = larm, patch
			nw.Parent = patch
		end
		-- 둥근 몸은 네모 부위보다 얇아서, 가슴에 붙는 이름표·휘장을 몸 쪽으로 붙인다
		for _, nm in ipairs({ "NameTag", "ChestBadge" }) do
			local p = actor:FindFirstChild(nm, true)
			local w = p and p:FindFirstChildOfClass("WeldConstraint")
			if p and w then
				local a0 = w.Part0
				w:Destroy()
				p.CFrame = p.CFrame * CFrame.new(0, 0, 0.12)
				local nw = Instance.new("WeldConstraint")
				nw.Part0, nw.Part1 = a0, p
				nw.Parent = p
			end
		end
		local hum = actor:FindFirstChildOfClass("Humanoid")
		if hum then
			hum.DisplayName = Config.HERO_NAME
		end
		return
	end
	-- (메시 팩이 없을 때) 네모난 부위 위에 파트로 머리카락·정장을 붙인다
	local head = actor:FindFirstChild("Head")
	for _, h in ipairs({ "LeftHand", "RightHand" }) do
		local part = actor:FindFirstChild(h)
		if part then
			part.Color = Config.SKIN_COLOR
		end
	end
	for _, f in ipairs({ "LeftFoot", "RightFoot" }) do
		local part = actor:FindFirstChild(f)
		if part then
			part.Color = Color3.fromRGB(28, 24, 22)
		end
	end
	if head then
		local hs, brown = head.Size, Color3.fromRGB(122, 76, 42)
		local A = CFrame.Angles
		weld(folder, head, "HairTop", Vector3.new(hs.X * 1.08, hs.Y * 0.3, hs.Z * 1.1), CFrame.new(0, hs.Y * 0.4, hs.Z * 0.02), brown)
		weld(folder, head, "HairBack", Vector3.new(hs.X * 1.08, hs.Y * 0.62, hs.Z * 0.2), CFrame.new(0, hs.Y * 0.14, hs.Z * 0.48), brown)
		for _, sx in ipairs({ -1, 1 }) do
			weld(folder, head, "HairSide", Vector3.new(hs.X * 0.1, hs.Y * 0.5, hs.Z * 0.95), CFrame.new(sx * hs.X * 0.52, hs.Y * 0.2, hs.Z * 0.04), brown)
			-- 가운데 가르마 앞머리: 양쪽으로 갈라져 이마 위로 비스듬히 내려옴
			weld(folder, head, "Bangs", Vector3.new(hs.X * 0.5, hs.Y * 0.3, hs.Z * 0.1), CFrame.new(sx * hs.X * 0.27, hs.Y * 0.3, -hs.Z * 0.52) * A(0, 0, math.rad(sx * 16)), brown)
		end
	end
	local torso = actor:FindFirstChild("UpperTorso")
	if torso then
		local ts = torso.Size
		local f = -ts.Z / 2 - 0.02
		weld(folder, torso, "Shirt", Vector3.new(ts.X * 0.26, ts.Y * 0.62, 0.04), CFrame.new(0, ts.Y * 0.18, f), Color3.fromRGB(244, 244, 242))
		weld(folder, torso, "Tie", Vector3.new(ts.X * 0.09, ts.Y * 0.6, 0.05), CFrame.new(0, ts.Y * 0.14, f - 0.02), Color3.fromRGB(150, 100, 200))
		weld(folder, torso, "TieKnot", Vector3.new(ts.X * 0.12, ts.Y * 0.09, 0.07), CFrame.new(0, ts.Y * 0.43, f - 0.03), Color3.fromRGB(130, 84, 180))
		for _, sx in ipairs({ -1, 1 }) do
			weld(folder, torso, "Lapel", Vector3.new(ts.X * 0.14, ts.Y * 0.62, 0.05), CFrame.new(sx * ts.X * 0.17, ts.Y * 0.16, f - 0.01) * CFrame.Angles(0, 0, math.rad(-sx * 14)), Color3.fromRGB(180, 182, 186))
		end
		weld(folder, torso, "Button", Vector3.new(0.12, 0.12, 0.05), CFrame.new(0, -ts.Y * 0.28, f - 0.01), Color3.fromRGB(60, 60, 64), nil, Enum.PartType.Ball)
	end
	-- 손전등 (오른손): 오프닝 스크립트가 "Flashlight" / "Lens" 를 찾는다
	local hand = actor:FindFirstChild("RightHand")
	if hand then
		local body = weld(folder, hand, "Flashlight", Vector3.new(1.1, 0.34, 0.34), CFrame.new(0, -hand.Size.Y * 0.2, -0.45) * CFrame.Angles(0, math.rad(90), 0), Color3.fromRGB(34, 34, 36), Enum.Material.Metal, Enum.PartType.Cylinder)
		weld(folder, body, "Lens", Vector3.new(0.08, 0.36, 0.36), CFrame.new(0.56, 0, 0), Color3.fromRGB(255, 246, 216), Enum.Material.Neon, Enum.PartType.Cylinder)
	end
	local hum = actor:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.DisplayName = Config.HERO_NAME
	end
end

-- 오프닝에 나오는 공유 (정장 차림 R15 인형). 각 클라이언트가 복제해서 혼자 보는 오프닝에서 움직인다
task.spawn(function()
	local ok, err = pcall(function()
		local SUIT = Color3.fromRGB(196, 198, 200)
		local desc = Instance.new("HumanoidDescription")
		desc.HeadColor = Config.SKIN_COLOR
		desc.TorsoColor = SUIT
		desc.LeftArmColor = SUIT
		desc.RightArmColor = SUIT
		desc.LeftLegColor = Color3.fromRGB(176, 178, 182)
		desc.RightLegColor = Color3.fromRGB(176, 178, 182)
		-- 사람에 가까운 비율 (로블록스 Rthro 체형): 머리가 작고 다리가 길고 허리가 가늘다
		desc.BodyTypeScale = 1
		desc.ProportionScale = 0.6
		desc.HeadScale = 1
		local actor = Players:CreateHumanoidModelFromDescription(desc, Enum.HumanoidRigType.R15)
		actor.Name = "GongYooActor"
		actor:PivotTo(CFrame.new(0, -400, 0))
		actor.HumanoidRootPart.Anchored = true
		actor.Parent = workspace
		dressGongYoo(actor)
		-- 키 163cm (이 맵은 1 m = 3.1 스터드 → 5.05 스터드): 발끝~머리끝을 재서 그 키로 줄인다
		do
			local lo, hi = math.huge, -math.huge
			for _, p in ipairs(actor:GetDescendants()) do
				if p:IsA("BasePart") and p.Transparency < 1 and p.Name ~= "HumanoidRootPart" then
					local half = p.Size.Y / 2
					lo = math.min(lo, p.Position.Y - half)
					hi = math.max(hi, p.Position.Y + half)
				end
			end
			local tall = hi - lo
			if tall > 1 and tall < 20 then
				pcall(function()
					actor:ScaleTo(actor:GetScale() * (Config.HERO_HEIGHT_STUDS or 5.05) / tall)
				end)
			end
		end
		-- 걱정하는 얼굴 (올려 둔 데칼 → 이미지)
		if (Config.ACTOR_FACE_DECAL or 0) ~= 0 then
			local okF, m = pcall(function()
				return game:GetService("InsertService"):LoadAsset(Config.ACTOR_FACE_DECAL)
			end)
			local dec = okF and m and m:FindFirstChildWhichIsA("Decal", true)
			local face = actor.Head:FindFirstChildWhichIsA("Decal")
			if dec and face then
				face.Texture = dec.Texture
			end
			if okF and m then
				m:Destroy()
			end
		end
		local anim = actor:FindFirstChild("Animate")
		if anim then
			anim:Destroy()
		end
		actor.Parent = ReplicatedStorage
	end)
	if not ok then
		warn("[Opening] 공유 인형을 못 만들었다: " .. tostring(err))
	end
end)

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

-- (예전 혼자 보는 인트로용. 이제는 서버가 출근 차량 도착 때 근무를 시작시킨다)
IntroFinished.OnServerEvent:Connect(function() end)

FlashToggle.OnServerEvent:Connect(function(player, on)
	player:SetAttribute("FlashOn", on == true)
end)

ChairGaze.OnServerEvent:Connect(function(player)
	Anomalies.OnChairGaze(player)
end)
