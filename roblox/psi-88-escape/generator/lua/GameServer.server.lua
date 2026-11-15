--!nonstrict
-- PSI 88층 탈출 · 서버 메인
-- 맵의 태그(CollectionService)와 GP_* 앵커만 보고 게임 장치를 붙인다. 맵을 다시 생성해도 그대로 동작한다.
-- 층별 놀이(암호, 돌진, 무궁화 꽃, 타일 파티 …)는 Floors 모듈에 있다.

local Players = game:GetService("Players")
local CS = game:GetService("CollectionService")
local RS = game:GetService("ReplicatedStorage")
local TS = game:GetService("TweenService")
local SSS = game:GetService("ServerScriptService")

local Config = require(RS:WaitForChild("Config"))
local Remotes = RS:WaitForChild("Remotes")
local MessageEv = Remotes:WaitForChild("Message")
local CaughtEv = Remotes:WaitForChild("Caught")
local StateEv = Remotes:WaitForChild("State")
local WinEv = Remotes:WaitForChild("Win")
local RestartEv = Remotes:WaitForChild("Restart")
local FxEv = Remotes:WaitForChild("Fx")
local InputEv = Remotes:WaitForChild("Input")

local Chaser = require(SSS:WaitForChild("Chaser"))
local Zzuk = require(SSS:WaitForChild("ZzukZzuk"))
local Floors = require(SSS:WaitForChild("Floors"))
local Doors = require(SSS:WaitForChild("Doors"))

Players.CharacterAutoLoads = false

-- ---------------------------------------------------------------- helpers
local function say(player, text, kind)
	if player then
		MessageEv:FireClient(player, text, kind or "info")
	else
		MessageEv:FireAllClients(text, kind or "info")
	end
end

local function playAt(parent, id, volume, pitch)
	local s = Instance.new("Sound")
	s.SoundId = id
	s.Volume = volume or 0.8
	s.PlaybackSpeed = pitch or 1
	s.RollOffMaxDistance = 90
	s.Parent = parent
	s:Play()
	task.delay(10, function()
		if s.Parent then s:Destroy() end
	end)
end

local function floorOfY(y)
	return Config.floorOfY(y)
end

local function partsOf(inst)
	local out = {}
	if inst:IsA("BasePart") then table.insert(out, inst) end
	for _, d in ipairs(inst:GetDescendants()) do
		if d:IsA("BasePart") then table.insert(out, d) end
	end
	return out
end

local function pivotOf(inst)
	if inst:IsA("BasePart") then return inst.Position end
	if inst:IsA("Model") then return inst:GetPivot().Position end
	return Vector3.zero
end

local function prompt(part, action, object, hold)
	local pp = Instance.new("ProximityPrompt")
	pp.ActionText = action
	pp.ObjectText = object
	pp.HoldDuration = hold or 0.4
	pp.MaxActivationDistance = 9
	pp.RequiresLineOfSight = false
	pp.Parent = part
	return pp
end

-- hide / restore a thing (map parts are never destroyed, so a round can be reset)
local original = {}
local function remember(inst)
	for _, p in ipairs(partsOf(inst)) do
		if not original[p] then
			original[p] = { cf = p.CFrame, tr = p.Transparency, col = p.CanCollide }
		end
	end
end
local function setHidden(inst, hidden)
	remember(inst)
	for _, p in ipairs(partsOf(inst)) do
		local o = original[p]
		p.CanCollide = if hidden then false else o.col
		p.Transparency = if hidden then 1 else o.tr
		for _, c in ipairs(p:GetChildren()) do
			if c:IsA("SurfaceGui") or c:IsA("BillboardGui") or c:IsA("Light") or c:IsA("ParticleEmitter") or c:IsA("ProximityPrompt") then
				c.Enabled = not hidden
			end
		end
	end
end
local function slideDownAndHide(inst)
	remember(inst)
	local parts = partsOf(inst)
	for _, p in ipairs(parts) do
		TS:Create(p, TweenInfo.new(1.2, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { CFrame = p.CFrame - Vector3.new(0, 9, 0) }):Play()
	end
	task.delay(1.25, function()
		setHidden(inst, true)
		for _, p in ipairs(parts) do p.CFrame = original[p].cf end
	end)
end

-- ---------------------------------------------------------------- state
local pstate = {}
local openedFloors = {}
local mainGateOpen = false
local roundStart = os.clock()
local resetting = false
local objectives = {}

local gatesByFloor = {}
local stairDoors = {}
local chains88 = {}
local cards = {}
local keyModel = nil
local mainGate = nil
local mainChains = {}
local spawnPads = {}
local hideZones = {}
local anchors = {}
local resetRound

local function landingCF(n)
	local f = Config.byN[n]
	return CFrame.new(70, f.base + 3.5, -11.5) * CFrame.Angles(0, math.rad(90), 0)
end

local function startCF()
	if #spawnPads == 0 then return landingCF(88) end
	local p = spawnPads[math.random(1, #spawnPads)]
	return p.CFrame + Vector3.new(0, 3.5, 0)
end

-- everyone alive on floor n (or everyone alive when n is nil)
local function alive(n)
	local out = {}
	for _, p in ipairs(Players:GetPlayers()) do
		local char = p.Character
		local hum = char and char:FindFirstChildOfClass("Humanoid")
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if hum and hrp and hum.Health > 0 then
			local f = floorOfY(hrp.Position.Y)
			if f == nil and hrp.Position.Y < Config.coreTop then f = "core" end
			if n == nil or f == n then
				table.insert(out, { player = p, char = char, hum = hum, hrp = hrp, floor = f })
			end
		end
	end
	return out
end

local function kill(char, cause)
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if hum and hum.Health > 0 then
		char:SetAttribute("DeathCause", cause)
		hum.Health = 0
	end
end

local function isHidden(player)
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then return false end
	for _, z in ipairs(hideZones) do
		local lp = z.CFrame:PointToObjectSpace(hrp.Position)
		local s = z.Size
		if math.abs(lp.X) <= s.X / 2 and math.abs(lp.Y) <= s.Y / 2 and math.abs(lp.Z) <= s.Z / 2 then return true end
	end
	return false
end

-- target: nil = everyone, a Player = that player, anything else = everyone on that floor
local function fx(target, ...)
	if target == nil then
		FxEv:FireAllClients(...)
	elseif typeof(target) == "Instance" then
		FxEv:FireClient(target, ...)
	else
		for _, e in ipairs(alive(target)) do FxEv:FireClient(e.player, ...) end
	end
end

local function setObjective(n, text)
	objectives[n] = text
	StateEv:FireAllClients("objective", n, text)
end

-- ---------------------------------------------------------------- floor objectives
local function openFloor(n, by)
	if openedFloors[n] then return end
	openedFloors[n] = true
	local f = Config.byN[n]
	for _, g in ipairs(gatesByFloor[n] or {}) do
		slideDownAndHide(g)
		playAt(if g:IsA("BasePart") then g else (g:FindFirstChildWhichIsA("BasePart", true) or workspace), "rbxasset://sounds/unsheath.wav", 1, 0.7)
	end
	if n == 88 then
		for _, c in ipairs(chains88) do setHidden(c, true) end
		local d = stairDoors[88]
		if d then
			for _, p in ipairs(partsOf(d)) do
				if p.Name ~= "FrameL" and p.Name ~= "FrameR" and p.Name ~= "FrameT" then setHidden(p, true) end
			end
			playAt(workspace, "rbxasset://sounds/snap.mp3", 1, 0.6)
		end
	end
	local who = if by then (by.DisplayName .. " · ") else ""
	say(nil, who .. (if f then f.label else tostring(n)) .. " 계단 창살이 열렸다", "key")
	StateEv:FireAllClients("floorOpened", n)
end

local function isOpen(n)
	return openedFloors[n] == true
end

local function setupFloorKeys()
	for _, inst in ipairs(workspace:GetDescendants()) do
		if inst:IsA("BasePart") and string.match(inst.Name, "^FloorKey_") then
			local n = tonumber(string.match(inst.Name, "^FloorKey_(%-?%d+)"))
			if n then cards[n] = inst end
		end
	end
	for n, anchor in pairs(cards) do
		local f = Config.byN[n]
		local card = Instance.new("Part")
		card.Name = "KeyCard_" .. n
		card.Size = Vector3.new(1.6, 0.08, 1.0)
		card.Material = Enum.Material.Neon
		card.Color = Color3.fromRGB(255, 210, 60)
		card.Anchored = true
		card.CanCollide = false
		card.CFrame = anchor.CFrame + Vector3.new(0, 1.2, 0)
		card.Parent = anchor
		local gui = Instance.new("SurfaceGui")
		gui.Face = Enum.NormalId.Top
		gui.LightInfluence = 0
		gui.Parent = card
		local tl = Instance.new("TextLabel")
		tl.Size = UDim2.fromScale(1, 1)
		tl.BackgroundTransparency = 1
		tl.TextScaled = true
		tl.Font = Enum.Font.GothamBlack
		tl.TextColor3 = Color3.fromRGB(40, 30, 10)
		tl.Text = "PSI " .. (if f then f.label else "")
		tl.Parent = gui
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(255, 210, 90)
		light.Range = 10
		light.Brightness = 1.2
		light.Parent = card
		local pp = prompt(card, "카드 줍기", (if f then f.label else "") .. " 출입 카드", 0.5)
		pp.MaxActivationDistance = if anchor.Size.X > 1.5 then 14 else 8
		pp.Triggered:Connect(function(player)
			if openedFloors[n] then return end
			playAt(card, "rbxasset://sounds/electronicpingshort.wav", 1, 1.2)
			setHidden(card, true)
			say(player, "출입 카드를 주웠다", "key")
			openFloor(n, player)
		end)
		task.spawn(function()
			local base = card.CFrame
			local t = 0
			while card.Parent do
				t += task.wait(0.1)
				if card.Transparency < 1 then
					card.CFrame = base * CFrame.new(0, math.sin(t * 2) * 0.25, 0) * CFrame.Angles(0, t * 1.2, 0)
				end
			end
		end)
	end
end

local function setupExitButtons()
	for _, b in ipairs(CS:GetTagged("ExitButton")) do
		if b:IsA("BasePart") then
			local n = floorOfY(b.Position.Y)
			local pp = prompt(b, "누르기", if n == 66 then "골인 버튼" else "주 전원 스위치", 0.8)
			pp.Triggered:Connect(function(player)
				if not n or openedFloors[n] then return end
				local ok, why = Floors.canPressExit(n)
				if not ok then
					say(player, why or "아직 누를 수 없다", "alert")
					playAt(b, "rbxasset://sounds/switch.wav", 0.8, 0.7)
					return
				end
				playAt(b, "rbxasset://sounds/button.wav", 1, 1)
				b.Color = Color3.fromRGB(60, 255, 120)
				openFloor(n, player)
				if n == 40 then
					-- power is back: the emergency lamps turn warm white
					for _, d in ipairs(workspace:GetDescendants()) do
						if d.Name == "EmergencyLamp" and d:IsA("BasePart") and math.abs(d.Position.Y - b.Position.Y) < 20 then
							d.Color = Color3.fromRGB(255, 240, 200)
							local lt = d:FindFirstChildWhichIsA("Light")
							if lt then
								lt.Color = Color3.fromRGB(255, 240, 200)
								lt.Brightness = 1.4
							end
						end
					end
				end
			end)
		end
	end
end

local function setupCoreKey()
	for _, k in ipairs(CS:GetTagged("Key")) do keyModel = k end
	if not keyModel then return end
	local anchorPart = keyModel:FindFirstChild("Shaft") or keyModel:FindFirstChildWhichIsA("BasePart", true)
	if not anchorPart then return end
	local pp = prompt(anchorPart, "열쇠 줍기", "정문 열쇠", 1.0)
	pp.MaxActivationDistance = 10
	pp.Triggered:Connect(function(player)
		local st = pstate[player]
		if not st then return end
		for _, s in pairs(pstate) do
			if s.hasMainKey then
				say(player, "열쇠는 이미 누군가 가지고 있다", "alert")
				return
			end
		end
		st.hasMainKey = true
		setHidden(keyModel, true)
		playAt(anchorPart, "rbxasset://sounds/victory.wav", 1, 1.1)
		say(nil, player.DisplayName .. " · 정문 열쇠를 손에 넣었다!", "key")
		StateEv:FireClient(player, "hasMainKey", true)
		task.delay(1.5, function()
			local char = player.Character
			if not char then return end
			local f1 = Config.byN[1]
			local cf = CFrame.new(0, f1.base + 3.5, -24) * CFrame.Angles(0, math.rad(180), 0)
			pcall(function() player:RequestStreamAroundAsync(cf.Position, 2) end)
			char:PivotTo(cf)
			st.respawn = cf
			-- finale: she is waiting in the lobby
			fx(player, "banner", "열쇠를 쥐자 땅이 뒤집힌다… 1층 로비다. 뒤에서 발소리가 난다", 4, "alert")
			say(nil, "정문 열쇠가 1층에 올라왔다. 조수민이 로비에 나타났다!", "alert")
			Chaser.summon(1, Vector3.new(0, f1.base + 3.5, 20), nil, 3)
		end)
	end)
end

local function winRound(by)
	if mainGateOpen then return end
	mainGateOpen = true
	if mainGate then setHidden(mainGate, true) end
	for _, c in ipairs(mainChains) do setHidden(c, true) end
	Chaser.clearSummoned()
	playAt(workspace, "rbxasset://sounds/victory.wav", 1, 0.9)
	local elapsed = os.clock() - roundStart
	for _, p in ipairs(Players:GetPlayers()) do
		local st = pstate[p]
		if st then
			st.escaped = true
			local ls = p:FindFirstChild("leaderstats")
			local esc = ls and ls:FindFirstChild("탈출")
			if esc then esc.Value += 1 end
			local best = ls and ls:FindFirstChild("최고기록(초)")
			if best and (best.Value == 0 or elapsed < best.Value) then best.Value = math.floor(elapsed) end
		end
	end
	WinEv:FireAllClients(by.DisplayName, math.floor(elapsed))
	say(nil, by.DisplayName .. " 이(가) 정문을 열었다! 모두 탈출 성공 — 30초 뒤 처음부터 다시 시작", "win")
	task.delay(30, function() resetRound() end)
end

local function setupMainGate()
	for _, g in ipairs(CS:GetTagged("MainGate")) do
		if g:IsA("BasePart") then mainGate = g end
	end
	for _, c in ipairs(CS:GetTagged("MainChains")) do table.insert(mainChains, c) end
	for _, k in ipairs(CS:GetTagged("KeySlot")) do
		if k:IsA("BasePart") then
			local pp = prompt(k, "열쇠 꽂기", "정문 열쇠 구멍", 1.2)
			pp.MaxActivationDistance = 11
			pp.Triggered:Connect(function(player)
				local st = pstate[player]
				if not st then return end
				if not st.hasMainKey then
					say(player, "열쇠가 없다. 지하 어딘가… 아주 깊은 곳에 있다", "alert")
					playAt(k, "rbxasset://sounds/switch.wav", 0.8, 0.8)
					return
				end
				playAt(k, "rbxasset://sounds/snap.mp3", 1, 1)
				winRound(player)
			end)
		end
	end
end

local function setupGatesAndDoors()
	for _, g in ipairs(CS:GetTagged("ExitGate")) do
		local n = floorOfY(pivotOf(g).Y)
		if n then
			gatesByFloor[n] = gatesByFloor[n] or {}
			table.insert(gatesByFloor[n], g)
			remember(g)
		end
	end
	for _, d in ipairs(CS:GetTagged("StairDoor")) do
		local n = floorOfY(pivotOf(d).Y)
		if n then
			stairDoors[n] = d
			remember(d)
		end
	end
	for _, c in ipairs(CS:GetTagged("LockedChains")) do
		table.insert(chains88, c)
		remember(c)
	end
	for _, z in ipairs(CS:GetTagged("HideSpot")) do
		if z:IsA("BasePart") then table.insert(hideZones, z) end
	end
end

-- GP_<Kind>_<i> anchors placed by the map generator, grouped by floor
local function indexAnchors()
	for _, inst in ipairs(workspace:GetDescendants()) do
		if inst:IsA("BasePart") then
			local kind, idx = string.match(inst.Name, "^GP_(%a+)_(%d+)$")
			if kind then
				local n = floorOfY(inst.Position.Y)
				if n == nil and inst.Position.Y < Config.coreTop then n = "core" end
				if n ~= nil then
					anchors[n] = anchors[n] or {}
					anchors[n][kind] = anchors[n][kind] or {}
					table.insert(anchors[n][kind], { i = tonumber(idx), part = inst })
				end
			end
		end
	end
	for _, kinds in pairs(anchors) do
		for kind, list in pairs(kinds) do
			table.sort(list, function(a, b) return a.i < b.i end)
			local flat = {}
			for _, e in ipairs(list) do table.insert(flat, e.part) end
			kinds[kind] = flat
		end
	end
end

local function anchorsOf(n, kind)
	local k = anchors[n]
	return (k and k[kind]) or {}
end

local function setupKillAndCheckpoints()
	local function killer(part, cause)
		part.Touched:Connect(function(hit)
			local char = hit.Parent
			if char and char:FindFirstChildOfClass("Humanoid") and Players:GetPlayerFromCharacter(char) then
				kill(char, cause)
			end
		end)
	end
	for _, k in ipairs(CS:GetTagged("KillBrick")) do
		for _, p in ipairs(partsOf(k)) do
			local n = floorOfY(p.Position.Y)
			killer(p, if n == 66 then "jjajang" else "magma")
		end
	end
	for _, c in ipairs(CS:GetTagged("Checkpoint")) do
		if c:IsA("BasePart") then
			c.Touched:Connect(function(hit)
				local player = Players:GetPlayerFromCharacter(hit.Parent)
				local st = player and pstate[player]
				if st and (st.respawn.Position - (c.Position + Vector3.new(0, 3, 0))).Magnitude > 0.5 then
					st.respawn = CFrame.new(c.Position + Vector3.new(0, 3, 0))
					say(player, "체크포인트", "info")
					playAt(c, "rbxasset://sounds/electronicpingshort.wav", 0.6, 1.6)
				end
			end)
		end
	end
end

-- ---------------------------------------------------------------- players
local SCARE = { chaser = true, zzuk = true, rush = true, patient = true, berry = true, mannequin = true, redlight = true, festival = true }
local DEATH_TEXT = {
	jjajang = "짜장에 빠졌다… 체크포인트로",
	magma = "내핵에 녹았다…",
	debris = "천장 잔해에 깔렸다. 바닥의 빨간 원을 피해라",
	mandu = "군만두에 맞았다. 바닥의 빨간 원을 피해라",
	geyser = "용암 기둥에 맞았다. 빨간 원이 보이면 비켜라",
}
local DEATH_NAME = { chaser = "조수민", redlight = "조수민", zzuk = "쭉쭉이", rush = "에스키모", patient = "레전드 환자", berry = "베리",
	mannequin = "마네킹", festival = "피의 축제" }

local function spawnPlayer(player, cf)
	pcall(function() player:RequestStreamAroundAsync(cf.Position, 3) end)
	player:LoadCharacter()
	local char = player.Character or player.CharacterAdded:Wait()
	local hrp = char:WaitForChild("HumanoidRootPart", 5)
	if hrp then
		task.wait()
		char:PivotTo(cf)
	end
	local hum = char:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.Died:Once(function()
			local st = pstate[player]
			if not st then return end
			st.deaths += 1
			local cause = char:GetAttribute("DeathCause") or "fall"
			if SCARE[cause] then
				CaughtEv:FireClient(player, cause)
				for _, o in ipairs(Players:GetPlayers()) do
					if o ~= player then say(o, player.DisplayName .. " 이(가) " .. (DEATH_NAME[cause] or "무언가") .. "에게 당했다", "alert") end
				end
			elseif DEATH_TEXT[cause] then
				say(player, DEATH_TEXT[cause], "alert")
			end
			task.wait(if SCARE[cause] then 4.5 else 2.5)
			if player.Parent and not resetting then spawnPlayer(player, st.respawn) end
		end)
	end
end

local function onPlayerAdded(player)
	local ls = Instance.new("Folder")
	ls.Name = "leaderstats"
	ls.Parent = player
	local esc = Instance.new("IntValue")
	esc.Name = "탈출"
	esc.Parent = ls
	local best = Instance.new("IntValue")
	best.Name = "최고기록(초)"
	best.Parent = ls
	pstate[player] = { respawn = startCF(), hasMainKey = false, escaped = false, deaths = 0 }
	task.wait(0.5)
	spawnPlayer(player, pstate[player].respawn)
	say(player, "88층 공유 하우스. 현관 도어락 암호는 집 안 쪽지 4장에 흩어져 있다", "info")
	for n in pairs(openedFloors) do StateEv:FireClient(player, "floorOpened", n) end
	for n, text in pairs(objectives) do StateEv:FireClient(player, "objective", n, text) end
end

Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(function(p) pstate[p] = nil end)

-- arriving at a floor's stair landing moves the respawn point there
task.spawn(function()
	local last = {}
	while true do
		task.wait(0.5)
		for _, p in ipairs(Players:GetPlayers()) do
			local st = pstate[p]
			local char = p.Character
			local hrp = char and char:FindFirstChild("HumanoidRootPart")
			if st and hrp then
				local pos = hrp.Position
				local n = floorOfY(pos.Y)
				if n and pos.X > 61 and pos.X < 79 and math.abs(pos.Z) < 16.5 and last[p] ~= n then
					last[p] = n
					st.respawn = landingCF(n)
				end
			end
		end
	end
end)

resetRound = function()
	if resetting then return end
	resetting = true
	say(nil, "새 라운드. 88층으로 돌아간다", "info")
	openedFloors = {}
	objectives = {}
	mainGateOpen = false
	for p, o in pairs(original) do
		if p.Parent then
			p.CFrame = o.cf
			p.Transparency = o.tr
			p.CanCollide = o.col
			for _, c in ipairs(p:GetChildren()) do
				if c:IsA("SurfaceGui") or c:IsA("BillboardGui") or c:IsA("Light") or c:IsA("ParticleEmitter") or c:IsA("ProximityPrompt") then
					c.Enabled = true
				end
			end
		end
	end
	for _, b in ipairs(CS:GetTagged("ExitButton")) do
		if b:IsA("BasePart") then b.Color = Color3.fromRGB(224, 32, 32) end
	end
	roundStart = os.clock()
	Chaser.resetAll()
	Zzuk.reset()
	Floors.reset()
	Doors.reset()
	for _, p in ipairs(Players:GetPlayers()) do
		local st = pstate[p]
		if st then
			st.respawn = startCF()
			st.hasMainKey = false
			st.escaped = false
			StateEv:FireClient(p, "hasMainKey", false)
			StateEv:FireClient(p, "reset", 0)
			task.spawn(spawnPlayer, p, st.respawn)
		end
	end
	task.wait(1)
	resetting = false
end

RestartEv.OnServerEvent:Connect(function(player)
	if not pstate[player] or resetting then return end
	kill(player.Character, "reset")
end)

InputEv.OnServerEvent:Connect(function(player, kind, a, b)
	if not pstate[player] or type(kind) ~= "string" then return end
	local ok, err = pcall(Floors.onInput, player, kind, a, b)
	if not ok then warn("[PSI] input:", err) end
end)

-- ---------------------------------------------------------------- boot
for _, s in ipairs(CS:GetTagged("PlayerSpawn")) do
	if s:IsA("BasePart") then table.insert(spawnPads, s) end
end
setupGatesAndDoors()
indexAnchors()
setupFloorKeys()
setupExitButtons()
setupCoreKey()
setupMainGate()
setupKillAndCheckpoints()

local ctx = {
	say = say, playAt = playAt, floorOfY = floorOfY, alive = alive, kill = kill, isHidden = isHidden, fx = fx,
	openFloor = openFloor, isOpen = isOpen, setObjective = setObjective, anchors = anchorsOf, prompt = prompt,
	setHidden = setHidden, remember = remember,
}

local okDoors, errDoors = pcall(Doors.start, ctx)
if not okDoors then warn("[PSI] Doors.start 실패:", errDoors) end
ctx.openDoorsNear = Doors.openNear
Chaser.start(ctx)
Zzuk.start(ctx)
ctx.Chaser = Chaser
ctx.Zzuk = Zzuk
local okFloors, errFloors = pcall(Floors.start, ctx)
if not okFloors then warn("[PSI] Floors.start 실패:", errFloors) end

for _, p in ipairs(Players:GetPlayers()) do task.spawn(onPlayerAdded, p) end
print("[PSI] 게임 서버 준비 완료")
