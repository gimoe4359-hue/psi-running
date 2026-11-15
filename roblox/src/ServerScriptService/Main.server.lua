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
local Builder = require(ServerScriptService:WaitForChild("SchoolBuilder"))
local school = Builder.Build(workspace, true)
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
