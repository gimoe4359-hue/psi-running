-- 싸이 뛰어! 나폴리탄 괴담: 송천고 야간 경비 — 클라이언트
-- 인트로(차 타고 학교로), 화면 UI(시계·정신력·순찰), 근무 수칙 종이, 손전등, 효과, 엔딩

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local Lighting = game:GetService("Lighting")

local player = Players.LocalPlayer
local Config = require(ReplicatedStorage:WaitForChild("Config"))
local remotes = ReplicatedStorage:WaitForChild("NightShiftRemotes")
local Subtitle = remotes:WaitForChild("Subtitle")
local IntroFinished = remotes:WaitForChild("IntroFinished")
local ChairGaze = remotes:WaitForChild("ChairGaze")
local Effect = remotes:WaitForChild("Effect")
local Ending = remotes:WaitForChild("Ending")

local camera = workspace.CurrentCamera

-- ═════════════════════════ UI ═════════════════════════
local function make(class, props, parent)
	local o = Instance.new(class)
	for k, v in pairs(props) do
		o[k] = v
	end
	o.Parent = parent
	return o
end
local function corner(parent, r)
	make("UICorner", { CornerRadius = UDim.new(0, r or 10) }, parent)
end

local gui = make("ScreenGui", { Name = "NightShiftUI", IgnoreGuiInset = true, ResetOnSpawn = false, DisplayOrder = 10, ZIndexBehavior = Enum.ZIndexBehavior.Sibling }, player:WaitForChild("PlayerGui"))

local fade = make("Frame", { Name = "Fade", Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0, BorderSizePixel = 0, ZIndex = 50 }, gui)
local title = make("TextLabel", { Size = UDim2.fromScale(1, 0.16), Position = UDim2.fromScale(0, 0.36), BackgroundTransparency = 1, Font = Enum.Font.GothamBlack, Text = "싸이 뛰어!", TextColor3 = Color3.fromRGB(235, 235, 240), TextScaled = true, TextTransparency = 1, ZIndex = 51 }, gui)
local subTitle = make("TextLabel", { Size = UDim2.fromScale(1, 0.06), Position = UDim2.fromScale(0, 0.53), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, Text = "나폴리탄 괴담 · 송천고등학교 야간 경비", TextColor3 = Color3.fromRGB(200, 60, 60), TextScaled = true, TextTransparency = 1, ZIndex = 51 }, gui)
local loading = make("TextLabel", { Size = UDim2.fromScale(1, 0.04), Position = UDim2.fromScale(0, 0.9), BackgroundTransparency = 1, Font = Enum.Font.Gotham, Text = "학교를 불러오는 중…", TextColor3 = Color3.fromRGB(150, 150, 160), TextScaled = true, ZIndex = 51 }, gui)

local barTop = make("Frame", { Size = UDim2.fromScale(1, 0.11), Position = UDim2.fromScale(0, -0.11), BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, ZIndex = 30 }, gui)
local barBottom = make("Frame", { Size = UDim2.fromScale(1, 0.11), Position = UDim2.fromScale(0, 1), BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, ZIndex = 30 }, gui)
local skipBtn = make("TextButton", { Size = UDim2.new(0, 150, 0, 40), Position = UDim2.new(1, -170, 0, 20), BackgroundColor3 = Color3.fromRGB(20, 20, 24), BackgroundTransparency = 0.3, Font = Enum.Font.GothamBold, Text = "건너뛰기 ▶", TextColor3 = Color3.new(1, 1, 1), TextSize = 18, Visible = false, ZIndex = 55 }, gui)
corner(skipBtn, 8)

local subtitle = make("TextLabel", { Size = UDim2.new(0.84, 0, 0, 44), Position = UDim2.new(0.08, 0, 0.82, 0), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, Text = "", TextColor3 = Color3.new(1, 1, 1), TextScaled = true, TextWrapped = true, TextStrokeTransparency = 0.35, TextTransparency = 1, ZIndex = 45 }, gui)
make("UITextSizeConstraint", { MaxTextSize = 28 }, subtitle)

local hurt = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(160, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 40 }, gui)
local static = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(120, 120, 130), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 41 }, gui)
local scare = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 42, Visible = false }, gui)
make("TextLabel", { Size = UDim2.fromScale(1, 0.5), Position = UDim2.fromScale(0, 0.25), BackgroundTransparency = 1, Font = Enum.Font.GothamBlack, Text = "봤 지 ?", TextColor3 = Color3.fromRGB(200, 0, 0), TextScaled = true, ZIndex = 43 }, scare)

-- HUD
-- 화면 가장자리 어둡게 (비네트)
local vignette = make("Frame", { Name = "Vignette", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, ZIndex = 5 }, gui)
for i, spec in ipairs({ { UDim2.fromScale(1, 0.32), UDim2.fromScale(0, 0), 90 }, { UDim2.fromScale(1, 0.32), UDim2.fromScale(0, 0.68), -90 },
	{ UDim2.fromScale(0.26, 1), UDim2.fromScale(0, 0), 0 }, { UDim2.fromScale(0.26, 1), UDim2.fromScale(0.74, 0), 180 } }) do
	local f = make("Frame", { Size = spec[1], Position = spec[2], BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, ZIndex = 5 }, vignette)
	make("UIGradient", { Rotation = spec[3], Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.25), NumberSequenceKeypoint.new(1, 1) }) }, f)
	f.Name = "Edge" .. i
end
local hud = make("Frame", { Size = UDim2.new(0, 270, 0, 108), Position = UDim2.new(0, 22, 1, -130), BackgroundTransparency = 1, Visible = false, ZIndex = 20 }, gui)
corner(hud, 12)
local clockLabel = make("TextLabel", { Size = UDim2.new(1, -24, 0, 34), Position = UDim2.new(0, 12, 0, 8), BackgroundTransparency = 1, Font = Enum.Font.Code, Text = "PM 10:00", TextColor3 = Color3.fromRGB(230, 236, 240), TextTransparency = 0.25, TextStrokeTransparency = 0.6, TextSize = 26, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
make("TextLabel", { Size = UDim2.new(0, 60, 0, 16), Position = UDim2.new(0, 12, 0, 48), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, Text = "정신력", TextColor3 = Color3.fromRGB(200, 200, 210), TextSize = 14, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
local barBg = make("Frame", { Size = UDim2.new(1, -86, 0, 12), Position = UDim2.new(0, 72, 0, 50), BackgroundColor3 = Color3.fromRGB(40, 40, 48), BorderSizePixel = 0, ZIndex = 21 }, hud)
corner(barBg, 6)
local barFill = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(110, 220, 130), BorderSizePixel = 0, ZIndex = 22 }, barBg)
corner(barFill, 6)
local patrolLabel = make("TextLabel", { Size = UDim2.new(1, -24, 0, 20), Position = UDim2.new(0, 12, 0, 74), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, Text = "", TextColor3 = Color3.fromRGB(220, 220, 230), TextSize = 16, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
local hint = make("TextLabel", { Size = UDim2.new(0, 460, 0, 22), Position = UDim2.new(0, 24, 0, 20), BackgroundTransparency = 1, Font = Enum.Font.Gotham, Text = "[R] 근무 수칙   [F] 손전등   [Shift] 달리기", TextColor3 = Color3.fromRGB(170, 170, 185), TextSize = 15, TextXAlignment = Enum.TextXAlignment.Left, Visible = false, ZIndex = 20 }, gui)

-- 근무 수칙 수첩 (손글씨: RuleStrokes 의 획을 얇은 막대로 그린다 → 한글도 진짜 손글씨처럼 보임)
local RuleStrokes = require(ReplicatedStorage:WaitForChild("RuleStrokes"))
local INK = Color3.fromRGB(28, 34, 74)
local RED_INK = Color3.fromRGB(170, 14, 14)
-- parent 안에 한 쪽을 그린다. x0,y0: 첫 줄 왼쪽 위(px), em: 글자 크기(px), gap: 줄 간격(px). 9번 줄들은 따로 묶어서 돌려준다
local function drawRulePage(parent, pageIndex, x0, y0, em, gap, z)
	local nineGroup = make("Frame", { Name = "Nine", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Visible = false, ZIndex = z }, parent)
	for li, line in ipairs(RuleStrokes[pageIndex] or {}) do
		local isNine = line.kind == "nine"
		local scale = line.kind == "title" and 1.25 or 1
		local holder = isNine and nineGroup or parent
		local color = isNine and RED_INK or INK
		local th = math.max(1.5, em * scale * 0.075)
		local lx = x0 + line.indent * em
		local ly = y0 + (li - 0.5) * gap
		for _, st in ipairs(line.strokes) do
			for k = 1, #st - 3, 2 do
				local ax, ay = lx + st[k] * em * scale, ly + st[k + 1] * em * scale
				local bx, by = lx + st[k + 2] * em * scale, ly + st[k + 3] * em * scale
				local dx, dy = bx - ax, by - ay
				local len = math.sqrt(dx * dx + dy * dy)
				make("Frame", {
					AnchorPoint = Vector2.new(0.5, 0.5),
					Position = UDim2.fromOffset((ax + bx) / 2, (ay + by) / 2),
					Size = UDim2.fromOffset(len + th * 0.8, th),
					Rotation = math.deg(math.atan2(dy, dx)),
					BackgroundColor3 = color,
					BorderSizePixel = 0,
					ZIndex = z,
				}, holder)
			end
		end
	end
	return nineGroup
end
local function notebookPage(parent, pos, size, z, lineGap, firstLine)
	local pg = make("Frame", { Position = pos, Size = size, BackgroundColor3 = Color3.fromRGB(250, 246, 230), BorderSizePixel = 0, ZIndex = z }, parent)
	for i = 1, 14 do
		make("Frame", { Position = UDim2.new(0, 0, 0, firstLine + i * lineGap), Size = UDim2.new(1, 0, 0, 1), BackgroundColor3 = Color3.fromRGB(150, 180, 214), BackgroundTransparency = 0.35, BorderSizePixel = 0, ZIndex = z }, pg)
	end
	make("Frame", { Position = UDim2.new(0, 34, 0, 0), Size = UDim2.new(0, 1, 1, 0), BackgroundColor3 = Color3.fromRGB(220, 110, 110), BackgroundTransparency = 0.3, BorderSizePixel = 0, ZIndex = z }, pg)
	return pg
end
local paper = make("Frame", { Name = "Notebook", AnchorPoint = Vector2.new(0.5, 0.5), Size = UDim2.new(0, 820, 0, 560), Position = UDim2.fromScale(0.5, 0.5), BackgroundColor3 = Color3.fromRGB(44, 52, 86), Visible = false, ZIndex = 60 }, gui)
corner(paper, 10)
local paperScale = make("UIScale", {}, paper)
local function fitNotebook()
	local v = camera.ViewportSize
	paperScale.Scale = math.min(1, v.X / 860, v.Y / 600)
end
fitNotebook()
camera:GetPropertyChangedSignal("ViewportSize"):Connect(fitNotebook)
local pageL = notebookPage(paper, UDim2.new(0, 14, 0, 14), UDim2.new(0, 392, 0, 480), 61, 32, 26)
local pageR = notebookPage(paper, UDim2.new(0, 414, 0, 14), UDim2.new(0, 392, 0, 480), 61, 32, 26)
make("Frame", { Position = UDim2.new(0, 404, 0, 14), Size = UDim2.new(0, 12, 0, 480), BackgroundColor3 = Color3.fromRGB(196, 188, 166), BorderSizePixel = 0, ZIndex = 62 }, paper)
for i = 0, 11 do
	local ring = make("Frame", { Position = UDim2.new(0, 398, 0, 30 + i * 40), Size = UDim2.new(0, 24, 0, 7), BackgroundColor3 = Color3.fromRGB(170, 174, 180), BorderSizePixel = 0, ZIndex = 63 }, paper)
	corner(ring, 4)
end
drawRulePage(pageL, 1, 44, 26, 25, 32, 62)
local nine = drawRulePage(pageR, 2, 44, 26, 25, 32, 62)
local closeBtn = make("TextButton", { Size = UDim2.new(0, 160, 0, 36), Position = UDim2.new(0.5, -80, 1, -50), BackgroundColor3 = Color3.fromRGB(226, 216, 190), Font = Enum.Font.GothamBold, Text = "수첩 덮기 (R)", TextColor3 = Color3.fromRGB(40, 34, 28), TextSize = 16, ZIndex = 62 }, paper)
corner(closeBtn, 6)
closeBtn.Modal = true -- 1인칭에서도 마우스로 누를 수 있게

-- 엔딩
local endPanel = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 1, Visible = false, ZIndex = 70 }, gui)
local endTitle = make("TextLabel", { Size = UDim2.new(0.8, 0, 0.1, 0), Position = UDim2.fromScale(0.1, 0.26), BackgroundTransparency = 1, Font = Enum.Font.GothamBlack, Text = "", TextColor3 = Color3.fromRGB(220, 50, 50), TextScaled = true, ZIndex = 71 }, endPanel)
local endBody = make("TextLabel", { Size = UDim2.new(0.7, 0, 0.3, 0), Position = UDim2.fromScale(0.15, 0.42), BackgroundTransparency = 1, Font = Enum.Font.Gotham, Text = "", TextColor3 = Color3.fromRGB(225, 225, 230), TextScaled = true, TextWrapped = true, ZIndex = 71 }, endPanel)
make("UITextSizeConstraint", { MaxTextSize = 26 }, endBody)

-- 모바일 버튼
local mobile = make("Frame", { Size = UDim2.new(0, 96, 0, 112), Position = UDim2.new(1, -112, 0.38, 0), BackgroundTransparency = 1, Visible = false, ZIndex = 20 }, gui)
local rulesBtn = make("TextButton", { Size = UDim2.new(1, 0, 0, 50), BackgroundColor3 = Color3.fromRGB(242, 234, 208), Font = Enum.Font.GothamBold, Text = "수칙", TextColor3 = Color3.fromRGB(40, 30, 24), TextSize = 18, ZIndex = 21 }, mobile)
corner(rulesBtn, 10)
local flashBtn = make("TextButton", { Size = UDim2.new(1, 0, 0, 50), Position = UDim2.new(0, 0, 0, 60), BackgroundColor3 = Color3.fromRGB(30, 34, 46), Font = Enum.Font.GothamBold, Text = "손전등", TextColor3 = Color3.new(1, 1, 1), TextSize = 18, ZIndex = 21 }, mobile)
corner(flashBtn, 10)

-- ═════════════════════════ 도구 함수 ═════════════════════════
local function tween(obj, t, props, style)
	local tw = TweenService:Create(obj, TweenInfo.new(t, style or Enum.EasingStyle.Sine), props)
	tw:Play()
	return tw
end

local COLORS = {
	white = Color3.new(1, 1, 1),
	red = Color3.fromRGB(255, 95, 95),
	green = Color3.fromRGB(140, 235, 150),
	yellow = Color3.fromRGB(255, 220, 110),
	static = Color3.fromRGB(190, 200, 255),
}
local subToken = 0
local function showSubtitle(text, seconds, color)
	subToken = subToken + 1
	local my = subToken
	subtitle.Text = text
	subtitle.TextColor3 = COLORS[color or "white"] or COLORS.white
	subtitle.TextTransparency = 0
	subtitle.TextStrokeTransparency = 0.35
	task.delay(seconds or 4, function()
		if my == subToken then
			tween(subtitle, 0.6, { TextTransparency = 1, TextStrokeTransparency = 1 })
		end
	end)
end
Subtitle.OnClientEvent:Connect(showSubtitle)

local function humanoid()
	local ch = player.Character
	return ch and ch:FindFirstChildOfClass("Humanoid")
end

local shakeUntil, shakePower = 0, 0
local function shake(seconds, power)
	shakeUntil = math.max(shakeUntil, os.clock() + seconds)
	shakePower = power
end
-- 1인칭: 걸을 때 화면이 살짝 흔들리고(머리 흔들림), Shift로 달리기(체력 있음)
local sprinting, stamina = false, Config.STAMINA_SECONDS
local bobT, bobAmt = 0, 0
local inFirstPerson = false
RunService.RenderStepped:Connect(function(dt)
	local hum = humanoid()
	if not hum then
		return
	end
	local moving = hum.MoveDirection.Magnitude > 0.1 and hum.FloorMaterial ~= Enum.Material.Air
	local running = sprinting and moving and stamina > 0
	if inFirstPerson then
		if running then
			stamina = math.max(0, stamina - dt)
		else
			stamina = math.min(Config.STAMINA_SECONDS, stamina + dt * 0.6)
		end
		hum.WalkSpeed = running and Config.SPRINT_SPEED or Config.WALK_SPEED
	end
	bobAmt = bobAmt + ((moving and 1 or 0) - bobAmt) * math.min(1, dt * 8)
	bobT = bobT + dt * (running and 13 or 8.5)
	local amp = running and 1.6 or 1
	local offset = Vector3.new(math.sin(bobT) * 0.07 * amp, math.abs(math.cos(bobT)) * 0.11 * amp - 0.05, 0) * bobAmt
	if os.clock() < shakeUntil then
		offset = offset + Vector3.new((math.random() - 0.5) * shakePower, (math.random() - 0.5) * shakePower, 0)
	end
	hum.CameraOffset = inFirstPerson and offset or Vector3.new()
end)

Effect.OnClientEvent:Connect(function(kind)
	if kind == "hurt" then
		hurt.BackgroundTransparency = 0.55
		tween(hurt, 0.9, { BackgroundTransparency = 1 })
		shake(0.35, 0.5)
	elseif kind == "shake" then
		shake(0.7, 0.35)
	elseif kind == "static" then
		task.spawn(function()
			for _ = 1, 14 do
				static.BackgroundTransparency = 0.45 + math.random() * 0.5
				static.BackgroundColor3 = Color3.fromRGB(math.random(80, 160), math.random(80, 160), math.random(80, 170))
				task.wait(0.05)
			end
			static.BackgroundTransparency = 1
		end)
	elseif kind == "jumpscare" then
		scare.Visible = true
		scare.BackgroundTransparency = 0
		shake(0.6, 1.2)
		task.delay(0.55, function()
			tween(scare, 0.5, { BackgroundTransparency = 1 })
			task.wait(0.5)
			scare.Visible = false
		end)
	end
end)

-- 근무 수칙 열고 닫기 (가끔 9번이 보였다가 사라진다)
local function setRules(open)
	paper.Visible = open
	if open and math.random() < 0.3 then
		task.delay(0.8, function()
			nine.Visible = true
			task.wait(1.1)
			nine.Visible = false
		end)
	end
end
closeBtn.MouseButton1Click:Connect(function()
	setRules(false)
end)
rulesBtn.MouseButton1Click:Connect(function()
	setRules(not paper.Visible)
end)

-- 경비실 책상 위 수첩: 펼친 두 쪽에 같은 손글씨, "수첩 보기"로 크게 본다
do
	local CS = game:GetService("CollectionService")
	for _, pg in ipairs(CS:GetTagged("RulesNotebookPage")) do
		local idx = pg:GetAttribute("Page") or 1
		local pps = 150
		local sg = make("SurfaceGui", { Name = "Handwriting", Face = Enum.NormalId.Top, SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud, PixelsPerStud = pps, LightInfluence = 1, ResetOnSpawn = false, Adornee = pg }, player:WaitForChild("PlayerGui"))
		local w, h = pg.Size.X * pps, pg.Size.Z * pps
		local holder = make("Frame", { Size = UDim2.fromOffset(w, h), BackgroundTransparency = 1 }, sg)
		local gap = h / 15.5
		drawRulePage(holder, idx, w * 0.1, gap * 0.9, gap * 0.78, gap, 1)
	end
	local book = CS:GetTagged("RulesNotebook")[1]
	if book then
		local pr = make("ProximityPrompt", { ActionText = "수첩 보기", ObjectText = "근무 수칙 수첩", HoldDuration = 0, MaxActivationDistance = 8, RequiresLineOfSight = false }, book)
		pr.Triggered:Connect(function()
			if player:GetAttribute("IntroDone") then
				setRules(true)
			end
		end)
	end
end

-- ═════════════════════════ 손전등 ═════════════════════════
local flashPart = make("Part", { Name = "MyFlashlight", Anchored = true, CanCollide = false, CanQuery = false, CanTouch = false, Transparency = 1, Size = Vector3.new(0.2, 0.2, 0.2), CastShadow = false }, workspace)
local flash = make("SpotLight", { Face = Enum.NormalId.Front, Range = 60, Angle = 50, Brightness = 3.2, Color = Color3.fromRGB(255, 240, 215), Shadows = true, Enabled = false }, flashPart)
local flashWanted = true
local function setFlash(on)
	flashWanted = on
	flash.Enabled = on and player:GetAttribute("IntroDone") == true
	flashBtn.BackgroundColor3 = on and Color3.fromRGB(200, 170, 80) or Color3.fromRGB(30, 34, 46)
end
flashBtn.MouseButton1Click:Connect(function()
	setFlash(not flashWanted)
end)
player:GetAttributeChangedSignal("IntroDone"):Connect(function()
	setFlash(flashWanted)
end)
player.CameraMaxZoomDistance = 16
RunService.RenderStepped:Connect(function()
	flashPart.CFrame = camera.CFrame * CFrame.new(0.9, -0.8, 0)
end)

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end
	if input.KeyCode == Enum.KeyCode.R then
		if player:GetAttribute("IntroDone") then
			setRules(not paper.Visible)
		end
	elseif input.KeyCode == Enum.KeyCode.F then
		setFlash(not flashWanted)
	end
end)

-- ═════════════════════════ 시계 · 정신력 · 순찰 표시 ═════════════════════════
local sanityCC = make("ColorCorrectionEffect", { Name = "SanityCC" }, Lighting)
local hudTimer = 0
RunService.Heartbeat:Connect(function(dt)
	hudTimer = hudTimer + dt
	if hudTimer < 0.1 then
		return
	end
	hudTimer = 0
	local m = workspace:GetAttribute("ShiftMinutes") or 0
	local total = Config.SHIFT_START_HOUR * 60 + m
	local h = math.floor(total / 60) % 24
	local mm = math.floor(total % 60)
	local h12 = h % 12
	if h12 == 0 then
		h12 = 12
	end
	clockLabel.Text = string.format("%s %02d:%02d", h >= 12 and "PM" or "AM", h12, mm)
	local s = player:GetAttribute("Sanity") or 100
	barFill.Size = UDim2.fromScale(math.clamp(s / 100, 0, 1), 1)
	barFill.BackgroundColor3 = Color3.fromRGB(230, 70, 70):Lerp(Color3.fromRGB(110, 220, 130), s / 100)
	local marks = {}
	for f = 1, 3 do
		table.insert(marks, f .. "F " .. (player:GetAttribute("Patrol" .. f) and "✔" or "·"))
	end
	patrolLabel.Text = "순찰  " .. table.concat(marks, "   ")
	-- 정신력이 낮을수록 화면이 바래고 붉어진다
	local k = 1 - s / 100
	sanityCC.Saturation = -0.6 * k
	sanityCC.Contrast = 0.25 * k
	sanityCC.TintColor = Color3.new(1, 1 - 0.25 * k, 1 - 0.3 * k)
end)

-- ═════════════════════════ 의자를 쳐다보면 (수칙 5) ═════════════════════════
local gaze = 0
local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude
RunService.Heartbeat:Connect(function(dt)
	local chair = workspace:FindFirstChild("AnomalyChair")
	if not chair or not player:GetAttribute("IntroDone") then
		gaze = 0
		return
	end
	local pos = chair:GetPivot().Position + Vector3.new(0, 1.5, 0)
	local camPos = camera.CFrame.Position
	local to = pos - camPos
	if to.Magnitude > 260 then
		gaze = 0
		return
	end
	if camera.CFrame.LookVector:Dot(to.Unit) > 0.94 then
		rayParams.FilterDescendantsInstances = { player.Character, chair, flashPart }
		local hit = workspace:Raycast(camPos, to, rayParams)
		if not hit then
			gaze = gaze + dt
			if gaze >= 1 then
				gaze = 0
				ChairGaze:FireServer()
			end
			return
		end
	end
	gaze = math.max(0, gaze - dt)
end)

-- ═════════════════════════ 엔딩 ═════════════════════════
local ENDINGS = {
	CLEAR = { "생존 엔딩", "06:00. 창밖이 밝아 온다.\n근무 수칙을 끝까지 지켰다.\n…그런데 교대하러 온 경비원이, 나와 똑같은 얼굴이었다.", Color3.fromRGB(140, 220, 160) },
	GATE = { "배드 엔딩 · 정문", "06시 전에 정문을 열었다.\n문 밖에 서 있던 '학생'이 웃으며 들어왔다.\n\"고마워요, " .. Config.HERO_NAME .. " 씨. 이제 교대해요.\"", Color3.fromRGB(220, 50, 50) },
	SANITY = { "배드 엔딩 · 의자", "정신을 차려 보니 운동장 한가운데 의자에 앉아 있었다.\n경비실 쪽에서 누군가 나를 쳐다보고 있다.\n…새로 온 경비원인가 보다.", Color3.fromRGB(220, 50, 50) },
}
Ending.OnClientEvent:Connect(function(kind)
	local e = ENDINGS[kind] or ENDINGS.SANITY
	setRules(false)
	endTitle.Text = e[1]
	endTitle.TextColor3 = e[3]
	endBody.Text = e[2]
	endPanel.Visible = true
	endPanel.BackgroundTransparency = 1
	endTitle.TextTransparency = 1
	endBody.TextTransparency = 1
	tween(endPanel, 1.2, { BackgroundTransparency = 0 })
	task.wait(1)
	tween(endTitle, 1, { TextTransparency = 0 })
	tween(endBody, 1.5, { TextTransparency = 0 })
	task.wait(kind == "CLEAR" and 16 or 7.5)
	tween(endTitle, 0.8, { TextTransparency = 1 })
	tween(endBody, 0.8, { TextTransparency = 1 })
	tween(endPanel, 1.2, { BackgroundTransparency = 1 })
	task.wait(1.2)
	endPanel.Visible = false
end)

-- ═════════════════════════ 인트로: 차 타고 학교로 ═════════════════════════
while not workspace:GetAttribute("MapReady") do
	task.wait(0.2)
end
local school = workspace:WaitForChild("School")
loading.Text = ""

local function catmull(p0, p1, p2, p3, t)
	local t2, t3 = t * t, t * t * t
	return 0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3)
end
local samples, pathLength = {}, 0
do
	local pts = Config.INTRO_PATH
	local prev
	for i = 1, #pts - 1 do
		local p0, p1, p2, p3 = pts[math.max(i - 1, 1)], pts[i], pts[i + 1], pts[math.min(i + 2, #pts)]
		for k = 0, 19 do
			local pos = catmull(p0, p1, p2, p3, k / 20)
			if prev then
				pathLength = pathLength + (pos - prev).Magnitude
			end
			table.insert(samples, { pos = pos, d = pathLength })
			prev = pos
		end
	end
	local last = pts[#pts]
	pathLength = pathLength + (last - prev).Magnitude
	table.insert(samples, { pos = last, d = pathLength })
end
local function pointAt(d)
	d = math.clamp(d, 0, pathLength)
	for i = 1, #samples - 1 do
		local a, b = samples[i], samples[i + 1]
		if d <= b.d then
			local span = b.d - a.d
			local t = span > 0 and (d - a.d) / span or 0
			return a.pos:Lerp(b.pos, t)
		end
	end
	return samples[#samples].pos
end

local function moveGateLocal(gate, closedPivot, open, seconds)
	local v = Instance.new("CFrameValue")
	v.Value = gate:GetPivot()
	v.Changed:Connect(function(cf)
		gate:PivotTo(cf)
	end)
	local tw = tween(v, seconds, { Value = open and closedPivot * CFrame.new(-28, 0, 0) or closedPivot })
	tw.Completed:Connect(function()
		v:Destroy()
	end)
end

local function runIntro()
	local car = school:FindFirstChild("IntroCar")
	local gate = school:FindFirstChild("MainGate", true)
	if not car or not car.PrimaryPart then
		return
	end
	local parked = car:GetPivot()
	local carY = parked.Position.Y + 0.25
	local gateClosed = gate and gate:GetPivot()
	local skipped = false
	skipBtn.Visible = true
	local skipConn = skipBtn.MouseButton1Click:Connect(function()
		skipped = true
	end)

	camera.CameraType = Enum.CameraType.Scriptable
	tween(barTop, 1, { Position = UDim2.fromScale(0, 0) })
	tween(barBottom, 1, { Position = UDim2.fromScale(0, 0.89) })
	tween(title, 1.2, { TextTransparency = 0 })
	tween(subTitle, 1.2, { TextTransparency = 0 })

	local T = Config.INTRO_SECONDS
	local lineIndex = 1
	local gateOpened = false
	local t = 0
	local fadedIn = false
	local camPos = Vector3.new(-470, 30, 260)
	-- 운전석 눈 위치 (차 안에 DriverEye 파트가 있음)
	local eyePart
	for _, p in ipairs(car:GetDescendants()) do
		if p.Name == "DriverEye" then
			eyePart = p
		end
	end
	local eyeOffset = eyePart and parked:ToObjectSpace(eyePart.CFrame) or CFrame.new(-1.35, 3.0, 1.0)
	local dof = Instance.new("DepthOfFieldEffect")
	dof.FarIntensity = 0.35
	dof.NearIntensity = 0
	dof.Parent = Lighting
	while t < T and not skipped do
		local dt = RunService.RenderStepped:Wait()
		t = t + dt
		if camera.CameraType ~= Enum.CameraType.Scriptable then
			camera.CameraType = Enum.CameraType.Scriptable
		end
		if not fadedIn and t > 2.2 then
			fadedIn = true
			tween(title, 1, { TextTransparency = 1 })
			tween(subTitle, 1, { TextTransparency = 1 })
			tween(fade, 1.6, { BackgroundTransparency = 1 })
		end
		-- 차: 처음엔 빠르고 주차할 땐 천천히
		local u = math.clamp(t / T, 0, 1)
		local d = pathLength * (1 - (1 - u) * (1 - u))
		local p = pointAt(d)
		local ahead = pointAt(d + 3)
		local pos = Vector3.new(p.X, carY, p.Z)
		local look = Vector3.new(ahead.X, carY, ahead.Z)
		if (look - pos).Magnitude < 0.05 then
			look = pos + parked.LookVector
		end
		local carCF = CFrame.lookAt(pos, look)
		car:PivotTo(carCF)
		-- 대사
		local line = Config.INTRO_LINES[lineIndex]
		if line and t >= line[1] then
			showSubtitle(line[2], 3.8)
			lineIndex = lineIndex + 1
		end
		-- 정문이 저절로 열린다
		if gate and not gateOpened and t >= 14.6 then
			gateOpened = true
			moveGateLocal(gate, gateClosed, true, 2)
		end
		-- 카메라 연출: 운전석 시점 → 뒤따라가기 → 길 건너편 → 정문 안쪽 → 운전석 시점(주차)
		local povShot = (t < 8) or (t >= 21.5)
		if povShot then
			local sway = CFrame.Angles(math.sin(t * 1.3) * 0.01, math.sin(t * 0.7) * 0.012, 0)
			camera.FieldOfView = 64
			camera.CFrame = carCF * eyeOffset * sway * CFrame.Angles(math.rad(-3), 0, 0)
			camPos = camera.CFrame.Position
			dof.FocusDistance = 40
			dof.InFocusRadius = 40
		else
			local wantPos, target
			if t < 12.5 then
				wantPos = (carCF * CFrame.new(5, 3.2, 20)).Position
				target = pos + carCF.LookVector * 30 + Vector3.new(0, 2, 0)
			elseif t < 16 then
				wantPos = Vector3.new(-46, 4.5, 254)
				target = pos + Vector3.new(0, 2.5, 0)
			else
				wantPos = Vector3.new(-24, 6, 166)
				target = pos + Vector3.new(0, 2.5, 0)
			end
			if (wantPos - camPos).Magnitude > 40 then
				camPos = wantPos -- 컷 전환
			else
				camPos = camPos:Lerp(wantPos, math.min(1, dt * 4))
			end
			camera.FieldOfView = 50
			camera.CFrame = CFrame.lookAt(camPos, target)
			dof.FocusDistance = (target - camPos).Magnitude
			dof.InFocusRadius = 12
		end
	end
	skipConn:Disconnect()
	skipBtn.Visible = false
	car:PivotTo(parked)
	dof:Destroy()
	camera.FieldOfView = Config.FIELD_OF_VIEW

	tween(fade, 0.6, { BackgroundTransparency = 0 })
	task.wait(0.7)
	IntroFinished:FireServer()
	if gate and not gateOpened then
		moveGateLocal(gate, gateClosed, true, 0.01)
	end
	task.wait(0.9)
	camera.CameraType = Enum.CameraType.Custom
	local hum = humanoid()
	if hum then
		camera.CameraSubject = hum
	end
	tween(barTop, 0.8, { Position = UDim2.fromScale(0, -0.11) })
	tween(barBottom, 0.8, { Position = UDim2.fromScale(0, 1) })
	tween(fade, 1.4, { BackgroundTransparency = 1 })
	if gate then
		task.delay(0.3, function()
			moveGateLocal(gate, gateClosed, false, 1.4)
		end)
	end
	for _, line in ipairs(Config.AFTER_INTRO_LINES) do
		task.delay(line[1], function()
			showSubtitle(line[2], 3.6)
		end)
	end
end

if not player:GetAttribute("IntroDone") then
	runIntro()
else
	tween(fade, 1, { BackgroundTransparency = 1 })
end

-- 로블록스 기본 UI 숨기기 (채팅만 남김) + 1인칭 고정
pcall(function()
	local StarterGui = game:GetService("StarterGui")
	for _, t in ipairs({ Enum.CoreGuiType.PlayerList, Enum.CoreGuiType.Health, Enum.CoreGuiType.Backpack, Enum.CoreGuiType.EmotesMenu }) do
		StarterGui:SetCoreGuiEnabled(t, false)
	end
end)
player.CameraMode = Enum.CameraMode.LockFirstPerson
camera.FieldOfView = Config.FIELD_OF_VIEW
inFirstPerson = true
-- 다른 사람 머리 위 이름표 숨기기
local function hideName(ch)
	local h = ch:WaitForChild("Humanoid", 10)
	if h then
		h.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	end
end
for _, p in ipairs(Players:GetPlayers()) do
	if p.Character then
		task.spawn(hideName, p.Character)
	end
	p.CharacterAdded:Connect(hideName)
end
Players.PlayerAdded:Connect(function(p)
	p.CharacterAdded:Connect(hideName)
end)
-- 달리기
UserInputService.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.LeftShift then
		sprinting = true
	end
end)
UserInputService.InputEnded:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift then
		sprinting = false
	end
end)
hud.Visible = true
hint.Visible = true
task.delay(25, function()
	tween(hint, 2, { TextTransparency = 1 })
end)
mobile.Visible = UserInputService.TouchEnabled
setFlash(true)
task.delay(6.5, function()
	setRules(true)
end)

-- ═════════════════════════ CCTV ═════════════════════════
-- 경비실 책상에서 "CCTV 보기" → 카메라 6대를 실제 화면으로 본다 (A/D 전환, E 나가기).
-- 경비실 모니터 6개에도 각 카메라 화면이 실시간으로 나온다 (ViewportFrame).
local CollectionService = game:GetService("CollectionService")
local cams = {}
for _, c in ipairs(CollectionService:GetTagged("CCTVCam")) do
	table.insert(cams, c)
end
table.sort(cams, function(a, b)
	return (a:GetAttribute("Cam") or 0) < (b:GetAttribute("Cam") or 0)
end)
local camByIndex = {}
for _, c in ipairs(cams) do
	camByIndex[c:GetAttribute("Cam")] = c
end

local function stamp()
	local m = workspace:GetAttribute("ShiftMinutes") or 0
	local total = Config.SHIFT_START_HOUR * 60 + m
	local day = total >= 24 * 60 and 14 or 13
	local h = math.floor(total / 60) % 24
	local mm = math.floor(total % 60)
	local ss = math.floor((m * 60) % 60)
	return string.format("2026-11-%02d  %02d:%02d:%02d", day, h, mm, ss)
end

local cctvGui = make("Frame", { Name = "CCTV", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Visible = false, ZIndex = 35 }, gui)
for i = 0, 89 do
	make("Frame", { Size = UDim2.new(1, 0, 0, 2), Position = UDim2.new(0, 0, i / 90, 0), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.8, BorderSizePixel = 0, ZIndex = 36 }, cctvGui)
end
local cctvNoise = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(150, 155, 150), BackgroundTransparency = 0.95, BorderSizePixel = 0, ZIndex = 36 }, cctvGui)
local cctvLabel = make("TextLabel", { Position = UDim2.new(0, 40, 0, 30), Size = UDim2.new(0, 520, 0, 40), BackgroundTransparency = 1, Font = Enum.Font.Code, TextSize = 30, TextColor3 = Color3.fromRGB(235, 242, 235), TextXAlignment = Enum.TextXAlignment.Left, TextStrokeTransparency = 0.5, Text = "", ZIndex = 37 }, cctvGui)
local cctvRec = make("TextLabel", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -40, 0, 30), Size = UDim2.new(0, 200, 0, 40), BackgroundTransparency = 1, Font = Enum.Font.Code, TextSize = 30, TextColor3 = Color3.fromRGB(255, 50, 50), TextXAlignment = Enum.TextXAlignment.Right, Text = "● REC", ZIndex = 37 }, cctvGui)
local cctvTime = make("TextLabel", { Position = UDim2.new(0, 40, 1, -72), Size = UDim2.new(0, 620, 0, 36), BackgroundTransparency = 1, Font = Enum.Font.Code, TextSize = 26, TextColor3 = Color3.fromRGB(235, 242, 235), TextXAlignment = Enum.TextXAlignment.Left, TextStrokeTransparency = 0.5, Text = "", ZIndex = 37 }, cctvGui)
make("TextLabel", { AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -40, 1, -36), Size = UDim2.new(0, 600, 0, 30), BackgroundTransparency = 1, Font = Enum.Font.Gotham, TextSize = 18, TextColor3 = Color3.fromRGB(200, 212, 200), TextXAlignment = Enum.TextXAlignment.Right, Text = "◀ A    D ▶   카메라 바꾸기        E  나가기", ZIndex = 37 }, cctvGui)
local cctvExit = make("TextButton", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -40, 0, 80), Size = UDim2.new(0, 110, 0, 38), BackgroundColor3 = Color3.fromRGB(20, 24, 22), BackgroundTransparency = 0.3, Font = Enum.Font.GothamBold, TextSize = 18, TextColor3 = Color3.new(1, 1, 1), Text = "나가기", Modal = true, ZIndex = 38 }, cctvGui)
corner(cctvExit, 8)
local cctvPrev = make("TextButton", { Position = UDim2.new(0, 36, 0.5, -32), Size = UDim2.new(0, 64, 0, 64), BackgroundColor3 = Color3.fromRGB(20, 24, 22), BackgroundTransparency = 0.4, Font = Enum.Font.GothamBold, TextSize = 28, TextColor3 = Color3.new(1, 1, 1), Text = "◀", ZIndex = 38 }, cctvGui)
corner(cctvPrev, 32)
local cctvNext = make("TextButton", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -36, 0.5, -32), Size = UDim2.new(0, 64, 0, 64), BackgroundColor3 = Color3.fromRGB(20, 24, 22), BackgroundTransparency = 0.4, Font = Enum.Font.GothamBold, TextSize = 28, TextColor3 = Color3.new(1, 1, 1), Text = "▶", ZIndex = 38 }, cctvGui)
corner(cctvNext, 32)
local cctvCC = make("ColorCorrectionEffect", { Name = "CCTVCC", Enabled = false, Saturation = -0.9, Contrast = 0.32, Brightness = 0.05, TintColor = Color3.fromRGB(214, 236, 218) }, Lighting)
local cctvBlur = make("BlurEffect", { Name = "CCTVBlur", Enabled = false, Size = 2 }, Lighting)

local cctvOn, cctvIndex, cctvT = false, 1, 0
local cctvPrompt
local function cctvSwitch(dir)
	if #cams == 0 then
		return
	end
	cctvIndex = (cctvIndex - 1 + dir) % #cams + 1
	cctvNoise.BackgroundTransparency = 0.15
	tween(cctvNoise, 0.4, { BackgroundTransparency = 0.95 })
end
local function setCCTV(on)
	if on == cctvOn or #cams == 0 then
		return
	end
	cctvOn = on
	cctvGui.Visible = on
	cctvCC.Enabled = on
	cctvBlur.Enabled = on
	hud.Visible = not on
	vignette.Visible = not on
	local hum = humanoid()
	if on then
		inFirstPerson = false
		if hum then
			hum.WalkSpeed = 0
		end
		flash.Enabled = false
		camera.CameraType = Enum.CameraType.Scriptable
		cctvSwitch(0)
		if cctvPrompt then
			cctvPrompt.Enabled = false
		end
	else
		camera.CameraType = Enum.CameraType.Custom
		if hum then
			camera.CameraSubject = hum
			hum.WalkSpeed = Config.WALK_SPEED
		end
		camera.FieldOfView = Config.FIELD_OF_VIEW
		inFirstPerson = true
		setFlash(flashWanted)
		if cctvPrompt then
			cctvPrompt.Enabled = true
		end
	end
end
cctvExit.MouseButton1Click:Connect(function()
	setCCTV(false)
end)
cctvPrev.MouseButton1Click:Connect(function()
	cctvSwitch(-1)
end)
cctvNext.MouseButton1Click:Connect(function()
	cctvSwitch(1)
end)
UserInputService.InputBegan:Connect(function(input, processed)
	if not cctvOn then
		return
	end
	local k = input.KeyCode
	if k == Enum.KeyCode.A or k == Enum.KeyCode.Left then
		cctvSwitch(-1)
	elseif k == Enum.KeyCode.D or k == Enum.KeyCode.Right then
		cctvSwitch(1)
	elseif k == Enum.KeyCode.E or k == Enum.KeyCode.Q or k == Enum.KeyCode.Backspace then
		setCCTV(false)
	end
end)
RunService.RenderStepped:Connect(function(dt)
	if not cctvOn then
		return
	end
	cctvT = cctvT + dt
	local c = cams[cctvIndex]
	local pan = math.rad((c:GetAttribute("Pan") or 10) * math.sin(cctvT * 0.22))
	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = 72
	camera.CFrame = c.CFrame * CFrame.Angles(0, pan, 0)
	cctvLabel.Text = string.format("CAM %d   %s", c:GetAttribute("Cam") or cctvIndex, c:GetAttribute("Label") or "")
	cctvTime.Text = stamp()
	cctvRec.TextTransparency = (math.floor(cctvT * 1.4) % 2 == 0) and 0 or 1
	local alert = workspace:GetAttribute("CCTVAlert")
	if alert and alert == c:GetAttribute("Cam") and math.random() < 0.25 then
		cctvNoise.BackgroundTransparency = 0.55 + math.random() * 0.35
	elseif math.random() < 0.08 then
		cctvNoise.BackgroundTransparency = 0.88 + math.random() * 0.07
	end
end)
local rack = CollectionService:GetTagged("CCTVRack")[1]
if rack then
	cctvPrompt = make("ProximityPrompt", { ActionText = "CCTV 보기", ObjectText = "경비실 CCTV", HoldDuration = 0, MaxActivationDistance = 8, RequiresLineOfSight = false }, rack)
	cctvPrompt.Triggered:Connect(function()
		setCCTV(true)
	end)
end
-- 죽거나 엔딩이 나면 CCTV 모드에서 빠져나오기
player.CharacterAdded:Connect(function()
	if cctvOn then
		setCCTV(false)
	end
end)
Ending.OnClientEvent:Connect(function()
	if cctvOn then
		setCCTV(false)
	end
end)

-- 경비실 모니터 6개: 카메라가 보는 장면을 ViewportFrame으로 실시간 표시
local feeds = {}
task.spawn(function()
	local all = {}
	for i, p in ipairs(school:GetDescendants()) do
		if p:IsA("BasePart") and p.Transparency < 0.9 and p.Size.Magnitude > 0.35 then
			table.insert(all, p)
		end
		if i % 4000 == 0 then
			task.wait()
		end
	end
	for _, screen in ipairs(CollectionService:GetTagged("CCTVScreen")) do
		local c = camByIndex[screen:GetAttribute("Cam")]
		if c then
			local sg = make("SurfaceGui", { Name = "CCTVFeed", Face = Enum.NormalId.Front, Adornee = screen, SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud, PixelsPerStud = 80, LightInfluence = 0, Brightness = 1.1, ResetOnSpawn = false, Enabled = false }, player:WaitForChild("PlayerGui"))
			local vpf = make("ViewportFrame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), Ambient = Color3.fromRGB(105, 110, 105), LightColor = Color3.fromRGB(175, 180, 175), LightDirection = Vector3.new(-0.3, -1, 0.25), ImageColor3 = Color3.fromRGB(200, 222, 205) }, sg)
			local vcam = make("Camera", { FieldOfView = 72, CFrame = c.CFrame }, vpf)
			vpf.CurrentCamera = vcam
			local list = {}
			for _, p in ipairs(all) do
				local rel = c.CFrame:PointToObjectSpace(p.Position)
				local d = -rel.Z
				local r = p.Size.Magnitude / 2
				if d > -r and d < 95 and math.abs(rel.X) < d * 0.85 + r and math.abs(rel.Y) < d * 0.55 + r then
					table.insert(list, { p, r / (math.max(d, 1) + 4) })
				end
			end
			table.sort(list, function(a, b)
				return a[2] > b[2]
			end)
			for i = 1, math.min(420, #list) do
				local ok, cl = pcall(function()
					return list[i][1]:Clone()
				end)
				if ok and cl then
					for _, ch in ipairs(cl:GetChildren()) do
						if not ch:IsA("DataModelMesh") then
							ch:Destroy()
						end
					end
					cl.Parent = vpf
				end
				if i % 150 == 0 then
					task.wait()
				end
			end
			local dyn = make("Folder", { Name = "Dynamic" }, vpf)
			make("TextLabel", { Position = UDim2.new(0, 6, 0, 4), Size = UDim2.new(1, -12, 0.16, 0), BackgroundTransparency = 1, Font = Enum.Font.Code, TextScaled = true, TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(235, 242, 235), Text = string.format("CAM%d %s", c:GetAttribute("Cam"), c:GetAttribute("Label") or ""), ZIndex = 2 }, sg)
			local ts = make("TextLabel", { Position = UDim2.new(0, 6, 0.84, -4), Size = UDim2.new(1, -12, 0.14, 0), BackgroundTransparency = 1, Font = Enum.Font.Code, TextScaled = true, TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = Color3.fromRGB(235, 242, 235), Text = "", ZIndex = 2 }, sg)
			table.insert(feeds, { sg = sg, dyn = dyn, ts = ts, cam = c })
		end
	end
	local booth = CollectionService:GetTagged("BoothZone")[1]
	while true do
		local ch = player.Character
		local r = ch and ch:FindFirstChild("HumanoidRootPart")
		local near = booth and r and (r.Position - booth.Position).Magnitude < 45
		for _, f in ipairs(feeds) do
			f.sg.Enabled = near and not cctvOn
			if near then
				f.dyn:ClearAllChildren()
				for _, name in ipairs({ "AnomalyStudent", "CCTVGhost", "AnomalyChair" }) do
					local m = workspace:FindFirstChild(name)
					if m then
						local ok, cl = pcall(function()
							return m:Clone()
						end)
						if ok and cl then
							cl.Parent = f.dyn
						end
					end
				end
				f.ts.Text = stamp()
			end
		end
		task.wait(1)
	end
end)
