--!nonstrict
-- PSI 88층 탈출 · 서버 메인
-- 맵의 태그(CollectionService)만 보고 게임 장치를 붙인다. 맵을 다시 생성해도 그대로 동작한다.

local Players = game:GetService("Players")
local CS = game:GetService("CollectionService")
local RS = game:GetService("ReplicatedStorage")
local TS = game:GetService("TweenService")
local SSS = game:GetService("ServerScriptService")

local Config = require(RS:WaitForChild("Config"))
local Remotes = RS:WaitForChild("Remotes")
local MessageEv = Remotes:WaitForChild("Message") :: RemoteEvent
local CaughtEv = Remotes:WaitForChild("Caught") :: RemoteEvent
local StateEv = Remotes:WaitForChild("State") :: RemoteEvent
local WinEv = Remotes:WaitForChild("Win") :: RemoteEvent
local RestartEv = Remotes:WaitForChild("Restart") :: RemoteEvent

local Chaser = require(SSS:WaitForChild("Chaser"))
local Zzuk = require(SSS:WaitForChild("ZzukZzuk"))

Players.CharacterAutoLoads = false

-- ---------------------------------------------------------------- helpers
local function say(player: Player?, text: string, kind: string?)
	if player then
		MessageEv:FireClient(player, text, kind or "info")
	else
		MessageEv:FireAllClients(text, kind or "info")
	end
end

local function playAt(parent: Instance, id: string, volume: number?, pitch: number?)
	local s = Instance.new("Sound")
	s.SoundId = id
	s.Volume = volume or 0.8
	s.PlaybackSpeed = pitch or 1
	s.RollOffMaxDistance = 90
	s.Parent = parent
	s:Play()
	s.Ended:Once(function() s:Destroy() end)
	task.delay(12, function() if s.Parent then s:Destroy() end end)
end

local function floorOfY(y: number)
	return Config.floorOfY(y)
end

local function partsOf(inst: Instance): { BasePart }
	local out = {}
	if inst:IsA("BasePart") then table.insert(out, inst) end
	for _, d in ipairs(inst:GetDescendants()) do
		if d:IsA("BasePart") then table.insert(out, d) end
	end
	return out
end

local function pivotOf(inst: Instance): Vector3
	if inst:IsA("BasePart") then return inst.Position end
	if inst:IsA("Model") then return inst:GetPivot().Position end
	return Vector3.zero
end

local function prompt(part: BasePart, action: string, object: string, hold: number?): ProximityPrompt
	local pp = Instance.new("ProximityPrompt")
	pp.ActionText = action
	pp.ObjectText = object
	pp.HoldDuration = hold or 0.4
	pp.MaxActivationDistance = 9
	pp.RequiresLineOfSight = false
	pp.Parent = part
	return pp
end

-- hide / restore a thing (we never destroy map parts so a round can be reset)
local original: { [BasePart]: { cf: CFrame, tr: number, col: boolean } } = {}
local function remember(inst: Instance)
	for _, p in ipairs(partsOf(inst)) do
		if not original[p] then
			original[p] = { cf = p.CFrame, tr = p.Transparency, col = p.CanCollide }
		end
	end
end
local function setHidden(inst: Instance, hidden: boolean)
	remember(inst)
	for _, p in ipairs(partsOf(inst)) do
		local o = original[p]
		p.CanCollide = if hidden then false else o.col
		p.Transparency = if hidden then 1 else o.tr
		p.CanTouch = not hidden
		for _, c in ipairs(p:GetChildren()) do
			if c:IsA("SurfaceGui") or c:IsA("Light") or c:IsA("ParticleEmitter") then c.Enabled = not hidden end
		end
	end
end
local function slideDownAndHide(inst: Instance)
	remember(inst)
	local parts = partsOf(inst)
	for _, p in ipairs(parts) do
		TS:Create(p, TweenInfo.new(1.2, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { CFrame = p.CFrame - Vector3.new(0, 9, 0) }):Play()
	end
	task.delay(1.2, function()
		setHidden(inst, true)
		for _, p in ipairs(parts) do p.CFrame = original[p].cf end
	end)
end

-- ---------------------------------------------------------------- state
type PState = { respawn: CFrame, hasMainKey: boolean, escaped: boolean, deaths: number }
local pstate: { [Player]: PState } = {}
local openedFloors: { [number]: boolean } = {}
local aptUnlocked = false
local mainGateOpen = false
local roundStart = os.clock()
local resetting = false

local gatesByFloor: { [number]: { Instance } } = {}
local stairDoors: { [number]: Instance } = {}
local chains88: { Instance } = {}
local cards: { [number]: BasePart } = {}
local keyModel: Instance? = nil
local mainGate: BasePart? = nil
local mainChains: { Instance } = {}
local spawnPads: { BasePart } = {}

local function landingCF(n: number): CFrame
	local f = Config.byN[n]
	return CFrame.new(70, f.base + 3.5, -11.5) * CFrame.Angles(0, math.rad(90), 0)
end

local function startCF(): CFrame
	if #spawnPads == 0 then return landingCF(88) end
	local p = spawnPads[math.random(1, #spawnPads)]
	return p.CFrame + Vector3.new(0, 3.5, 0)
end

-- ---------------------------------------------------------------- floor objectives
local function openFloor(n: number, by: Player?)
	if openedFloors[n] then return end
	openedFloors[n] = true
	local f = Config.byN[n]
	for _, g in ipairs(gatesByFloor[n] or {}) do
		slideDownAndHide(g)
		playAt(g:IsA("BasePart") and g or (g:FindFirstChildWhichIsA("BasePart") or workspace), "rbxasset://sounds/unsheath.wav", 1, 0.7)
	end
	if n == 88 then
		aptUnlocked = true
		for _, c in ipairs(chains88) do setHidden(c, true) end
		local d = stairDoors[88]
		if d then
			for _, p in ipairs(partsOf(d)) do
				if p.Name ~= "FrameL" and p.Name ~= "FrameR" and p.Name ~= "FrameT" then setHidden(p, true) end
			end
			playAt(workspace, "rbxasset://sounds/snap.mp3", 1, 0.6)
		end
	end
	local who = by and (by.DisplayName .. " · ") or ""
	say(nil, who .. (f and f.label or tostring(n)) .. " 계단 창살이 열렸다", "key")
	StateEv:FireAllClients("floorOpened", n)
end

local function setupFloorKeys()
	for _, inst in ipairs(workspace:GetDescendants()) do
		if inst:IsA("BasePart") and inst.Name:match("^FloorKey_") then
			local n = tonumber(inst.Name:match("^FloorKey_(%-?%d+)"))
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
		gui.PixelsPerStud = 60
		gui.Parent = card
		local tl = Instance.new("TextLabel")
		tl.Size = UDim2.fromScale(1, 1)
		tl.BackgroundTransparency = 1
		tl.TextScaled = true
		tl.Font = Enum.Font.GothamBlack
		tl.TextColor3 = Color3.fromRGB(40, 30, 10)
		tl.Text = "PSI " .. (f and f.label or "")
		tl.Parent = gui
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(255, 210, 90)
		light.Range = 10
		light.Brightness = 1.2
		light.Parent = card
		local pp = prompt(card, "카드 줍기", (f and f.label or "") .. " 출입 카드", 0.5)
		pp.MaxActivationDistance = 7
		pp.Triggered:Connect(function(player)
			if openedFloors[n] then return end
			playAt(card, "rbxasset://sounds/electronicpingshort.wav", 1, 1.2)
			setHidden(card, true)
			pp.Enabled = false
			say(player, "출입 카드를 주웠다", "key")
			openFloor(n, player)
		end)
		-- hover
		task.spawn(function()
			local base = card.CFrame
			local t = 0
			while card.Parent do
				t += task.wait(0.05)
				card.CFrame = base * CFrame.new(0, math.sin(t * 2) * 0.25, 0) * CFrame.Angles(0, t * 1.2, 0)
			end
		end)
	end
end

local function setupAptKey()
	local anchor = workspace:FindFirstChild("AptKey", true)
	if not anchor or not anchor:IsA("BasePart") then return end
	local key = Instance.new("Part")
	key.Name = "AptKeyVisual"
	key.Size = Vector3.new(0.3, 1.2, 0.3)
	key.Material = Enum.Material.Neon
	key.Color = Color3.fromRGB(230, 190, 80)
	key.Anchored = true
	key.CanCollide = false
	key.CFrame = anchor.CFrame + Vector3.new(0, 1.2, 0)
	key.Parent = anchor
	local l = Instance.new("PointLight"); l.Color = key.Color; l.Range = 8; l.Parent = key
	local pp = prompt(key, "열쇠 줍기", "현관문 열쇠", 0.5)
	pp.Triggered:Connect(function(player)
		if aptUnlocked then return end
		playAt(key, "rbxasset://sounds/electronicpingshort.wav", 1, 1.4)
		setHidden(key, true)
		pp.Enabled = false
		say(nil, player.DisplayName .. " · 현관문 열쇠를 찾았다! 쇠사슬이 풀린다", "key")
		openFloor(88, player)
	end)
	task.spawn(function()
		local base = key.CFrame
		local t = 0
		while key.Parent do
			t += task.wait(0.05)
			key.CFrame = base * CFrame.new(0, math.sin(t * 2) * 0.2, 0) * CFrame.Angles(0, t * 1.5, 0)
		end
	end)
end

local function setupExitButtons()
	for _, b in ipairs(CS:GetTagged("ExitButton")) do
		if b:IsA("BasePart") then
			local n = floorOfY(b.Position.Y)
			local pp = prompt(b, "누르기", if n == 66 then "골인 버튼" else "전원 복구", 0.8)
			pp.Triggered:Connect(function(player)
				if not n or openedFloors[n] then return end
				playAt(b, "rbxasset://sounds/button.wav", 1, 1)
				b.Color = Color3.fromRGB(60, 255, 120)
				openFloor(n, player)
				if n == 40 then
					-- power is back: brighten the emergency lamps a little
					for _, d in ipairs(workspace:GetDescendants()) do
						if d.Name == "EmergencyLamp" and d:IsA("BasePart") and math.abs(d.Position.Y - b.Position.Y) < 20 then
							d.Color = Color3.fromRGB(255, 240, 200)
							local lt = d:FindFirstChildWhichIsA("Light")
							if lt then lt.Color = Color3.fromRGB(255, 240, 200); lt.Brightness = 1.4 end
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
	local anchorPart = keyModel:FindFirstChild("Shaft") or keyModel:FindFirstChildWhichIsA("BasePart")
	if not anchorPart then return end
	local pp = prompt(anchorPart :: BasePart, "열쇠 줍기", "정문 열쇠", 1.0)
	pp.MaxActivationDistance = 10
	pp.Triggered:Connect(function(player)
		local st = pstate[player]
		if not st then return end
		local anyHolder = false
		for _, s in pairs(pstate) do if s.hasMainKey then anyHolder = true end end
		if anyHolder then say(player, "열쇠는 이미 누군가 가지고 있다", "alert"); return end
		st.hasMainKey = true
		setHidden(keyModel :: Instance, true)
		playAt(anchorPart, "rbxasset://sounds/victory.wav", 1, 1.1)
		say(nil, player.DisplayName .. " · 정문 열쇠를 손에 넣었다!", "key")
		StateEv:FireClient(player, "hasMainKey", true)
		task.delay(1.5, function()
			local char = player.Character
			if not char then return end
			say(player, "열쇠를 쥐자 땅이 뒤집힌다… 1층 로비다", "alert")
			local f1 = Config.byN[1]
			local cf = CFrame.new(0, f1.base + 3.5, -30) * CFrame.Angles(0, math.rad(180), 0)
			pcall(function() player:RequestStreamAroundAsync(cf.Position, 2) end)
			char:PivotTo(cf)
			st.respawn = cf
		end)
	end)
end

local function winRound(by: Player)
	if mainGateOpen then return end
	mainGateOpen = true
	if mainGate then setHidden(mainGate, true) end
	for _, c in ipairs(mainChains) do setHidden(c, true) end
	playAt(workspace, "rbxasset://sounds/victory.wav", 1, 0.9)
	local elapsed = os.clock() - roundStart
	for _, p in ipairs(Players:GetPlayers()) do
		local st = pstate[p]
		if st then
			st.escaped = true
			local ls = p:FindFirstChild("leaderstats")
			if ls and ls:FindFirstChild("탈출") then (ls["탈출"] :: IntValue).Value += 1 end
			local best = ls and ls:FindFirstChild("최고기록(초)")
			if best then
				local bv = best :: IntValue
				if bv.Value == 0 or elapsed < bv.Value then bv.Value = math.floor(elapsed) end
			end
		end
	end
	WinEv:FireAllClients(by.DisplayName, math.floor(elapsed))
	say(nil, by.DisplayName .. " 이(가) 정문을 열었다! 모두 탈출 성공 — 30초 뒤 처음부터 다시 시작", "win")
	task.delay(30, function() resetRound() end)
end

local function setupMainGate()
	for _, g in ipairs(CS:GetTagged("MainGate")) do if g:IsA("BasePart") then mainGate = g end end
	for _, k in ipairs(CS:GetTagged("KeySlot")) do
		if k:IsA("BasePart") then
			local pp = prompt(k, "열쇠 꽂기", "정문 열쇠 구멍", 1.2)
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
	if mainGate and mainGate.Parent then
		for _, c in ipairs(mainGate.Parent:GetChildren()) do
			if c.Name == "Chains" then table.insert(mainChains, c) end
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
		if n then stairDoors[n] = d; remember(d) end
	end
	for _, c in ipairs(CS:GetTagged("LockedChains")) do table.insert(chains88, c); remember(c) end
end

local function setupKillAndCheckpoints()
	local function killer(part: BasePart, cause: string)
		part.Touched:Connect(function(hit)
			local char = hit.Parent
			local hum = char and char:FindFirstChildOfClass("Humanoid")
			if hum and hum.Health > 0 then
				char:SetAttribute("DeathCause", cause)
				hum.Health = 0
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
				if st and st.respawn.Position ~= c.Position + Vector3.new(0, 3, 0) then
					st.respawn = CFrame.new(c.Position + Vector3.new(0, 3, 0))
					say(player, "체크포인트", "info")
					playAt(c, "rbxasset://sounds/electronicpingshort.wav", 0.6, 1.6)
				end
			end)
		end
	end
end

-- ---------------------------------------------------------------- players
local function spawnPlayer(player: Player, cf: CFrame)
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
		hum.WalkSpeed = 16
		hum.Died:Once(function()
			local st = pstate[player]
			if not st then return end
			st.deaths += 1
			local cause = char:GetAttribute("DeathCause") or "fall"
			if cause == "chaser" or cause == "zzuk" then
				CaughtEv:FireClient(player, cause)
				for _, o in ipairs(Players:GetPlayers()) do
					if o ~= player then say(o, player.DisplayName .. " 이(가) " .. (if cause == "zzuk" then "쭉쭉이" else "조수민") .. "에게 잡혔다", "alert") end
				end
			elseif cause == "jjajang" then
				say(player, "짜장에 빠졌다… 체크포인트로", "alert")
			elseif cause == "magma" then
				say(player, "내핵에 녹았다…", "alert")
			end
			task.wait(if cause == "chaser" or cause == "zzuk" then 4.5 else 2.5)
			if player.Parent and not resetting then spawnPlayer(player, st.respawn) end
		end)
	end
end

local function onPlayerAdded(player: Player)
	local ls = Instance.new("Folder"); ls.Name = "leaderstats"; ls.Parent = player
	local esc = Instance.new("IntValue"); esc.Name = "탈출"; esc.Parent = ls
	local best = Instance.new("IntValue"); best.Name = "최고기록(초)"; best.Parent = ls
	pstate[player] = { respawn = startCF(), hasMainKey = false, escaped = false, deaths = 0 }
	task.wait(0.5)
	spawnPlayer(player, pstate[player].respawn)
	say(player, "88층 공유 하우스. 현관은 쇠사슬로 잠겨 있다. 집 어딘가에 열쇠가 있다", "info")
	-- tell the newcomer which floors are already open
	for n in pairs(openedFloors) do StateEv:FireClient(player, "floorOpened", n) end
end

Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(function(p) pstate[p] = nil end)

-- floor-change tracking: arriving at a floor's stair landing sets the respawn there
task.spawn(function()
	local last: { [Player]: number? } = {}
	while true do
		task.wait(0.5)
		for _, p in ipairs(Players:GetPlayers()) do
			local st = pstate[p]
			local char = p.Character
			local hrp = char and char:FindFirstChild("HumanoidRootPart")
			if st and hrp and hrp:IsA("BasePart") then
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

function resetRound()
	resetting = true
	say(nil, "새 라운드. 88층으로 돌아간다", "info")
	openedFloors = {}
	aptUnlocked = false
	mainGateOpen = false
	for p, o in pairs(original) do
		p.CFrame = o.cf; p.Transparency = o.tr; p.CanCollide = o.col; p.CanTouch = true
		for _, c in ipairs(p:GetChildren()) do
			if c:IsA("SurfaceGui") or c:IsA("Light") or c:IsA("ParticleEmitter") then c.Enabled = true end
		end
	end
	for _, d in ipairs(workspace:GetDescendants()) do
		if d:IsA("ProximityPrompt") then d.Enabled = true end
		if d:IsA("BasePart") and (d.Name:match("^KeyCard_") or d.Name == "AptKeyVisual") then setHidden(d, false) end
	end
	for _, b in ipairs(CS:GetTagged("ExitButton")) do if b:IsA("BasePart") then b.Color = Color3.fromRGB(224, 32, 32) end end
	roundStart = os.clock()
	Chaser.resetAll()
	Zzuk.reset()
	for _, p in ipairs(Players:GetPlayers()) do
		local st = pstate[p]
		if st then
			st.respawn = startCF(); st.hasMainKey = false; st.escaped = false
			StateEv:FireClient(p, "hasMainKey", false)
			StateEv:FireClient(p, "reset", 0)
			task.spawn(spawnPlayer, p, st.respawn)
		end
	end
	task.wait(1)
	resetting = false
end

RestartEv.OnServerEvent:Connect(function(player)
	local st = pstate[player]
	if not st or resetting then return end
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if hum and hum.Health > 0 then
		char:SetAttribute("DeathCause", "reset")
		hum.Health = 0
	end
end)

-- ---------------------------------------------------------------- boot
for _, s in ipairs(CS:GetTagged("PlayerSpawn")) do if s:IsA("BasePart") then table.insert(spawnPads, s) end end
setupGatesAndDoors()
setupFloorKeys()
setupAptKey()
setupExitButtons()
setupCoreKey()
setupMainGate()
setupKillAndCheckpoints()

Chaser.start({
	say = say,
	playAt = playAt,
	floorOfY = floorOfY,
})
Zzuk.start({ say = say, playAt = playAt, floorOfY = floorOfY })

for _, p in ipairs(Players:GetPlayers()) do task.spawn(onPlayerAdded, p) end
print("[PSI] 게임 서버 준비 완료 · 열린 층:", 0, "· 카드:", (function() local c = 0 for _ in pairs(cards) do c += 1 end return c end)())
