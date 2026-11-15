--!nonstrict
-- 층별 놀이. 층마다 다른 규칙으로 계단 창살을 연다.
--   88 도어락 암호(쪽지 4장) · 87 낙석 + 에스키모 망치 · 80 레이저 + 기밀 상자 · 77 쭉쭉이 + 정전
--   70 모니터 색 암호 · 66 점프맵 + 군만두 · 60 식권 + 에스키모 돌진 · 50 무궁화 꽃이 피었습니다
--   44 피의 축제 타일 파티 · 40 정전 미로 차단기 3개 · 30 출발대 순서 · 20 불빛 따라 밟기
--   10 낮잠 자는 조수민 · 8 결재 받아오기 · B1 마네킹 + 넥타이 · B2 해바라기씨 · B3 베리의 시선
--   B6~B12 병원: 번호표, 차단기, 제세동기, 조수민, 환자 마네킹, 차트 암호, 차단기 · 내핵 용암 기둥
-- 장치의 위치는 맵 생성기가 놓은 GP_<종류>_<번호> 앵커에서 읽는다.

local RS = game:GetService("ReplicatedStorage")
local TS = game:GetService("TweenService")
local Config = require(RS:WaitForChild("Config"))

local M = {}
local ctx = nil
local folder = nil
local resets = {}
local keypads = {}
local timings = {}
local exitLocks = {}
local dark = {}
local spinners = {}

local RED = Color3.fromRGB(255, 50, 50)
local GREEN = Color3.fromRGB(70, 230, 120)
local YELLOW = Color3.fromRGB(255, 210, 60)
local BLUE = Color3.fromRGB(70, 140, 255)
local WHITE = Color3.fromRGB(245, 245, 240)
local PAPER = Color3.fromRGB(245, 240, 220)
local STEEL = Color3.fromRGB(70, 74, 82)
local SND_PING = "rbxasset://sounds/electronicpingshort.wav"
local SND_SWITCH = "rbxasset://sounds/switch.wav"
local SND_BUZZ = "rbxasset://sounds/bass.wav"
local SND_SCARE = "rbxasset://sounds/HalloweenGhost.wav"
local SND_THUNDER = "rbxasset://sounds/HalloweenThunder.wav"
local SND_CRASH = "rbxasset://sounds/collide.wav"
local SND_PAGE = "rbxasset://sounds/pageturn.wav"

-- ---------------------------------------------------------------- kit
local function baseOf(n)
	if n == "core" then return Config.coreTop end
	return Config.byN[n].base
end

local function at(n, x, y, z)
	return Vector3.new(x, baseOf(n) + y, z)
end

local function part(props)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Material = Enum.Material.SmoothPlastic
	for k, v in pairs(props) do p[k] = v end
	if p.Parent == nil then p.Parent = folder end
	return p
end

-- a detail part welded onto `parent`, so it follows when the parent is moved or spun
local function attach(parent, props)
	props.Anchored = false
	props.Massless = true
	props.Parent = parent
	local p = part(props)
	local w = Instance.new("WeldConstraint")
	w.Part0 = parent
	w.Part1 = p
	w.Parent = p
	return p
end

local function hrpOf(player)
	local char = player.Character
	return (char and char:FindFirstChild("HumanoidRootPart")) or workspace
end

local function glow(p, color, range, brightness)
	local l = Instance.new("PointLight")
	l.Color = color
	l.Range = range or 8
	l.Brightness = brightness or 0.8
	l.Parent = p
	return l
end

local function surface(p, face, text, fg, bg)
	local g = Instance.new("SurfaceGui")
	g.Face = face
	g.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	g.PixelsPerStud = 40
	g.LightInfluence = 0
	g.Parent = p
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundColor3 = bg or Color3.new(0, 0, 0)
	t.BackgroundTransparency = if bg then 0 else 1
	t.TextColor3 = fg or WHITE
	t.TextScaled = true
	t.Font = Enum.Font.GothamBlack
	t.Text = text
	t.Parent = g
	return t
end

-- text on both big faces, so it reads whichever way the anchor happens to point
local function surface2(p, text, fg, bg)
	return { surface(p, Enum.NormalId.Front, text, fg, bg), surface(p, Enum.NormalId.Back, text, fg, bg) }
end

local function setTexts(labels, text, fg, bg)
	for _, t in ipairs(labels) do
		t.Text = text
		if fg then t.TextColor3 = fg end
		if bg then t.BackgroundColor3 = bg end
	end
end

local function billboard(p, text, color, w, h, dist)
	local g = Instance.new("BillboardGui")
	g.Size = UDim2.fromScale(w or 6, h or 1.4)
	g.StudsOffset = Vector3.new(0, 2.2, 0)
	g.MaxDistance = dist or 40
	g.LightInfluence = 0
	g.Parent = p
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.TextColor3 = color or WHITE
	t.TextStrokeTransparency = 0.2
	t.TextScaled = true
	t.Font = Enum.Font.GothamBlack
	t.Text = text
	t.Parent = g
	return t
end

-- a loop that survives its own errors
local function every(dt, fn)
	task.spawn(function()
		while true do
			local ok, err = pcall(fn, dt)
			if not ok then warn("[Floors]", err) end
			task.wait(dt)
		end
	end)
end

local function spin(n, p, bob)
	table.insert(spinners, { n = n, part = p, cf = p.CFrame, bob = bob or 0.25 })
end

local function inZone(z, pos)
	return pos.X >= z[1] and pos.X <= z[3] and pos.Z >= z[2] and pos.Z <= z[4]
end

local function flatSpeed(hrp)
	local v = hrp.AssemblyLinearVelocity
	return math.sqrt(v.X * v.X + v.Z * v.Z)
end

local function shuffled(list)
	local out = {}
	for i, v in ipairs(list) do out[i] = v end
	for i = #out, 2, -1 do
		local j = math.random(1, i)
		out[i], out[j] = out[j], out[i]
	end
	return out
end

local function onReset(fn)
	table.insert(resets, fn)
	fn()
end

local function progress(n, text)
	ctx.setObjective(n, text)
end

-- ---------------------------------------------------------------- shared mechanics
-- a hovering page; reading it opens the note on the reader's screen
local function makeNote(n, anchor, getText, title)
	local p = part({ Name = "Note", Size = Vector3.new(1.5, 1.9, 0.06), Color = PAPER, CFrame = anchor.CFrame })
	surface2(p, "≡\n≡\n≡", Color3.fromRGB(90, 80, 70))
	glow(p, Color3.fromRGB(255, 240, 200), 7, 0.6)
	spin(n, p)
	local pp = ctx.prompt(p, "읽기", title or "쪽지", 0)
	pp.Triggered:Connect(function(player)
		ctx.playAt(p, SND_PAGE, 0.7, 1)
		ctx.fx(player, "note", getText())
	end)
	return p
end

-- a kiosk with a number pad; the code is typed on the player's screen
local function makeKeypad(n, anchor, id, title, len, getCode, onOk, onFail)
	local p = part({ Name = "Keypad", Size = Vector3.new(2.2, 3.0, 0.5), Color = Color3.fromRGB(26, 28, 32), Material = Enum.Material.Metal,
		CFrame = anchor.CFrame, CanCollide = true })
	surface2(p, "■ ■ ■ ■\n암호", Color3.fromRGB(120, 255, 160), Color3.fromRGB(10, 14, 12))
	part({ Name = "KeypadPost", Size = Vector3.new(0.5, 2.6, 0.5), Color = STEEL, Material = Enum.Material.Metal,
		CFrame = anchor.CFrame * CFrame.new(0, -2.8, 0), CanCollide = true })
	glow(p, Color3.fromRGB(120, 255, 160), 8, 0.7)
	local pp = ctx.prompt(p, "암호 입력", title, 0)
	keypads[id] = { n = n, part = p, getCode = getCode, onOk = onOk, onFail = onFail, lockUntil = 0 }
	pp.Triggered:Connect(function(player)
		if ctx.isOpen(n) then
			ctx.say(player, "이미 열렸다", "info")
			return
		end
		ctx.fx(player, "keypad", id, title, len)
	end)
	return p
end

-- warning circle on the ground, then something lands on it
local function falling(n, cfg)
	every(cfg.interval, function()
		if cfg.active and not cfg.active() then return end
		local list = ctx.alive(n)
		if #list == 0 then return end
		local e = list[math.random(1, #list)]
		if cfg.zone and not cfg.zone(e.hrp.Position) then return end
		local v = e.hrp.AssemblyLinearVelocity
		local ground = e.hrp.Position - Vector3.new(0, 2.9, 0) + Vector3.new(v.X, 0, v.Z) * cfg.lead
			+ Vector3.new((math.random() - 0.5) * cfg.spread, 0, (math.random() - 0.5) * cfg.spread)
		task.spawn(function()
			local ring = part({ Name = "Warning", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.15, cfg.radius * 2, cfg.radius * 2),
				CFrame = CFrame.new(ground + Vector3.new(0, 0.12, 0)) * CFrame.Angles(0, 0, math.rad(90)), Color = RED,
				Material = Enum.Material.Neon, Transparency = 0.75 })
			TS:Create(ring, TweenInfo.new(cfg.warn), { Transparency = 0.2 }):Play()
			task.wait(cfg.warn)
			local chunk = part({ Name = "Hazard", Size = cfg.size, Color = cfg.color, Material = cfg.material,
				CFrame = CFrame.new(ground + Vector3.new(0, cfg.from, 0)) })
			if cfg.shape then chunk.Shape = cfg.shape end
			TS:Create(chunk, TweenInfo.new(0.3, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
				{ CFrame = CFrame.new(ground + Vector3.new(0, cfg.size.Y / 2, 0)) }):Play()
			task.wait(0.3)
			ctx.playAt(chunk, cfg.sound or SND_CRASH, 1, 0.7)
			for _, x in ipairs(ctx.alive(n)) do
				local d = x.hrp.Position - ground
				if math.sqrt(d.X * d.X + d.Z * d.Z) < cfg.radius and math.abs(d.Y) < 9 then ctx.kill(x.char, cfg.cause) end
			end
			ring:Destroy()
			task.wait(1.0)
			chunk:Destroy()
		end)
	end)
end

-- the thing that rushes through: a parka (에스키모) or a hospital gown (레전드 환자)
local function rushFigure(look)
	local eskimo = look == "eskimo"
	local root = part({ Name = "Rush", Size = Vector3.new(4.4, 6.4, 3), Color = if eskimo then Color3.fromRGB(190, 60, 40) else Color3.fromRGB(215, 225, 222),
		Material = Enum.Material.Fabric })
	local function add(size, offset, color, material)
		local p = part({ Name = "RushPart", Size = size, Color = color, Material = material or Enum.Material.Fabric, Anchored = false,
			Massless = true, CFrame = root.CFrame * offset })
		local w = Instance.new("WeldConstraint")
		w.Part0 = root
		w.Part1 = p
		w.Parent = p
		return p
	end
	if eskimo then
		add(Vector3.new(5, 3.4, 3.6), CFrame.new(0, 4.2, 0), Color3.fromRGB(236, 230, 214))               -- fur hood
		add(Vector3.new(2.6, 2.2, 0.4), CFrame.new(0, 4.2, -1.7), Color3.fromRGB(16, 12, 12), Enum.Material.SmoothPlastic)
		add(Vector3.new(0.9, 7, 0.9), CFrame.new(3.2, 2.6, -1) * CFrame.Angles(math.rad(25), 0, 0), Color3.fromRGB(110, 80, 50), Enum.Material.Wood)
		add(Vector3.new(3.4, 2.2, 2.2), CFrame.new(3.2, 6.2, -2.4), Color3.fromRGB(60, 62, 68), Enum.Material.Metal)   -- sledgehammer head
	else
		add(Vector3.new(2.6, 2.6, 2.6), CFrame.new(0, 4.4, 0), Color3.fromRGB(226, 214, 200), Enum.Material.SmoothPlastic)
		add(Vector3.new(6.4, 0.5, 9), CFrame.new(0, -2.2, 0), Color3.fromRGB(150, 156, 160), Enum.Material.Metal)       -- the stretcher
	end
	for _, s in ipairs({ -1, 1 }) do
		add(Vector3.new(0.5, 0.3, 0.2), CFrame.new(s * 0.6, 4.5, if eskimo then -1.95 else -1.35), RED, Enum.Material.Neon)
	end
	glow(root, RED, 26, 2.2)
	return root
end

-- lights flicker, then it sweeps the zone; anyone inside who is not in a hiding spot goes down
local function rush(n, cfg)
	local st = { nextAt = 0 }
	onReset(function() st.nextAt = os.clock() + cfg.first end)
	every(1, function()
		if os.clock() < st.nextAt then return end
		if #ctx.alive(n) == 0 or (cfg.active and not cfg.active()) then
			st.nextAt = os.clock() + 4
			return
		end
		st.nextAt = os.clock() + cfg.warn + 4 + math.random(cfg.gapMin, cfg.gapMax)
		ctx.fx(n, "flicker", cfg.warn)
		ctx.fx(n, "banner", cfg.warnText, cfg.warn, "alert")
		local y = baseOf(n) + 3.6
		local a = Vector3.new(cfg.a[1], y, cfg.a[2])
		local b = Vector3.new(cfg.b[1], y, cfg.b[2])
		if cfg.bothWays and math.random() < 0.5 then a, b = b, a end
		local horn = part({ Name = "RushHorn", Size = Vector3.new(1, 1, 1), Transparency = 1, CFrame = CFrame.new(a) })
		ctx.playAt(horn, SND_THUNDER, 1, 1.2)
		task.wait(cfg.warn)
		horn:Destroy()
		local root = rushFigure(cfg.look)
		local dir = (b - a).Unit
		local total = (b - a).Magnitude / cfg.speed
		local t0 = os.clock()
		ctx.playAt(root, SND_SCARE, 1, 0.6)
		while true do
			local t = (os.clock() - t0) / total
			if t >= 1 then break end
			local pos = a + (b - a) * t
			root.CFrame = CFrame.lookAt(pos, pos + dir)
			for _, e in ipairs(ctx.alive(n)) do
				local p = e.hrp.Position
				if inZone(cfg.zone, p) and math.abs((p - pos):Dot(dir)) < 7 and not ctx.isHidden(e.player) then
					ctx.kill(e.char, cfg.cause)
				end
			end
			task.wait(0.03)
		end
		root:Destroy()
		ctx.fx(n, "banner", "…지나갔다", 2, "info")
	end)
end

-- lights out for a moment; other mechanics read dark[n]
local function blackout(n, cfg)
	local st = { nextAt = 0 }
	onReset(function()
		st.nextAt = os.clock() + cfg.first
		dark[n] = false
	end)
	every(1, function()
		if os.clock() < st.nextAt then return end
		if #ctx.alive(n) == 0 or (cfg.active and not cfg.active()) then
			st.nextAt = os.clock() + 3
			return
		end
		st.nextAt = os.clock() + 1.5 + cfg.dur + math.random(cfg.gapMin, cfg.gapMax)
		ctx.fx(n, "flicker", 1.5)
		ctx.fx(n, "banner", cfg.text, 1.5, "alert")
		task.wait(1.5)
		dark[n] = true
		ctx.fx(n, "blackout", cfg.dur)
		if cfg.onStart then cfg.onStart() end
		task.wait(cfg.dur)
		dark[n] = false
		if cfg.onEnd then cfg.onEnd() end
	end)
end

local function mannequinFigure(color)
	local root = part({ Name = "Mannequin", Size = Vector3.new(2, 2.2, 1), Color = color, CanCollide = true })
	local function add(size, offset, shape)
		local p = part({ Name = "MannequinPart", Size = size, Color = color, Anchored = false, Massless = true, CFrame = root.CFrame * offset })
		if shape then p.Shape = shape end
		local w = Instance.new("WeldConstraint")
		w.Part0 = root
		w.Part1 = p
		w.Parent = p
	end
	add(Vector3.new(1.3, 1.3, 1.3), CFrame.new(0, 1.8, 0), Enum.PartType.Ball)
	add(Vector3.new(0.8, 2.6, 0.8), CFrame.new(-0.5, -2.4, 0))
	add(Vector3.new(0.8, 2.6, 0.8), CFrame.new(0.5, -2.4, 0))
	add(Vector3.new(0.6, 2.4, 0.6), CFrame.new(-1.35, 0.4, -0.6) * CFrame.Angles(math.rad(-50), 0, 0))
	add(Vector3.new(0.6, 2.4, 0.6), CFrame.new(1.35, 0.4, -0.6) * CFrame.Angles(math.rad(-50), 0, 0))
	return root
end

-- figures that only move while the lights are out (or while `st.lungeUntil` is in the future)
local function mannequins(n, anchors, color, speed)
	local st = { list = {}, lungeUntil = 0 }
	for _, a in ipairs(anchors) do
		local root = mannequinFigure(color)
		local home = CFrame.new(a.Position.X, baseOf(n) + 4.1, a.Position.Z) * (a.CFrame - a.CFrame.Position)
		root.CFrame = home
		table.insert(st.list, { root = root, home = home })
	end
	onReset(function()
		st.lungeUntil = 0
		for _, m in ipairs(st.list) do m.root.CFrame = m.home end
	end)
	every(0.1, function(dt)
		if not dark[n] and os.clock() > st.lungeUntil then return end
		local list = ctx.alive(n)
		if #list == 0 then return end
		for _, m in ipairs(st.list) do
			local pos = m.root.Position
			local best = nil
			local bestD = 1e9
			for _, e in ipairs(list) do
				local d = (e.hrp.Position - pos).Magnitude
				if d < bestD and not ctx.isHidden(e.player) then
					best = e
					bestD = d
				end
			end
			if best then
				if bestD < 4.4 then
					ctx.kill(best.char, "mannequin")
					ctx.playAt(m.root, SND_SCARE, 1, 1.5)
				elseif bestD < 90 then
					local flat = Vector3.new(best.hrp.Position.X, pos.Y, best.hrp.Position.Z)
					local dir = (flat - pos).Unit
					local np = pos + dir * math.min(speed * dt, bestD - 3)
					m.root.CFrame = CFrame.lookAt(np, np + dir)
				end
			end
		end
	end)
	return st
end

-- N switches somewhere on the floor; all of them must be thrown
local function levers(n, anchors, cfg)
	local st = { on = {}, count = 0, items = {} }
	for i, a in ipairs(anchors) do
		local box = part({ Name = "Breaker", Size = Vector3.new(1.8, 2.6, 0.7), Color = STEEL, Material = Enum.Material.Metal, CFrame = a.CFrame })
		surface2(box, cfg.name .. "\n" .. i, YELLOW)
		local handle = part({ Name = "BreakerHandle", Size = Vector3.new(0.5, 0.5, 1.6), Color = RED, Material = Enum.Material.Neon,
			CFrame = a.CFrame * CFrame.new(0, -0.7, 0) })
		local lt = glow(handle, RED, 9, 1)
		local pp = ctx.prompt(box, cfg.action or "올리기", cfg.name, 1.0)
		st.items[i] = { handle = handle, light = lt, cf = handle.CFrame }
		pp.Triggered:Connect(function(player)
			if st.on[i] then return end
			st.on[i] = true
			st.count += 1
			handle.Color = GREEN
			lt.Color = GREEN
			handle.CFrame = st.items[i].cf * CFrame.new(0, 1.4, 0)
			ctx.playAt(box, SND_SWITCH, 1, 0.8)
			ctx.say(nil, player.DisplayName .. " · " .. cfg.name .. " " .. st.count .. "/" .. #anchors, "key")
			if st.count >= #anchors then
				cfg.onAll(player)
			else
				progress(n, cfg.objective .. " (" .. st.count .. "/" .. #anchors .. ")")
			end
		end)
	end
	onReset(function()
		st.on = {}
		st.count = 0
		for _, it in ipairs(st.items) do
			it.handle.Color = RED
			it.light.Color = RED
			it.handle.CFrame = it.cf
		end
	end)
	return st
end

-- things to pick up; the count is shared by the whole team
local function collect(n, anchors, cfg)
	local st = { got = {}, count = 0, items = {} }
	for i, a in ipairs(anchors) do
		local p = cfg.make(a, i)
		spin(n, p)
		local pp = ctx.prompt(p, cfg.action, cfg.object, 0.3)
		st.items[i] = p
		pp.Triggered:Connect(function(player)
			if st.got[i] then return end
			st.got[i] = true
			st.count += 1
			ctx.setHidden(p, true)
			ctx.playAt(p, SND_PING, 1, 1 + st.count * 0.08)
			cfg.onPick(st.count, #anchors, player)
		end)
	end
	onReset(function()
		st.got = {}
		st.count = 0
	end)
	return st
end

-- pads that notice a player stepping onto them
local function watchPads(n, pads, onStep)
	local last = setmetatable({}, { __mode = "k" })
	every(0.1, function()
		for _, e in ipairs(ctx.alive(n)) do
			local p = e.hrp.Position
			local idx = nil
			for i, pad in ipairs(pads) do
				if math.abs(p.X - pad.pos.X) <= pad.half and math.abs(p.Z - pad.pos.Z) <= pad.half
					and p.Y > pad.pos.Y + pad.up and p.Y < pad.pos.Y + pad.up + 6 then
					idx = i
					break
				end
			end
			if idx ~= last[e.player] then
				last[e.player] = idx
				if idx then onStep(idx, e.player) end
			end
		end
	end)
end

-- an alarm brings 조수민 to the floor for a while
local function makeAlarm(n, spawnPos, seconds)
	local st = { untilT = 0 }
	onReset(function() st.untilT = 0 end)
	return function(reason)
		if os.clock() < st.untilT then return end
		st.untilT = os.clock() + seconds
		ctx.fx(n, "flicker", 1.2)
		ctx.fx(n, "banner", reason .. " 경보! 조수민이 " .. seconds .. "초 동안 돌아다닌다", 4, "alert")
		ctx.Chaser.summon(n, spawnPos, seconds, 2)
	end
end

-- ---------------------------------------------------------------- 88F 공유 하우스: 도어락 암호
local function floor88()
	local n = 88
	local st = { code = "0000" }
	local where = { "냉장고에 붙어 있던 메모", "욕실 거울에 쓴 글씨", "806호 책상 서랍 속 쪽지", "탈출 계획판 뒷면" }
	onReset(function()
		st.code = string.format("%04d", math.random(0, 9999))
	end)
	for i, a in ipairs(ctx.anchors(n, "Note")) do
		makeNote(n, a, function()
			return where[i] .. "\n\n현관 도어락 " .. i .. "번째 숫자는  [ " .. string.sub(st.code, i, i) .. " ]\n\n쪽지는 모두 4장. 다 모으면 현관 도어락에 입력해."
		end)
	end
	local pad = ctx.anchors(n, "Keypad")[1]
	if pad then
		makeKeypad(n, pad, "door88", "현관 도어락 (4자리)", 4, function() return st.code end, function(player)
			ctx.say(nil, player.DisplayName .. " · 도어락이 열렸다! 쇠사슬이 풀린다", "key")
			ctx.openFloor(n, player)
		end, function(player)
			ctx.say(player, "삐빅— 틀렸다. 집 안의 쪽지 4장을 다 읽었나?", "alert")
		end)
	end
end

-- ---------------------------------------------------------------- 87F 폐허: 낙석 + 에스키모의 망치
local function floor87()
	local n = 87
	local st = { has = false }
	local hammerAt = ctx.anchors(n, "Hammer")[1]
	local breakAt = ctx.anchors(n, "Break")[1]
	if hammerAt and breakAt then
		local hammer = part({ Name = "EskimoHammer", Size = Vector3.new(0.5, 4.2, 0.5), Color = Color3.fromRGB(120, 86, 52), Material = Enum.Material.Wood,
			CFrame = hammerAt.CFrame * CFrame.Angles(0, 0, math.rad(20)) })
		attach(hammer, { Name = "HammerHead", Size = Vector3.new(2.2, 1.3, 1.3), Color = Color3.fromRGB(62, 64, 70), Material = Enum.Material.Metal,
			CFrame = hammer.CFrame * CFrame.new(0, 2.3, 0) })
		glow(hammer, YELLOW, 10, 1)
		billboard(hammer, "에스키모의 망치", YELLOW, 7, 1.2, 60)
		local pp = ctx.prompt(hammer, "집어 들기", "에스키모의 망치", 1.0)
		pp.Triggered:Connect(function(player)
			if st.has then return end
			st.has = true
			ctx.setHidden(hammer, true)
			ctx.playAt(hammer, SND_PING, 1, 0.8)
			ctx.say(nil, player.DisplayName .. " · 에스키모의 망치를 챙겼다. 계단문 옆 금 간 벽을 부숴라", "key")
			progress(n, "망치를 챙겼다. 비상구 옆 「금 간 벽」을 부숴라")
		end)
		local wall = part({ Name = "CrackedWall", Size = Vector3.new(3.2, 3.6, 0.4), Color = Color3.fromRGB(120, 116, 108), Material = Enum.Material.Concrete,
			CFrame = breakAt.CFrame })
		surface2(wall, "금 간 벽\n(창살 잠금 장치)", Color3.fromRGB(40, 36, 30))
		local bp = ctx.prompt(wall, "망치로 부수기", "금 간 벽", 2.2)
		bp.Triggered:Connect(function(player)
			if ctx.isOpen(n) then return end
			if not st.has then
				ctx.say(player, "맨손으론 안 부서진다. 에스키모가 두고 간 망치가 어딘가 있다", "alert")
				return
			end
			ctx.playAt(wall, "rbxasset://sounds/glassbreak.wav", 1, 0.6)
			ctx.setHidden(wall, true)
			ctx.openFloor(n, player)
		end)
		onReset(function() st.has = false end)
	end
	falling(n, { interval = 1.1, warn = 1.2, radius = 4, lead = 0.55, spread = 14, from = 13, size = Vector3.new(5, 3.4, 5),
		color = Color3.fromRGB(120, 116, 108), material = Enum.Material.Concrete, cause = "debris",
		zone = function(pos) return pos.X < 58 end })
end

-- ---------------------------------------------------------------- 80F 기밀 문서보관소: 레이저 + 기밀 상자
local function floor80()
	local n = 80
	local st = { target = 1, labels = {} }
	local boxes = {}
	local alarmAt = ctx.anchors(n, "Alarm")[1]
	local alarm = makeAlarm(n, if alarmAt then alarmAt.Position else at(n, 50, 3.5, 20), 22)
	local letters = { "A", "C", "E", "G", "K", "P", "R", "X" }
	for i, a in ipairs(ctx.anchors(n, "Box")) do
		local p = part({ Name = "SecretBox", Size = Vector3.new(2.2, 1.6, 1.6), Color = Color3.fromRGB(160, 130, 90), Material = Enum.Material.WoodPlanks,
			CFrame = a.CFrame })
		glow(p, YELLOW, 7, 0.5)
		local tl = billboard(p, "?", YELLOW, 5, 1.3, 16)
		boxes[i] = { part = p, label = tl }
		spin(n, p, 0.1)
		local pp = ctx.prompt(p, "꺼내기", "기밀 상자", 0.8)
		pp.Triggered:Connect(function(player)
			if ctx.isOpen(n) then return end
			if i == st.target then
				ctx.playAt(p, SND_PING, 1, 1.3)
				ctx.setHidden(p, true)
				ctx.say(nil, player.DisplayName .. " · 맞는 상자다. 안에 출입 카드가 들어 있다", "key")
				ctx.openFloor(n, player)
			else
				ctx.playAt(p, SND_BUZZ, 1, 1)
				alarm("엉뚱한 상자를 건드렸다.")
			end
		end)
	end
	onReset(function()
		if #boxes == 0 then return end
		st.target = math.random(1, #boxes)
		local used = {}
		for i, b in ipairs(boxes) do
			local label
			repeat
				label = letters[math.random(1, #letters)] .. "-" .. math.random(100, 999)
			until not used[label]
			used[label] = true
			st.labels[i] = label
			b.label.Text = label
		end
	end)
	local clue = ctx.anchors(n, "Clue")[1]
	if clue then
		makeNote(n, clue, function()
			return "열람 신청서\n\n신청 문서:  [ " .. (st.labels[st.target] or "?") .. " ]\n\n서가 통로의 상자 중 번호가 같은 것만 꺼낼 것.\n다른 상자를 건드리거나 레이저에 닿으면 경보가 울린다."
		end, "열람 신청서")
	end
	-- blinking laser curtains across the shelf aisles
	local lasers = {}
	for i, a in ipairs(ctx.anchors(n, "Laser")) do
		local beams = {}
		for k = 0, 3 do
			table.insert(beams, part({ Name = "Laser", Size = Vector3.new(a.Size.X, 0.14, 0.14), Color = RED, Material = Enum.Material.Neon,
				CFrame = a.CFrame * CFrame.new(0, -3 + k * 2, 0) }))
		end
		lasers[i] = { anchor = a, beams = beams, on = true, phase = (i * 1.3) % 4 }
	end
	every(0.1, function()
		local list = ctx.alive(n)
		if #list == 0 then return end
		local t = os.clock()
		for _, l in ipairs(lasers) do
			local on = ((t + l.phase) % 4) < 2.3
			if on ~= l.on then
				l.on = on
				for _, b in ipairs(l.beams) do b.Transparency = if on then 0 else 0.92 end
			end
			if on then
				for _, e in ipairs(list) do
					local lp = l.anchor.CFrame:PointToObjectSpace(e.hrp.Position)
					if math.abs(lp.X) < l.anchor.Size.X / 2 and math.abs(lp.Z) < 1.1 and math.abs(lp.Y) < 6 then
						alarm("레이저에 닿았다.")
					end
				end
			end
		end
	end)
end

-- ---------------------------------------------------------------- 77F 백룸: 쭉쭉이 + 정전
local function floor77()
	blackout(77, { first = 18, gapMin = 16, gapMax = 26, dur = 4.5, text = "형광등이 깜빡인다… 정전 중엔 쭉쭉이가 보고 있어도 움직인다",
		onStart = function() ctx.Zzuk.setDark(true) end, onEnd = function() ctx.Zzuk.setDark(false) end })
end

-- ---------------------------------------------------------------- 70F CCTV 관제실: 모니터 색 암호
local function floor70()
	local n = 70
	local names = { "빨강", "노랑", "초록", "파랑" }
	local cols = { RED, YELLOW, GREEN, BLUE }
	local st = { digits = { 0, 0, 0, 0 }, order = { 1, 2, 3, 4 }, code = "0000" }
	local screens = {}
	for i, a in ipairs(ctx.anchors(n, "Digit")) do
		if i <= 4 then
			local p = part({ Name = "CodeScreen", Size = Vector3.new(4.4, 3.2, 0.3), Color = Color3.fromRGB(12, 12, 14), CFrame = a.CFrame })
			screens[i] = surface2(p, "■", cols[i], Color3.fromRGB(8, 8, 10))
			part({ Name = "CodeScreenFrame", Size = Vector3.new(4.8, 0.3, 0.4), Color = cols[i], Material = Enum.Material.Neon,
				CFrame = a.CFrame * CFrame.new(0, -1.75, 0) })
		end
	end
	onReset(function()
		st.order = shuffled({ 1, 2, 3, 4 })
		local code = ""
		for i = 1, 4 do st.digits[i] = math.random(0, 9) end
		for _, k in ipairs(st.order) do code = code .. st.digits[k] end
		st.code = code
	end)
	-- one screen at a time shows its number
	local turn = 0
	every(1.4, function()
		if #ctx.alive(n) == 0 or #screens < 4 then return end
		turn = turn % 4 + 1
		for i = 1, 4 do
			setTexts(screens[i], if i == turn then tostring(st.digits[i]) else "■")
		end
	end)
	local note = ctx.anchors(n, "Note")[1]
	if note then
		makeNote(n, note, function()
			local o = st.order
			return "상황실장 메모\n\n비상 해제 암호는 벽 위 색깔 모니터 4대에 한 자리씩 뜬다.\n\n입력 순서:  " .. names[o[1]] .. " → " .. names[o[2]] .. " → " .. names[o[3]] .. " → " .. names[o[4]]
				.. "\n\n틀리면 경보가 울린다."
		end, "상황실장 메모")
	end
	local alarmAt = ctx.anchors(n, "Alarm")[1]
	local alarm = makeAlarm(n, if alarmAt then alarmAt.Position else at(n, -20, 3.5, -13), 20)
	local pad = ctx.anchors(n, "Keypad")[1]
	if pad then
		makeKeypad(n, pad, "cctv70", "비상 해제 단말기 (4자리)", 4, function() return st.code end, function(player)
			ctx.say(nil, player.DisplayName .. " · 비상 해제! 관제실 잠금이 풀렸다", "key")
			ctx.openFloor(n, player)
		end, function()
			alarm("암호가 틀렸다.")
		end)
	end
end

-- ---------------------------------------------------------------- 66F 짜장 지옥: 점프맵 + 군만두
local function floor66()
	falling(66, { interval = 2.4, warn = 1.3, radius = 3.2, lead = 0.7, spread = 6, from = 16, size = Vector3.new(4.4, 2.2, 3),
		color = Color3.fromRGB(226, 178, 92), material = Enum.Material.Sand, cause = "mandu", sound = "rbxasset://sounds/splat.wav",
		active = function() return not ctx.isOpen(66) end,
		zone = function(pos) return pos.X < 44 end })
end

-- ---------------------------------------------------------------- 60F 사내식당: 식권 + 에스키모 돌진
local function floor60()
	local n = 60
	local tickets = collect(n, ctx.anchors(n, "Ticket"), {
		action = "줍기", object = "식권",
		make = function(a)
			local p = part({ Name = "MealTicket", Size = Vector3.new(1.8, 0.9, 0.06), Color = Color3.fromRGB(250, 236, 170), CFrame = a.CFrame })
			surface2(p, "식권\n진미국수", Color3.fromRGB(150, 40, 30))
			glow(p, YELLOW, 8, 0.8)
			return p
		end,
		onPick = function(count, total, player)
			ctx.say(nil, player.DisplayName .. " · 식권 " .. count .. "/" .. total, "key")
			progress(n, if count >= total then "식권을 다 모았다. 식권 발매기에 넣어라" else ("식권 " .. count .. "/" .. total .. " — 홀, 주방에 흩어져 있다. 돌진이 오면 부스 안으로!"))
		end,
	})
	local machine = ctx.anchors(n, "Machine")[1]
	if machine then
		local p = part({ Name = "TicketSlot", Size = Vector3.new(1.6, 0.9, 0.2), Color = YELLOW, Material = Enum.Material.Neon, CFrame = machine.CFrame })
		surface2(p, "식권 투입", Color3.fromRGB(40, 30, 10))
		local pp = ctx.prompt(p, "식권 넣기", "식권 발매기", 1.0)
		pp.Triggered:Connect(function(player)
			if ctx.isOpen(n) then return end
			if tickets.count < #tickets.items then
				ctx.say(player, "식권이 모자라다 (" .. tickets.count .. "/" .. #tickets.items .. ")", "alert")
				return
			end
			ctx.playAt(p, SND_PING, 1, 1.4)
			ctx.say(nil, "발매기에서 출입 카드가 나왔다. 진미국수는 품절이다", "key")
			ctx.openFloor(n, player)
		end)
	end
	rush(n, { first = 14, gapMin = 14, gapMax = 22, warn = 3.6, speed = 62, look = "eskimo", cause = "rush", bothWays = true,
		warnText = "쿵… 쿵… 에스키모가 돌진해 온다! 부스 좌석 안이나 주방으로!",
		a = { 60, -20 }, b = { -56, -20 }, zone = { -56, -55, 61, 13.4 } })
end

-- ---------------------------------------------------------------- 50F 조수민 하우스: 무궁화 꽃이 피었습니다
local function floor50()
	local n = 50
	local zone = { -44, -45, 39, -12.5 }
	local spot = ctx.anchors(n, "Tagger")[1]
	if not spot then return end
	local pos = spot.Position
	local away = CFrame.lookAt(pos, pos + Vector3.new(0, 0, 1))
	local toward = CFrame.lookAt(pos, pos + Vector3.new(0, 0, -1))
	local tagger = nil
	task.spawn(function()
		tagger = ctx.Chaser.makeStatue(away)
	end)
	local function face(cf)
		if tagger then tagger:PivotTo(cf) end
	end
	task.spawn(function()
		while true do
			local ok, err = pcall(function()
				local playing = false
				for _, e in ipairs(ctx.alive(n)) do
					if inZone(zone, e.hrp.Position) then playing = true end
				end
				if not playing then
					face(away)
					task.wait(1)
					return
				end
				-- green light: she chants with her back turned
				local chant = 2.0 + math.random() * 2.6
				face(away)
				ctx.fx(n, "banner", "무궁화 꽃이 피었습니다…", chant, "info")
				task.wait(chant)
				-- red light
				face(toward)
				ctx.fx(n, "banner", "멈춰!!  조수민이 보고 있다", 2.8, "alert")
				ctx.playAt(spot, SND_BUZZ, 1, 1.6)
				task.wait(0.45)
				local untilT = os.clock() + 1.8 + math.random() * 1.4
				while os.clock() < untilT do
					for _, e in ipairs(ctx.alive(n)) do
						if inZone(zone, e.hrp.Position) and flatSpeed(e.hrp) > 2.2 and not ctx.isHidden(e.player) then
							ctx.kill(e.char, "redlight")
							ctx.playAt(spot, SND_SCARE, 1, 1.2)
						end
					end
					task.wait(0.1)
				end
			end)
			if not ok then
				warn("[Floors] 50F:", err)
				task.wait(1)
			end
		end
	end)
end

-- ---------------------------------------------------------------- 44F 피의 축제방: 타일 파티
local function floor44()
	local n = 44
	local SIZE, COLS, ROWS, X0, Z0 = 8, 12, 13, -52, -52
	local palette = { YELLOW, GREEN, BLUE, WHITE }
	local names = { "노랑", "초록", "파랑", "하양" }
	local calm = Color3.fromRGB(46, 20, 26)
	local blood = Color3.fromRGB(255, 20, 30)
	local y = baseOf(n) + 0.14
	local tiles = {}
	for c = 1, COLS do
		tiles[c] = {}
		for r = 1, ROWS do
			local p = part({ Name = "PartyTile", Size = Vector3.new(SIZE - 0.3, 0.12, SIZE - 0.3), Color = calm,
				CFrame = CFrame.new(X0 + (c - 0.5) * SIZE, y, Z0 + (r - 0.5) * SIZE) })
			tiles[c][r] = { part = p, color = 1 }
		end
	end
	local function paint(fn)
		for c = 1, COLS do
			for r = 1, ROWS do
				local t = tiles[c][r]
				local col, neon = fn(t)
				t.part.Color = col
				t.part.Material = if neon then Enum.Material.Neon else Enum.Material.SmoothPlastic
			end
		end
	end
	local quiet = true
	task.spawn(function()
		while true do
			local ok, err = pcall(function()
				if #ctx.alive(n) == 0 then
					if not quiet then
						quiet = true
						paint(function() return calm, false end)
					end
					task.wait(1)
					return
				end
				quiet = false
				-- every 2×2 block holds all four colours, so the right one is never far away
				for c = 1, COLS, 2 do
					for r = 1, ROWS, 2 do
						local order = shuffled({ 1, 2, 3, 4 })
						local k = 0
						for dc = 0, 1 do
							for dr = 0, 1 do
								k += 1
								local col = tiles[c + dc]
								local t = col and col[r + dr]
								if t then t.color = order[k] end
							end
						end
					end
				end
				paint(function(t) return palette[t.color], false end)
				local safe = math.random(1, 4)
				local warn = 3.2
				ctx.fx(n, "banner", "MC 백윤례 ♪ 피의~ 축제~!   「" .. names[safe] .. "」 타일 위로!", warn, palette[safe])
				ctx.playAt(tiles[1][7].part, SND_PING, 1, 0.7)
				task.wait(warn)
				paint(function(t)
					if t.color == safe then return palette[safe], true end
					return blood, true
				end)
				ctx.playAt(tiles[6][7].part, SND_BUZZ, 1, 0.8)
				local untilT = os.clock() + 1.3
				local floorY = baseOf(n)
				while os.clock() < untilT do
					for _, e in ipairs(ctx.alive(n)) do
						local p = e.hrp.Position
						local c = math.floor((p.X - X0) / SIZE) + 1
						local r = math.floor((p.Z - Z0) / SIZE) + 1
						local t = tiles[c] and tiles[c][r]
						if t and t.color ~= safe and p.Y < floorY + 9 then ctx.kill(e.char, "festival") end
					end
					task.wait(0.1)
				end
				paint(function() return calm, false end)
				task.wait(1.3)
			end)
			if not ok then
				warn("[Floors] 44F:", err)
				task.wait(1)
			end
		end
	end)
end

-- ---------------------------------------------------------------- 40F 정전 미로: 차단기 3개 + 조수민
local function floor40()
	local n = 40
	local st = levers(n, ctx.anchors(n, "Lever"), {
		name = "차단기", objective = "미로 속 차단기 3개를 올려라. 조수민이 돌아다닌다",
		onAll = function()
			ctx.say(nil, "차단기를 모두 올렸다. 서쪽 끝 분전반의 빨간 주 전원 스위치를 눌러라", "key")
			progress(n, "차단기 3/3 — 서쪽 끝 분전반의 주 전원 스위치를 눌러라")
		end,
	})
	exitLocks[n] = function()
		if st.count >= #st.items then return true end
		return false, "차단기가 내려가 있다. 미로 안의 차단기 " .. #st.items .. "개를 먼저 올려라 (" .. st.count .. "/" .. #st.items .. ")"
	end
end

-- ---------------------------------------------------------------- 30F 수영장: 출발대 순서
local function floor30()
	local n = 30
	local lanes = { -35, -26, -17, -8, 1, 10, 19 }
	local pads = {}
	for i, z in ipairs(lanes) do
		pads[i] = { pos = at(n, -8.6, 5.4, z), half = 1.7, up = 1.6 }
	end
	local st = { order = { 1, 2, 3, 4 }, idx = 1 }
	local label = nil
	local boardAt = ctx.anchors(n, "Board")[1]
	if boardAt then
		local b = part({ Name = "RecordBoard", Size = Vector3.new(22, 5, 0.4), Color = Color3.fromRGB(14, 20, 30), CFrame = boardAt.CFrame })
		label = surface2(b, "", Color3.fromRGB(255, 180, 60), Color3.fromRGB(10, 14, 22))
	end
	onReset(function()
		local all = shuffled({ 1, 2, 3, 4, 5, 6, 7 })
		st.order = { all[1], all[2], all[3], all[4] }
		st.idx = 1
		if label then
			setTexts(label, "오늘의 기록   1위 " .. st.order[1] .. "레인 · 2위 " .. st.order[2] .. "레인 · 3위 " .. st.order[3] .. "레인 · 4위 " .. st.order[4]
				.. "레인\n순위대로 출발대에 올라서라")
		end
	end)
	watchPads(n, pads, function(i, player)
		if ctx.isOpen(n) then return end
		if st.order[st.idx] == i then
			ctx.playAt(hrpOf(player), SND_PING, 1, 0.9 + st.idx * 0.15)
			ctx.fx(n, "banner", i .. "레인 ✔   (" .. st.idx .. "/4)", 2, "key")
			st.idx += 1
			if st.idx > 4 then
				ctx.say(nil, "삐익— 호루라기 소리와 함께 창살이 열린다", "key")
				ctx.openFloor(n, player)
			end
		else
			st.idx = 1
			ctx.playAt(hrpOf(player), SND_BUZZ, 1, 1)
			ctx.fx(n, "banner", "순서가 틀렸다. 전광판의 1위 레인부터 다시", 2.5, "alert")
		end
	end)
end

-- ---------------------------------------------------------------- 20F 회장실: 불빛 따라 밟기
local function floor20()
	local n = 20
	local cols = { RED, YELLOW, GREEN, BLUE }
	local dim = { Color3.fromRGB(90, 24, 24), Color3.fromRGB(96, 80, 24), Color3.fromRGB(24, 84, 44), Color3.fromRGB(24, 50, 100) }
	local pads = {}
	local parts = {}
	for i, a in ipairs(ctx.anchors(n, "Pad")) do
		if i <= 4 then
			local pos = Vector3.new(a.Position.X, baseOf(n) + 0.5, a.Position.Z)
			parts[i] = part({ Name = "SecurityPad", Size = Vector3.new(6, 0.16, 6), Color = dim[i], CFrame = CFrame.new(pos) })
			pads[i] = { pos = pos, half = 3, up = 1.5 }
		end
	end
	if #pads < 4 then return end
	local st = { seq = {}, len = 3, idx = 1, phase = "idle", deadline = 0, round = 1 }
	onReset(function()
		st.seq = {}
		for i = 1, 6 do st.seq[i] = math.random(1, 4) end
		st.len = 3
		st.round = 1
		st.idx = 1
		st.phase = "idle"
	end)
	local function flash(i, secs)
		parts[i].Color = cols[i]
		parts[i].Material = Enum.Material.Neon
		ctx.playAt(parts[i], SND_PING, 1, 0.7 + i * 0.2)
		task.delay(secs, function()
			parts[i].Color = dim[i]
			parts[i].Material = Enum.Material.SmoothPlastic
		end)
	end
	every(0.5, function()
		if ctx.isOpen(n) or st.phase == "show" or st.phase == "done" then return end
		if st.phase ~= "idle" and os.clock() < st.deadline then return end
		local near = false
		for _, e in ipairs(ctx.alive(n)) do
			if (e.hrp.Position - pads[1].pos).Magnitude < 34 then near = true end
		end
		if not near then return end
		st.phase = "show"
		ctx.fx(n, "banner", "회장실 보안 패드 " .. st.round .. "/3 — 불빛 순서를 외워라", 2, "info")
		task.wait(1.6)
		for k = 1, st.len do
			flash(st.seq[k], 0.5)
			task.wait(0.75)
		end
		st.idx = 1
		st.deadline = os.clock() + 14
		st.phase = "input"
		ctx.fx(n, "banner", "이제 같은 순서로 밟아라", 2, "key")
	end)
	watchPads(n, pads, function(i, player)
		if st.phase ~= "input" or ctx.isOpen(n) then return end
		flash(i, 0.3)
		if st.seq[st.idx] == i then
			st.idx += 1
			st.deadline = os.clock() + 10
			if st.idx > st.len then
				st.round += 1
				if st.round > 3 then
					st.phase = "done"
					ctx.say(nil, "보안 해제. 초상화가 눈을 감는다… 금고에서 카드가 나왔다", "key")
					ctx.openFloor(n, player)
				else
					st.len += 1
					st.phase = "wait"
					st.deadline = os.clock() + 1.2
					ctx.fx(n, "banner", "정답! 다음은 " .. st.len .. "칸", 2, "key")
				end
			end
		else
			st.phase = "wait"
			st.deadline = os.clock() + 1.5
			ctx.playAt(parts[i], SND_BUZZ, 1, 1)
			ctx.fx(n, "banner", "틀렸다. 초상화가 노려본다… 다시 보여 준다", 2, "alert")
		end
	end)
end

-- ---------------------------------------------------------------- 10F 어린이집: 낮잠 자는 조수민
local function floor10()
	local n = 10
	local zone = { -78.5, -55, -31, 4.6 }
	local st = { noise = 0, awakeUntil = 0, shown = setmetatable({}, { __mode = "k" }) }
	local toys = {}
	local rng = Random.new(1010)
	local toyCols = { RED, YELLOW, GREEN, BLUE, Color3.fromRGB(255, 130, 200) }
	for i = 1, 18 do
		local pos = at(n, rng:NextNumber(-74, -35), 1.0, rng:NextNumber(-50, 1))
		local p = part({ Name = "SqueakyToy", Shape = Enum.PartType.Ball, Size = Vector3.new(1.3, 1.3, 1.3), Color = toyCols[i % #toyCols + 1],
			CFrame = CFrame.new(pos) })
		toys[i] = { part = p, pos = pos, cool = 0 }
	end
	onReset(function()
		st.noise = 0
		st.awakeUntil = 0
	end)
	every(0.2, function(dt)
		local now = os.clock()
		local inside = {}
		for _, e in ipairs(ctx.alive(n)) do
			if inZone(zone, e.hrp.Position) then table.insert(inside, e) end
		end
		if st.awakeUntil > 0 then
			if now > st.awakeUntil then
				st.awakeUntil = 0
				st.noise = 0
				ctx.Chaser.setAsleep(n, true)
				ctx.fx(n, "banner", "수민이가 다시 잠들었다…", 3, "info")
			end
		else
			local add = 0
			for _, e in ipairs(inside) do
				local sp = flatSpeed(e.hrp)
				if sp > 19 then add += 95 * dt elseif sp > 9.5 then add += 48 * dt end
				for _, t in ipairs(toys) do
					local d = e.hrp.Position - t.pos
					if now > t.cool and math.abs(d.X) < 1.7 and math.abs(d.Z) < 1.7 then
						t.cool = now + 3
						add += 34
						ctx.playAt(t.part, SND_PING, 1, 2.2)
						ctx.fx(e.player, "banner", "삑! 장난감을 밟았다", 1.5, "alert")
					end
				end
			end
			if add > 0 then st.noise = math.min(100, st.noise + add) else st.noise = math.max(0, st.noise - 9 * dt) end
			if st.noise >= 100 then
				st.awakeUntil = now + 16
				ctx.Chaser.setAsleep(n, false)
				ctx.fx(n, "banner", "수민이가 깼다!!!  낮잠방에서 나가!", 4, "alert")
				ctx.fx(n, "flicker", 1)
				if inside[1] then ctx.playAt(inside[1].hrp, SND_SCARE, 1, 1.4) end
			end
		end
		-- noise meter for the players in the nap room
		local seen = {}
		for _, e in ipairs(inside) do
			seen[e.player] = true
			st.shown[e.player] = true
			ctx.fx(e.player, "meter", if st.awakeUntil > 0 then "수민이가 깼다!" else "소음 — 살금살금(C)", if st.awakeUntil > 0 then 1 else st.noise / 100)
		end
		for p in pairs(st.shown) do
			if not seen[p] then
				st.shown[p] = nil
				ctx.fx(p, "meter", "", -1)
			end
		end
	end)
end

-- ---------------------------------------------------------------- 8F 정보구출반 8팀: 결재 받아오기
local function floor8()
	local n = 8
	local st = { stage = 0 }
	onReset(function() st.stage = 0 end)
	local steps = {
		{ kind = "Report", action = "보고서 챙기기", object = "공유의 자리", text = "보고서", hold = 0.6,
			done = "보고서 v7_최종_진짜최종을 챙겼다. 차강면 차장 자리에서 검토를 받아라" },
		{ kind = "Review", action = "검토 받기", object = "차강면 차장 자리", text = "검토 도장", hold = 2.4,
			done = "검토 도장을 받았다. 유모자 팀장실에 결재를 올려라" },
		{ kind = "Submit", action = "결재 올리기", object = "유모자 팀장 책상", text = "결재", hold = 1.6, done = "" },
	}
	for i, s in ipairs(steps) do
		local a = ctx.anchors(n, s.kind)[1]
		if a then
			local p = part({ Name = "Approval" .. s.kind, Size = Vector3.new(1.6, 2.0, 0.08), Color = PAPER, CFrame = a.CFrame })
			surface2(p, s.text, Color3.fromRGB(170, 30, 30))
			glow(p, YELLOW, 8, 0.7)
			billboard(p, i .. ". " .. s.object, YELLOW, 8, 1.1, 46)
			spin(n, p)
			local pp = ctx.prompt(p, s.action, s.object, s.hold)
			pp.Triggered:Connect(function(player)
				if ctx.isOpen(n) then return end
				if st.stage ~= i - 1 then
					ctx.say(player, if st.stage >= i then "이미 끝낸 단계다" else "순서가 있다: 공유 자리(보고서) → 차강면 차장(검토) → 유모자 팀장(결재)", "alert")
					return
				end
				st.stage = i
				ctx.playAt(p, SND_PING, 1, 1 + i * 0.15)
				if i < 3 then
					ctx.say(nil, player.DisplayName .. " · " .. s.done, "key")
					progress(n, s.done)
				else
					ctx.say(nil, "유모자 팀장: \"very very good입니다!\"  — 결재 완료", "key")
					ctx.openFloor(n, player)
				end
			end)
		end
	end
	rush(n, { first = 16, gapMin = 15, gapMax = 24, warn = 3.4, speed = 58, look = "eskimo", cause = "rush", bothWays = true,
		warnText = "Извините!!  에스키모가 사무실을 가로지른다 — 캐비닛 안으로!",
		a = { 60, -26 }, b = { -27, -26 }, zone = { -28, -55, 61, 29.5 }, active = function() return not ctx.isOpen(n) end })
end

-- ---------------------------------------------------------------- B1 파르티르레트: 마네킹 + 넥타이
local function floorB1()
	local n = -1
	local names = { "빨간", "파란", "초록", "노란", "보라" }
	local cols = { RED, BLUE, GREEN, YELLOW, Color3.fromRGB(170, 90, 230) }
	local st = { target = 1 }
	local dolls = mannequins(n, ctx.anchors(n, "Mannequin"), Color3.fromRGB(232, 228, 220), 9)
	onReset(function() st.target = math.random(1, 5) end)
	for i, a in ipairs(ctx.anchors(n, "Tie")) do
		if i <= 5 then
			local p = part({ Name = "Tie", Size = Vector3.new(0.9, 3.0, 0.12), Color = cols[i], Material = Enum.Material.Fabric, CFrame = a.CFrame })
			attach(p, { Name = "TieKnot", Size = Vector3.new(1.1, 0.7, 0.2), Color = cols[i], Material = Enum.Material.Fabric,
				CFrame = a.CFrame * CFrame.new(0, 1.7, 0) })
			glow(p, cols[i], 7, 0.7)
			local pp = ctx.prompt(p, "고르기", names[i] .. " 넥타이", 0.6)
			pp.Triggered:Connect(function(player)
				if ctx.isOpen(n) then return end
				if i == st.target then
					ctx.playAt(p, SND_PING, 1, 1.3)
					ctx.say(nil, player.DisplayName .. " · 주문서와 같은 넥타이다. 상자 안에 출입 카드가 있다", "key")
					ctx.openFloor(n, player)
				else
					dolls.lungeUntil = os.clock() + 2.5
					ctx.playAt(p, SND_BUZZ, 1, 1)
					ctx.fx(n, "banner", "그 넥타이가 아니다… 마네킹들이 고개를 돌린다!", 3, "alert")
				end
			end)
		end
	end
	local note = ctx.anchors(n, "Note")[1]
	if note then
		makeNote(n, note, function()
			return "파르티르레트 주문서\n\n고객: 김회장님\n품목:  [ " .. names[st.target] .. " 넥타이 ]  1점\n\n※ 다른 넥타이를 건드리면 마네킹이 싫어합니다.\n※ 불이 꺼지면 마네킹에게서 떨어지세요."
		end, "주문서")
	end
	blackout(n, { first = 12, gapMin = 9, gapMax = 15, dur = 3.2, text = "조명이 깜빡인다… 불이 꺼지면 마네킹이 움직인다",
		active = function() return not ctx.isOpen(n) end })
end

-- ---------------------------------------------------------------- B2 기니방: 해바라기씨
local function floorB2()
	local n = -2
	local seeds = collect(n, ctx.anchors(n, "Seed"), {
		action = "줍기", object = "해바라기씨",
		make = function(a)
			local p = part({ Name = "SunflowerSeed", Size = Vector3.new(1.0, 1.8, 0.6), Color = Color3.fromRGB(50, 44, 40), CFrame = a.CFrame })
			attach(p, { Name = "SeedStripe", Size = Vector3.new(0.3, 1.7, 0.64), Color = WHITE, CFrame = a.CFrame })
			glow(p, YELLOW, 9, 0.9)
			return p
		end,
		onPick = function(count, total, player)
			ctx.say(nil, player.DisplayName .. " · 해바라기씨 " .. count .. "/" .. total, "key")
			progress(n, if count >= total then "씨앗을 다 모았다. 자고 있는 왕기니 앞 밥그릇에 놓아라" else ("해바라기씨 " .. count .. "/" .. total .. " — 기니방 곳곳에 있다"))
		end,
	})
	local feed = ctx.anchors(n, "Feed")[1]
	if feed then
		local bowl = part({ Name = "GuineaBowl", Shape = Enum.PartType.Cylinder, Size = Vector3.new(1.2, 5, 5), Color = Color3.fromRGB(210, 90, 80),
			CFrame = CFrame.new(feed.Position.X, baseOf(n) + 1.0, feed.Position.Z) * CFrame.Angles(0, 0, math.rad(90)), CanCollide = true })
		billboard(bowl, "왕기니 밥그릇", YELLOW, 7, 1.2, 60)
		local pp = ctx.prompt(bowl, "씨앗 놓기", "왕기니 밥그릇", 1.2)
		pp.MaxActivationDistance = 11
		pp.Triggered:Connect(function(player)
			if ctx.isOpen(n) then return end
			if seeds.count < #seeds.items then
				ctx.say(player, "씨앗이 모자라다 (" .. seeds.count .. "/" .. #seeds.items .. "). 기니가 눈도 안 뜬다", "alert")
				return
			end
			ctx.playAt(bowl, SND_PING, 1, 1.6)
			ctx.say(nil, "뿌이뿌이! 왕기니가 씨앗을 먹고 쳇바퀴 밑에서 카드를 물어 왔다", "key")
			ctx.openFloor(n, player)
		end)
	end
end

-- ---------------------------------------------------------------- B3 짱큰베리: 베리의 시선
local function floorB3()
	local n = -3
	local R = 12
	local y = baseOf(n) + 0.5
	local spot = part({ Name = "BerryGaze", Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.12, R * 2, R * 2), Color = Color3.fromRGB(255, 226, 90),
		Material = Enum.Material.Neon, Transparency = 0.72, CFrame = CFrame.new(30, y, 0) * CFrame.Angles(0, 0, math.rad(90)) })
	local lamp = part({ Name = "BerryGazeLight", Size = Vector3.new(1, 1, 1), Transparency = 1, CFrame = CFrame.new(30, y + 15, 0) })
	local sl = Instance.new("SpotLight")
	sl.Face = Enum.NormalId.Bottom
	sl.Angle = 78
	sl.Range = 24
	sl.Brightness = 3
	sl.Color = Color3.fromRGB(255, 226, 120)
	sl.Parent = lamp
	local t = 0
	local held = setmetatable({}, { __mode = "k" })
	every(0.1, function(dt)
		local list = ctx.alive(n)
		if #list == 0 then return end
		t += dt
		local cx = 26 + 24 * math.sin(t * 0.42)
		local cz = 40 * math.sin(t * 0.31 + 1.1)
		spot.CFrame = CFrame.new(cx, y, cz) * CFrame.Angles(0, 0, math.rad(90))
		lamp.CFrame = CFrame.new(cx, y + 15, cz)
		for _, e in ipairs(list) do
			local p = e.hrp.Position
			local dx, dz = p.X - cx, p.Z - cz
			if dx * dx + dz * dz < R * R and not ctx.isHidden(e.player) then
				local h = (held[e.player] or 0) + dt
				held[e.player] = h
				if h >= 0.8 then
					held[e.player] = 0
					ctx.kill(e.char, "berry")
					ctx.playAt(e.hrp, SND_SCARE, 1, 0.7)
				elseif h <= dt * 1.5 then
					ctx.fx(e.player, "banner", "베리와 눈이 마주쳤다 — 빛 밖으로! 상자 안으로!", 1.2, "alert")
				end
			else
				held[e.player] = 0
			end
		end
	end)
end

-- ---------------------------------------------------------------- B6~B12 레전드 정신병원
local HOSP_RUSH = { look = "patient", cause = "patient", speed = 66, warn = 3.4, bothWays = true,
	warnText = "드르륵… 들것이 복도를 달려온다! 병실 안으로 피해!", a = { 58, 0 }, b = { -77, 0 }, zone = { -79.5, -6.6, 62, 6.6 } }

local function hospRush(n, first, gapMin, gapMax)
	local cfg = {}
	for k, v in pairs(HOSP_RUSH) do cfg[k] = v end
	cfg.first = first
	cfg.gapMin = gapMin
	cfg.gapMax = gapMax
	cfg.active = function() return not ctx.isOpen(n) end
	rush(n, cfg)
end

local function floorB6()
	local n = -6
	local st = { stage = 0, callAt = 0 }
	onReset(function()
		st.stage = 0
		st.callAt = 0
	end)
	local ticket = ctx.anchors(n, "Ticket")[1]
	local doc = ctx.anchors(n, "Doc")[1]
	if not ticket or not doc then return end
	local disp = part({ Name = "NumberDispenser", Size = Vector3.new(1.8, 2.4, 0.8), Color = Color3.fromRGB(200, 60, 50), Material = Enum.Material.Metal,
		CFrame = ticket.CFrame })
	local screen = surface2(disp, "번호표", WHITE, Color3.fromRGB(150, 30, 30))
	local pp = ctx.prompt(disp, "번호표 뽑기", "접수 번호표", 0.6)
	pp.Triggered:Connect(function(player)
		if st.stage ~= 0 or ctx.isOpen(n) then return end
		st.stage = 1
		st.callAt = os.clock() + 14
		ctx.playAt(disp, SND_PING, 1, 1)
		ctx.say(nil, player.DisplayName .. " · 대기번호 088번. 호출될 때까지 버텨라", "key")
		progress(n, "대기번호 088번 — 호출을 기다려라. 복도에 들것이 지나간다")
	end)
	local folderPart = part({ Name = "MedicalRecord", Size = Vector3.new(1.6, 2.0, 0.1), Color = Color3.fromRGB(170, 200, 230), CFrame = doc.CFrame })
	surface2(folderPart, "진료\n기록", Color3.fromRGB(20, 40, 80))
	glow(folderPart, BLUE, 9, 0.9)
	billboard(folderPart, "진료실", BLUE, 6, 1.2, 60)
	spin(n, folderPart)
	local dp = ctx.prompt(folderPart, "서류 받기", "진료 기록", 1.0)
	dp.Triggered:Connect(function(player)
		if ctx.isOpen(n) then return end
		if st.stage < 2 then
			ctx.say(player, if st.stage == 0 then "접수부터 하세요. 로비에서 번호표를 뽑아야 한다" else "아직 호출되지 않았다. 기다려라", "alert")
			return
		end
		ctx.playAt(folderPart, SND_PING, 1, 1.3)
		ctx.say(nil, "진료 기록: \"환자명 — 당신\". 서류 사이에 출입 카드가 끼어 있다", "key")
		ctx.openFloor(n, player)
	end)
	every(0.5, function()
		if st.stage == 1 then
			local left = math.ceil(st.callAt - os.clock())
			if left <= 0 then
				st.stage = 2
				setTexts(screen, "088\n호출")
				ctx.fx(n, "banner", "딩동— 088번 고객님, 복도 끝 진료실로 오세요", 4, "key")
				progress(n, "호출됐다. 복도 서쪽 진료실에서 진료 기록을 받아라")
			else
				setTexts(screen, "088\n" .. left .. "초")
			end
		elseif st.stage == 0 then
			setTexts(screen, "번호표")
		end
	end)
	hospRush(n, 10, 12, 20)
end

local function floorLevers(n, objective)
	levers(n, ctx.anchors(n, "Lever"), {
		name = "비상 발전기", objective = objective,
		onAll = function(player)
			ctx.say(nil, "비상 발전기 가동. 창살 잠금이 풀렸다", "key")
			ctx.openFloor(n, player)
		end,
	})
end

local function floorB8()
	local n = -8
	local st = { hits = 0 }
	onReset(function() st.hits = 0 end)
	local a = ctx.anchors(n, "Machine")[1]
	if not a then return end
	local p = part({ Name = "Defibrillator", Size = Vector3.new(2.6, 2.2, 1.4), Color = Color3.fromRGB(230, 120, 40), Material = Enum.Material.Metal,
		CFrame = a.CFrame, CanCollide = true })
	surface2(p, "제세동기\n⚡", WHITE, Color3.fromRGB(180, 70, 20))
	glow(p, Color3.fromRGB(255, 150, 60), 10, 1)
	local pp = ctx.prompt(p, "충전하기", "제세동기", 0)
	timings.defib = { n = n, part = p, st = st, need = 3 }
	pp.Triggered:Connect(function(player)
		if ctx.isOpen(n) then return end
		ctx.fx(player, "timing", "defib", "제세동기 — 초록 칸에서 누르기 (" .. st.hits .. "/3)")
	end)
	hospRush(n, 12, 11, 18)
end

local function floorB10()
	local n = -10
	mannequins(n, ctx.anchors(n, "Mannequin"), Color3.fromRGB(196, 214, 210), 10)
	blackout(n, { first = 10, gapMin = 8, gapMax = 14, dur = 3.4, text = "수술실 무영등이 깜빡인다… 환자복 마네킹에게서 떨어져라",
		active = function() return not ctx.isOpen(n) end })
end

local function floorB11()
	local n = -11
	local st = { code = "000" }
	local rooms = { "첫 번째 차트", "두 번째 차트", "세 번째 차트" }
	onReset(function() st.code = string.format("%03d", math.random(0, 999)) end)
	for i, a in ipairs(ctx.anchors(n, "Note")) do
		if i <= 3 then
			makeNote(n, a, function()
				return "환자 차트 (" .. rooms[i] .. ")\n\n환자명: ■■■\n기록보관실 암호 " .. i .. "번째 숫자:  [ " .. string.sub(st.code, i, i) .. " ]\n\n차트는 모두 3장."
			end, "환자 차트")
		end
	end
	local pad = ctx.anchors(n, "Keypad")[1]
	if pad then
		makeKeypad(n, pad, "records", "기록보관실 잠금 (3자리)", 3, function() return st.code end, function(player)
			ctx.say(nil, player.DisplayName .. " · 기록보관실이 열렸다", "key")
			ctx.openFloor(n, player)
		end, function(player)
			ctx.say(player, "삐빅— 틀렸다. 차트 3장을 순서대로", "alert")
		end)
	end
	hospRush(n, 12, 12, 19)
end

-- ---------------------------------------------------------------- 내핵: 용암 기둥
local function floorCore()
	falling("core", { interval = 1.6, warn = 1.3, radius = 3.4, lead = 0.8, spread = 5, from = -26, size = Vector3.new(4, 30, 4),
		color = Color3.fromRGB(255, 120, 30), material = Enum.Material.Neon, cause = "geyser" })
end

-- ---------------------------------------------------------------- module
function M.canPressExit(n)
	local lock = exitLocks[n]
	if lock then return lock() end
	return true
end

function M.onInput(player, kind, a, b)
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then return end
	if kind == "keypad" then
		local k = keypads[a]
		if not k or type(b) ~= "string" or ctx.isOpen(k.n) then return end
		if (hrp.Position - k.part.Position).Magnitude > 18 then return end
		if os.clock() < k.lockUntil then
			ctx.say(player, "잠깐 잠겼다…", "alert")
			return
		end
		if b == k.getCode() then
			ctx.playAt(k.part, SND_PING, 1, 1.5)
			k.onOk(player)
		else
			k.lockUntil = os.clock() + 2
			ctx.playAt(k.part, SND_BUZZ, 1, 1)
			k.onFail(player)
		end
	elseif kind == "timing" then
		local m = timings[a]
		if not m or ctx.isOpen(m.n) then return end
		if (hrp.Position - m.part.Position).Magnitude > 18 then return end
		if b == true then
			m.st.hits += 1
			ctx.playAt(m.part, SND_PING, 1, 1 + m.st.hits * 0.2)
			if m.st.hits >= m.need then
				ctx.fx(player, "closeUi")
				ctx.say(nil, player.DisplayName .. " · 삐— 삐— 심장이 다시 뛴다. 창살이 열렸다", "key")
				ctx.openFloor(m.n, player)
			else
				progress(m.n, "제세동기 충전 " .. m.st.hits .. "/" .. m.need .. " — 초록 칸에서 눌러라")
			end
		else
			m.st.hits = math.max(0, m.st.hits - 1)
			ctx.playAt(m.part, SND_BUZZ, 1, 1.2)
			progress(m.n, "빗나갔다. 제세동기 충전 " .. m.st.hits .. "/" .. m.need)
		end
	end
end

function M.reset()
	for _, fn in ipairs(resets) do
		local ok, err = pcall(fn)
		if not ok then warn("[Floors] reset:", err) end
	end
end

function M.start(c)
	ctx = c
	folder = Instance.new("Folder")
	folder.Name = "PSI_Runtime"
	folder.Parent = workspace
	local builders = {
		{ 88, floor88 }, { 87, floor87 }, { 80, floor80 }, { 77, floor77 }, { 70, floor70 }, { 66, floor66 }, { 60, floor60 },
		{ 50, floor50 }, { 44, floor44 }, { 40, floor40 }, { 30, floor30 }, { 20, floor20 }, { 10, floor10 }, { 8, floor8 },
		{ -1, floorB1 }, { -2, floorB2 }, { -3, floorB3 }, { -6, floorB6 },
		{ -7, function() floorLevers(-7, "병실 어딘가의 비상 발전기 3대를 켜라. 들것이 오면 병실로") hospRush(-7, 12, 12, 20) end },
		{ -8, floorB8 }, { -10, floorB10 }, { -11, floorB11 },
		{ -12, function() floorLevers(-12, "격리병동 비상 발전기 3대를 켜라. 들것이 더 자주 온다") hospRush(-12, 8, 8, 13) end },
		{ "core", floorCore },
	}
	for _, b in ipairs(builders) do
		local ok, err = pcall(b[2])
		if not ok then warn("[Floors] " .. tostring(b[1]) .. "층 장치 실패:", err) end
	end
	-- hovering pick-ups turn slowly, only on floors somebody is on
	every(0.1, function()
		local busy = {}
		for _, e in ipairs(ctx.alive(nil)) do
			if e.floor ~= nil then busy[e.floor] = true end
		end
		local t = os.clock()
		for _, s in ipairs(spinners) do
			if busy[s.n] and s.part.Transparency < 1 then
				s.part.CFrame = s.cf * CFrame.new(0, math.sin(t * 2) * s.bob, 0) * CFrame.Angles(0, t * 1.1, 0)
			end
		end
	end)
	print("[PSI] 층별 장치 준비 완료")
end

return M
