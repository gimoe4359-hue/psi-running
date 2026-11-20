-- 싸이 뛰어! 나폴리탄 괴담: 송천고 야간 경비 — 클라이언트
-- 로비·출근 차량(SUV 타고 학교로), 화면 UI(시계·정신력·순찰), 근무 수칙 종이, 손전등, 효과, 엔딩

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
local FlashToggle = remotes:WaitForChild("Flashlight")

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
local title = make("TextLabel", { Size = UDim2.fromScale(1, 0.16), Position = UDim2.fromScale(0, 0.36), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansExtraBold, Text = "싸이 뛰어!", TextColor3 = Color3.fromRGB(235, 235, 240), TextScaled = true, TextTransparency = 1, ZIndex = 51 }, gui)
local subTitle = make("TextLabel", { Size = UDim2.fromScale(1, 0.06), Position = UDim2.fromScale(0, 0.53), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansBold, Text = "나폴리탄 괴담 · 송천고등학교 야간 경비", TextColor3 = Color3.fromRGB(200, 60, 60), TextScaled = true, TextTransparency = 1, ZIndex = 51 }, gui)
local loading = make("TextLabel", { Size = UDim2.fromScale(1, 0.04), Position = UDim2.fromScale(0, 0.9), BackgroundTransparency = 1, Font = Enum.Font.BuilderSans, Text = "학교를 불러오는 중…", TextColor3 = Color3.fromRGB(150, 150, 160), TextScaled = true, ZIndex = 51 }, gui)

local barTop = make("Frame", { Size = UDim2.fromScale(1, 0.11), Position = UDim2.fromScale(0, -0.11), BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, ZIndex = 30 }, gui)
local barBottom = make("Frame", { Size = UDim2.fromScale(1, 0.11), Position = UDim2.fromScale(0, 1), BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, ZIndex = 30 }, gui)

local subtitle = make("TextLabel", { Size = UDim2.new(0.84, 0, 0, 44), Position = UDim2.new(0.08, 0, 0.82, 0), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansBold, Text = "", TextColor3 = Color3.new(1, 1, 1), TextScaled = true, TextWrapped = true, TextStrokeTransparency = 0.35, TextTransparency = 1, ZIndex = 45 }, gui)
make("UITextSizeConstraint", { MaxTextSize = 28 }, subtitle)

local hurt = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(160, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 40 }, gui)
local static = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(120, 120, 130), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 41 }, gui)
local scare = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 42, Visible = false }, gui)
make("TextLabel", { Size = UDim2.fromScale(1, 0.5), Position = UDim2.fromScale(0, 0.25), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansExtraBold, Text = "봤 지 ?", TextColor3 = Color3.fromRGB(200, 0, 0), TextScaled = true, ZIndex = 43 }, scare)

-- HUD
-- 화면 가장자리 어둡게 (비네트)
local vignette = make("Frame", { Name = "Vignette", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, ZIndex = 5 }, gui)
for i, spec in ipairs({ { UDim2.fromScale(1, 0.4), UDim2.fromScale(0, 0), 90 }, { UDim2.fromScale(1, 0.4), UDim2.fromScale(0, 0.6), -90 },
	{ UDim2.fromScale(0.34, 1), UDim2.fromScale(0, 0), 0 }, { UDim2.fromScale(0.34, 1), UDim2.fromScale(0.66, 0), 180 } }) do
	local f = make("Frame", { Size = spec[1], Position = spec[2], BackgroundColor3 = Color3.new(0, 0, 0), BorderSizePixel = 0, ZIndex = 5 }, vignette)
	make("UIGradient", { Rotation = spec[3], Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.02), NumberSequenceKeypoint.new(0.55, 0.7), NumberSequenceKeypoint.new(1, 1) }) }, f)
	f.Name = "Edge" .. i
end
-- 시계·정신력은 왼쪽 위 (폰의 이동 조이스틱과 안 겹치게)
local hud = make("Frame", { Size = UDim2.new(0, 270, 0, 108), Position = UDim2.new(0, 22, 0, 58), BackgroundTransparency = 1, Visible = false, ZIndex = 20 }, gui)
corner(hud, 12)
local clockLabel = make("TextLabel", { Size = UDim2.new(1, -24, 0, 34), Position = UDim2.new(0, 12, 0, 8), BackgroundTransparency = 1, Font = Enum.Font.Code, Text = "PM 10:00", TextColor3 = Color3.fromRGB(230, 236, 240), TextTransparency = 0.25, TextStrokeTransparency = 0.6, TextSize = 26, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
make("TextLabel", { Size = UDim2.new(0, 60, 0, 16), Position = UDim2.new(0, 12, 0, 48), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansBold, Text = "정신력", TextColor3 = Color3.fromRGB(200, 200, 210), TextSize = 14, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
local barBg = make("Frame", { Size = UDim2.new(1, -86, 0, 12), Position = UDim2.new(0, 72, 0, 50), BackgroundColor3 = Color3.fromRGB(40, 40, 48), BorderSizePixel = 0, ZIndex = 21 }, hud)
corner(barBg, 6)
local barFill = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(110, 220, 130), BorderSizePixel = 0, ZIndex = 22 }, barBg)
corner(barFill, 6)
local patrolLabel = make("TextLabel", { Size = UDim2.new(1, -24, 0, 20), Position = UDim2.new(0, 12, 0, 74), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansBold, Text = "", TextColor3 = Color3.fromRGB(220, 220, 230), TextSize = 16, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
local hint = make("TextLabel", { Size = UDim2.new(0, 460, 0, 22), Position = UDim2.new(0, 24, 1, -40), BackgroundTransparency = 1, Font = Enum.Font.BuilderSans, Text = "[R] 근무 수칙   [F] 손전등   [Shift] 달리기", TextColor3 = Color3.fromRGB(170, 170, 185), TextSize = 15, TextXAlignment = Enum.TextXAlignment.Left, Visible = false, ZIndex = 20 }, gui)

-- 근무 수칙 수첩 (손글씨 그림 글자: TextAtlas 의 한 줄짜리 그림을 줄마다 붙인다)
local AtlasText = require(ReplicatedStorage:WaitForChild("AtlasText"))
local TextAtlas = require(ReplicatedStorage:WaitForChild("TextAtlas"))
-- parent 안에 한 쪽을 그린다. x0,y0: 첫 줄 왼쪽 위(px), em: 글자 높이(px), gap: 줄 간격(px). 9번 줄들은 따로 묶어서 돌려준다
local function drawRulePage(parent, pageIndex, x0, y0, em, gap, z)
	local nineGroup = make("Frame", { Name = "Nine", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Visible = false, ZIndex = z }, parent)
	for li, line in ipairs(TextAtlas.Notebook[pageIndex] or {}) do
		if line.key ~= "" then
			local holder = line.kind == "nine" and nineGroup or parent
			local h = em * (line.kind == "title" and 1.25 or 1)
			local w = h * AtlasText.Aspect(line.key)
			local box = make("Frame", { Position = UDim2.fromOffset(x0 + line.indent * em, y0 + (li - 0.5) * gap - h * 0.62), Size = UDim2.fromOffset(w, h), BackgroundTransparency = 1, ZIndex = z }, holder)
			AtlasText.Make(line.key, box, z)
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
local closeBtn = make("TextButton", { Size = UDim2.new(0, 160, 0, 36), Position = UDim2.new(0.5, -80, 1, -50), BackgroundColor3 = Color3.fromRGB(226, 216, 190), Font = Enum.Font.BuilderSansBold, Text = "수첩 덮기 (R)", TextColor3 = Color3.fromRGB(40, 34, 28), TextSize = 16, ZIndex = 62 }, paper)
corner(closeBtn, 6)
closeBtn.Modal = true -- 1인칭에서도 마우스로 누를 수 있게

-- 엔딩
local endPanel = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 1, Visible = false, ZIndex = 70 }, gui)
local endTitle = make("TextLabel", { Size = UDim2.new(0.8, 0, 0.1, 0), Position = UDim2.fromScale(0.1, 0.26), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansExtraBold, Text = "", TextColor3 = Color3.fromRGB(220, 50, 50), TextScaled = true, ZIndex = 71 }, endPanel)
local endBody = make("TextLabel", { Size = UDim2.new(0.7, 0, 0.3, 0), Position = UDim2.fromScale(0.15, 0.42), BackgroundTransparency = 1, Font = Enum.Font.BuilderSans, Text = "", TextColor3 = Color3.fromRGB(225, 225, 230), TextScaled = true, TextWrapped = true, ZIndex = 71 }, endPanel)
make("UITextSizeConstraint", { MaxTextSize = 26 }, endBody)

-- 모바일 버튼
local mobile = make("Frame", { Size = UDim2.new(0, 96, 0, 172), Position = UDim2.new(1, -112, 0.32, 0), BackgroundTransparency = 1, Visible = false, ZIndex = 20 }, gui)
local rulesBtn = make("TextButton", { Size = UDim2.new(1, 0, 0, 50), BackgroundColor3 = Color3.fromRGB(242, 234, 208), Font = Enum.Font.BuilderSansBold, Text = "수칙", TextColor3 = Color3.fromRGB(40, 30, 24), TextSize = 18, ZIndex = 21 }, mobile)
corner(rulesBtn, 10)
local flashBtn = make("TextButton", { Size = UDim2.new(1, 0, 0, 50), Position = UDim2.new(0, 0, 0, 60), BackgroundColor3 = Color3.fromRGB(30, 34, 46), Font = Enum.Font.BuilderSansBold, Text = "손전등", TextColor3 = Color3.new(1, 1, 1), TextSize = 18, ZIndex = 21 }, mobile)
corner(flashBtn, 10)
-- 폰 달리기: 한 번 누르면 달리기, 다시 누르거나 체력이 다 떨어지면 걷기
local runBtn = make("TextButton", { Size = UDim2.new(1, 0, 0, 50), Position = UDim2.new(0, 0, 0, 120), BackgroundColor3 = Color3.fromRGB(30, 34, 46), Font = Enum.Font.BuilderSansBold, Text = "달리기", TextColor3 = Color3.new(1, 1, 1), TextSize = 18, ZIndex = 21 }, mobile)
corner(runBtn, 10)

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
-- 내 화면 손전등: 카메라를 따라가는 좁고 밝은 빛 + 손 떨림. 정신력이 낮으면 가끔 깜빡인다
local flash = make("SpotLight", { Face = Enum.NormalId.Front, Range = 58, Angle = 40, Brightness = 2.8, Color = Color3.fromRGB(255, 238, 210), Shadows = true, Enabled = false }, flashPart)
local flashSpill = make("SpotLight", { Face = Enum.NormalId.Front, Range = 22, Angle = 95, Brightness = 0.35, Color = Color3.fromRGB(255, 232, 200), Shadows = false, Enabled = false }, flashPart)
local flashWanted = true
local flickerOff = false
local function applyFlash()
	local on = flashWanted and player:GetAttribute("IntroDone") == true and not flickerOff
	flash.Enabled = on
	flashSpill.Enabled = on
end
local function setFlash(on)
	flashWanted = on
	applyFlash()
	FlashToggle:FireServer(on)
	flashBtn.BackgroundColor3 = on and Color3.fromRGB(200, 170, 80) or Color3.fromRGB(30, 34, 46)
end
flashBtn.MouseButton1Click:Connect(function()
	setFlash(not flashWanted)
end)
player:GetAttributeChangedSignal("IntroDone"):Connect(applyFlash)
-- 내 캐릭터의 '든 손전등' 불빛은 내 화면에선 끈다 (카메라 손전등과 겹치지 않게)
local function hideOwnHeld(ch)
	local fl = ch:WaitForChild("HeldFlashlight", 10)
	local b = fl and fl:FindFirstChild("Beam")
	if b then
		b.Brightness = 0
	end
end
if player.Character then
	task.spawn(hideOwnHeld, player.Character)
end
player.CharacterAdded:Connect(hideOwnHeld)
player.CameraMaxZoomDistance = 16
local swayT = 0
RunService.RenderStepped:Connect(function(dt)
	swayT = swayT + dt
	local sway = CFrame.Angles(math.sin(swayT * 1.1) * 0.012, math.sin(swayT * 0.8) * 0.016, 0)
	flashPart.CFrame = camera.CFrame * CFrame.new(0.9, -0.8, 0) * sway
end)
-- 정신력이 낮을수록 손전등이 자주 깜빡인다
task.spawn(function()
	while true do
		task.wait(2 + math.random() * 4)
		local s = player:GetAttribute("Sanity") or 100
		if flash.Enabled and math.random() < (100 - s) / 140 then
			for _ = 1, math.random(2, 5) do
				flickerOff = true
				applyFlash()
				task.wait(0.04 + math.random() * 0.1)
				flickerOff = false
				applyFlash()
				task.wait(0.03 + math.random() * 0.12)
			end
		end
	end
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
	CLEAR = { "생존 엔딩", "06:00. 창밖이 밝아 온다. 수칙을 끝까지 지켰다.\n날이 밝자 정문 옆 녹슨 표지판이 보였다. '송천고등학교 — 1998년 폐교'.\n진짜 송천고는 길 건너, 새로 지은 학교였다.\n…그럼 공유는, 어느 학교로 출근한 거지?", Color3.fromRGB(140, 220, 160) },
	GATE = { "배드 엔딩 · 정문", "06시 전에 정문을 열었다.\n문 밖에 서 있던 '학생'이 웃으며 들어왔다.\n\"고마워요. 공유 씨는 아까 나갔어요. 이제 당신 차례예요.\"", Color3.fromRGB(220, 50, 50) },
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

-- ═════════════════════════ 로비 → 출근 차량(SUV) 타고 학교로 ═════════════════════════
-- 처음엔 편의점 앞(로비)에서 시작한다. 차 옆에서 '탑승'하면 자리에 앉고, 첫 사람이 탄 뒤 10초 있다가 다 같이 출발.
-- 차는 서버 시계(TripStart)에 맞춰 모든 화면에서 같은 자리로 움직인다 (같이 탄 친구가 옆자리에 보인다).
while not workspace:GetAttribute("MapReady") do
	task.wait(0.2)
end
local school = workspace:WaitForChild("School")
loading.Text = ""
local IntroPath = require(ReplicatedStorage:WaitForChild("IntroPath"))
local ContextActionService = game:GetService("ContextActionService")

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

local suv = school:WaitForChild("IntroCar", 20)
local gate = school:FindFirstChild("MainGate", true)
local gateClosed = gate and (gate:GetAttribute("ClosedPivot") or gate:GetPivot())

-- 차를 길 위에 올려놓기: 발밑 바닥을 찾아 바퀴가 닿게 (서버가 정한 차체 높이 SUVRideHeight)
local groundParams = RaycastParams.new()
groundParams.FilterType = Enum.RaycastFilterType.Exclude
groundParams.RespectCanCollide = true
local carY
local function tripTime()
	local start = workspace:GetAttribute("SUVTripStart")
	return start and (workspace:GetServerTimeNow() - start) or -1
end
RunService.RenderStepped:Connect(function(dt)
	if not suv or not suv.Parent or workspace:GetAttribute("SUVState") ~= "driving" then
		carY = nil
		return
	end
	local t = tripTime()
	if t < 0 or t > Config.INTRO_SECONDS then
		return
	end
	local ignore = { suv }
	for _, p in ipairs(Players:GetPlayers()) do
		if p.Character then
			table.insert(ignore, p.Character)
		end
	end
	groundParams.FilterDescendantsInstances = ignore
	local p = IntroPath.PointAt(IntroPath.DistanceAt(t))
	local rideH = workspace:GetAttribute("SUVRideHeight") or 3.3
	carY = carY or suv:GetPivot().Position.Y
	local hit = workspace:Raycast(Vector3.new(p.X, carY + 2, p.Z), Vector3.new(0, -16, 0), groundParams)
	local want = (hit and hit.Position.Y or 0.22) + rideH
	carY = carY + (want - carY) * math.min(1, dt * 10)
	suv:PivotTo(IntroPath.CFrameAt(t, carY))
end)

-- ───── 로비 화면: 위 가운데 좌석 5칸(로블록스 아바타 얼굴) + 아래 가운데 출발 카운트다운 ─────
-- 꾸밈 없는 게임 화면처럼: 둥근 카드·설명 문구 없이, 로블록스 기본 글꼴(Builder Sans / Oswald)만 쓴다
local lobby = make("Frame", { Name = "Lobby", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Visible = false, ZIndex = 40 }, gui)
local top = make("Frame", { AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 26), Size = UDim2.new(0, 5 * 76 + 4 * 10, 0, 140), BackgroundTransparency = 1, ZIndex = 40 }, lobby)
local countLabel = make("TextLabel", { Size = UDim2.new(1, 0, 0, 36), BackgroundTransparency = 1, Font = Enum.Font.Oswald, TextSize = 34, TextColor3 = Color3.new(1, 1, 1), TextStrokeTransparency = 0.4, Text = "0 / 5", ZIndex = 41 }, top)
local slots = {}
for i = 1, Config.MAX_PLAYERS do
	local box = make("Frame", { Position = UDim2.new(0, (i - 1) * 86, 0, 44), Size = UDim2.new(0, 76, 0, 76), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.45, BorderSizePixel = 0, ZIndex = 41 }, top)
	local stroke = make("UIStroke", { Color = Color3.new(1, 1, 1), Transparency = 0.75, Thickness = 1 }, box)
	local face = make("ImageLabel", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Image = "", ZIndex = 42 }, box)
	local name = make("TextLabel", { Position = UDim2.new(0, -6, 1, 4), Size = UDim2.new(1, 12, 0, 16), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansMedium, TextSize = 14, TextColor3 = Color3.new(1, 1, 1), TextStrokeTransparency = 0.5, TextTruncate = Enum.TextTruncate.AtEnd, Text = "", ZIndex = 42 }, box)
	slots[i] = { box = box, stroke = stroke, face = face, name = name, user = 0 }
end
local bottom = make("Frame", { AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -40), Size = UDim2.new(0, 420, 0, 110), BackgroundTransparency = 1, ZIndex = 40 }, lobby)
local statusLabel = make("TextLabel", { Size = UDim2.new(1, 0, 0, 24), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansBold, TextSize = 20, TextColor3 = Color3.fromRGB(230, 230, 230), TextStrokeTransparency = 0.4, Text = "", ZIndex = 41 }, bottom)
local bigNumber = make("TextLabel", { Position = UDim2.new(0, 0, 0, 22), Size = UDim2.new(1, 0, 0, 84), BackgroundTransparency = 1, Font = Enum.Font.Oswald, TextSize = 80, TextColor3 = Color3.new(1, 1, 1), TextStrokeTransparency = 0.3, Text = "", ZIndex = 41 }, bottom)
local bigScale = make("UIScale", { Scale = 1 }, bigNumber)

local function mySeatIndex()
	local hum = humanoid()
	local seat = hum and hum.SeatPart
	if seat and seat.Name == "RideSeat" and suv and seat:IsDescendantOf(suv) then
		return seat:GetAttribute("SeatIndex")
	end
	return nil
end
local lastSecond
local function refreshLobby()
	local n = 0
	local mine = mySeatIndex()
	for i, s in ipairs(slots) do
		local who = workspace:GetAttribute("SUVSeat" .. i) or ""
		local uid = workspace:GetAttribute("SUVSeatUser" .. i) or 0
		if who ~= "" then
			n = n + 1
			s.name.Text = who
			s.box.BackgroundTransparency = 0.2
			s.stroke.Transparency = i == mine and 0 or 0.4
			s.stroke.Thickness = i == mine and 2 or 1
		else
			s.name.Text = ""
			s.box.BackgroundTransparency = 0.55
			s.stroke.Transparency = 0.75
			s.stroke.Thickness = 1
		end
		if uid ~= s.user then
			s.user = uid
			s.face.Image = ""
			if uid > 0 then
				task.spawn(function()
					local ok, img = pcall(Players.GetUserThumbnailAsync, Players, uid, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size150x150)
					if ok and s.user == uid then
						s.face.Image = img
					end
				end)
			end
		end
	end
	countLabel.Text = n .. " / " .. Config.MAX_PLAYERS
	local st = workspace:GetAttribute("SUVState")
	if st == "countdown" then
		local left = math.max(0, math.ceil((workspace:GetAttribute("SUVDepartAt") or 0) - workspace:GetServerTimeNow()))
		statusLabel.Text = "출발까지"
		bigNumber.Text = tostring(left)
		if left ~= lastSecond then
			lastSecond = left
			bigScale.Scale = 1.25
			tween(bigScale, 0.35, { Scale = 1 })
		end
	elseif st == "driving" or st == "arrived" then
		statusLabel.Text = mine and "" or "차가 이미 떠났다…"
		bigNumber.Text = ""
	else
		lastSecond = nil
		statusLabel.Text = mine and "다른 사람을 기다리는 중" or "SUV에 타면 10초 뒤 출발"
		bigNumber.Text = ""
	end
end

-- 달리는 동안 자리에서 못 내리게 (점프 막기)
local function lockJump(on)
	local hum = humanoid()
	if on then
		ContextActionService:BindActionAtPriority("SUVNoJump", function()
			return Enum.ContextActionResult.Sink
		end, false, Enum.ContextActionPriority.High.Value + 1, Enum.PlayerActions.CharacterJump)
		if hum then
			hum:SetStateEnabled(Enum.HumanoidStateType.Jumping, false)
		end
	else
		ContextActionService:UnbindAction("SUVNoJump")
		if hum then
			hum:SetStateEnabled(Enum.HumanoidStateType.Jumping, true)
		end
	end
end

-- 차 안에서 보는 출근길: 1인칭(내 자리) → 뒤따라가는 화면 → 정문 안쪽에서 보는 화면 → 다시 1인칭
local function rideCinematic()
	local T = Config.INTRO_SECONDS
	tween(barTop, 1, { Position = UDim2.fromScale(0, 0) })
	tween(barBottom, 1, { Position = UDim2.fromScale(0, 0.89) })
	lockJump(true)
	local lineIndex, gateOpened, titleGone, camPos = 1, false, false, nil
	local scripted = false
	local dof = Instance.new("DepthOfFieldEffect")
	dof.FarIntensity = 0.3
	dof.NearIntensity = 0
	dof.Enabled = false
	dof.Parent = Lighting
	while workspace:GetAttribute("SUVState") == "driving" and not player:GetAttribute("IntroDone") do
		local dt = RunService.RenderStepped:Wait()
		local t = tripTime()
		if t > T - 0.8 then
			break
		end
		if not titleGone and t > 2.5 then
			titleGone = true
			tween(title, 1, { TextTransparency = 1 })
			tween(subTitle, 1, { TextTransparency = 1 })
		end
		local line = Config.INTRO_LINES[lineIndex]
		if line and t >= line[1] then
			showSubtitle(line[2], 3.6)
			lineIndex = lineIndex + 1
		end
		if gate and not gateOpened and t >= 14.6 then
			gateOpened = true
			moveGateLocal(gate, gateClosed, true, 2)
		end
		local carCF = suv:GetPivot()
		local outside = t >= 11 and t < 19.5
		if outside then
			if not scripted then
				scripted = true
				inFirstPerson = false
				player.CameraMode = Enum.CameraMode.Classic
				camera.CameraType = Enum.CameraType.Scriptable
				dof.Enabled = true
				camPos = nil
			end
			local wantPos, target
			if t < 15 then
				wantPos = (carCF * CFrame.new(5, 4.5, 22)).Position
				target = carCF.Position + carCF.LookVector * 30 + Vector3.new(0, 1, 0)
			else
				wantPos = Vector3.new(-24, 6, 66)
				target = carCF.Position + Vector3.new(0, 1, 0)
			end
			if not camPos or (wantPos - camPos).Magnitude > 40 then
				camPos = wantPos -- 컷 전환
			else
				camPos = camPos:Lerp(wantPos, math.min(1, dt * 4))
			end
			camera.FieldOfView = 50
			camera.CFrame = CFrame.lookAt(camPos, target)
			dof.FocusDistance = (target - camPos).Magnitude
			dof.InFocusRadius = 14
		elseif scripted then
			scripted = false
			dof.Enabled = false
			camera.CameraType = Enum.CameraType.Custom
			local hum = humanoid()
			if hum then
				camera.CameraSubject = hum
			end
			camera.FieldOfView = Config.FIELD_OF_VIEW
			player.CameraMode = Enum.CameraMode.LockFirstPerson
			inFirstPerson = true
		end
	end
	dof:Destroy()
	tween(fade, 0.6, { BackgroundTransparency = 0 })
	return gateOpened
end

-- 처음 들어올 때: 오프닝. 공유(경비복 차림 인형)가 직접 나온다 (건너뛰기 가능)
--   1) 주차장: K5 옆에서 문자 확인 → 경비실로 걸어감  2) 경비실: 손전등으로 근무 수칙 읽기  3) 수칙 가까이
--   4) 흠칫 뒤로 물러남  5) 휴대폰으로 당근에 대타 5명 글  6) 정문 밖으로 뛰어 도망 → 정문 쾅  7) 검은 화면 "지원자 5명"
local function runPrologue()
	local T = Config.OPENING_TEXT
	local tpl = ReplicatedStorage:WaitForChild("GongYooActor", 12)
	if not T or not tpl then
		return
	end
	local actor = tpl:Clone()
	local hum = actor:FindFirstChildOfClass("Humanoid")
	local hrp = actor:FindFirstChild("HumanoidRootPart")
	if not hum or not hrp then
		actor:Destroy()
		return
	end
	hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	hrp.Anchored = true
	actor.Parent = workspace
	local animator = hum:FindFirstChildOfClass("Animator") or make("Animator", {}, hum)
	-- 로블록스 기본 R15 움직임 (가만히 / 걷기 / 뛰기)
	local function loadTrack(id)
		local a = Instance.new("Animation")
		a.AnimationId = "rbxassetid://" .. id
		local ok, t = pcall(function()
			return animator:LoadAnimation(a)
		end)
		return ok and t or nil
	end
	local idleT, walkT, runT = loadTrack(507766388), loadTrack(507777826), loadTrack(507767714)
	local playing
	local function play(t, speed)
		if playing ~= t then
			if playing then
				playing:Stop(0.25)
			end
			playing = t
			if t then
				t:Play(0.25)
			end
		end
		if t and speed then
			t:AdjustSpeed(speed)
		end
	end
	-- 발밑 바닥 높이에 맞춰 세우기
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.RespectCanCollide = true
	local ignore = { actor }
	for _, p in ipairs(Players:GetPlayers()) do
		if p.Character then
			table.insert(ignore, p.Character)
		end
	end
	params.FilterDescendantsInstances = ignore
	-- 발밑 ~ 몸 중심 높이: 실제 발 위치로 잰다 (키를 줄인 인형도 땅에 딱 붙게)
	local hipOff = hum.HipHeight + hrp.Size.Y / 2
	do
		local lo = math.huge
		for _, p in ipairs(actor:GetDescendants()) do
			if p:IsA("BasePart") and (p.Name == "LeftFoot" or p.Name == "RightFoot") then
				lo = math.min(lo, p.Position.Y - p.Size.Y / 2)
			end
		end
		if lo < math.huge then
			hipOff = hrp.Position.Y - lo
		end
	end
	local function place(pos, look)
		local hit = workspace:Raycast(Vector3.new(pos.X, pos.Y + 6, pos.Z), Vector3.new(0, -20, 0), params)
		local y = (hit and hit.Position.Y or 0.2) + hipOff
		local p = Vector3.new(pos.X, y, pos.Z)
		local l = Vector3.new(look.X, y, look.Z)
		if (l - p).Magnitude < 0.01 then
			l = p + hrp.CFrame.LookVector
		end
		hrp.CFrame = CFrame.lookAt(p, l)
	end
	local function head()
		local h = actor:FindFirstChild("Head")
		return h and h.Position or hrp.Position + Vector3.new(0, 1.5, 0)
	end
	-- 자세: 관절(Motor6D)의 C0 를 원하는 각도로 천천히 돌린다 (걷기·가만히 움직임 위에 겹쳐짐)
	local joints = {}
	for _, m in ipairs(actor:GetDescendants()) do
		if m:IsA("Motor6D") then
			joints[m.Name] = { m = m, c0 = m.C0, cur = CFrame.new(), want = CFrame.new() }
		end
	end
	local function pose(map)
		for _, j in pairs(joints) do
			j.want = CFrame.new()
		end
		for name, cf in pairs(map or {}) do
			if joints[name] then
				joints[name].want = cf
			end
		end
	end
	local poseConn = RunService.RenderStepped:Connect(function(dt)
		for _, j in pairs(joints) do
			j.cur = j.cur:Lerp(j.want, math.min(1, dt * 7))
			j.m.C0 = j.c0 * j.cur
		end
	end)
	local R = math.rad
	-- 소품: 손전등 불빛 (인형의 손전등 렌즈), 휴대폰
	-- 손전등 불빛: 머리 앞에 숨긴 작은 판에서 아래로 40° (들고 있는 손전등이 비추는 방향처럼)
	local beam
	do
		local headPart = actor:FindFirstChild("Head")
		if headPart then
			local lamp = make("Part", { Name = "HeadLamp", Size = Vector3.new(0.2, 0.2, 0.2), Transparency = 1, CanCollide = false, CanQuery = false, CanTouch = false, Massless = true }, actor)
			lamp.CFrame = headPart.CFrame * CFrame.new(0.5, -0.9, -0.5) * CFrame.Angles(math.rad(-38), 0, 0)
			make("WeldConstraint", { Part0 = headPart, Part1 = lamp }, lamp)
			beam = make("SpotLight", { Face = Enum.NormalId.Front, Range = 24, Angle = 50, Brightness = 2.0, Color = Color3.fromRGB(255, 238, 210), Shadows = true, Enabled = false }, lamp)
		end
	end
	local hand = actor:FindFirstChild("RightHand")
	local phone = make("Part", { Name = "Phone", Size = Vector3.new(0.23, 0.47, 0.03), Color = Color3.fromRGB(20, 20, 22), Material = Enum.Material.SmoothPlastic, CanCollide = false, CanQuery = false, CanTouch = false, Massless = true, Transparency = 1 }, actor)
	local screenGlow = make("PointLight", { Range = 5, Brightness = 1.4, Color = Color3.fromRGB(190, 210, 255), Enabled = false }, phone)
	local screen = make("Part", { Name = "PhoneScreen", Size = Vector3.new(0.21, 0.43, 0.01), Color = Color3.fromRGB(170, 196, 240), Material = Enum.Material.Neon, CanCollide = false, CanQuery = false, CanTouch = false, Massless = true, Transparency = 1 }, actor)
	if hand then
		phone.CFrame = hand.CFrame * CFrame.new(0, -0.08, -0.16) * CFrame.Angles(R(-70), 0, 0)
		screen.CFrame = phone.CFrame * CFrame.new(0, 0, -0.02)
		make("WeldConstraint", { Part0 = hand, Part1 = phone }, phone)
		make("WeldConstraint", { Part0 = phone, Part1 = screen }, screen)
	end
	do
		local sg = make("SurfaceGui", { Face = Enum.NormalId.Front, SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud, PixelsPerStud = 400, LightInfluence = 0, Brightness = 1.2 }, screen)
		make("TextLabel", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(246, 246, 244), Font = Enum.Font.BuilderSansBold, TextColor3 = Color3.fromRGB(30, 30, 30), TextScaled = true, TextWrapped = true, TextYAlignment = Enum.TextYAlignment.Top,
			Text = "알바 구인\n\n[급구] 학교 야간 경비 대타 5명\n\n오늘 22:00~06:00\n시급 30,000원\n송천고 앞 편의점" }, sg)
	end
	local function showPhone(on)
		phone.Transparency = on and 0 or 1
		screen.Transparency = on and 0 or 1
		screenGlow.Enabled = on
	end
	local function showFlashlight(on)
		for _, n in ipairs({ "Flashlight", "Lens" }) do
			local p = actor:FindFirstChild(n, true)
			if p and p:IsA("BasePart") then
				p.Transparency = on and 0 or 1
			end
		end
	end
	-- 진행 도구
	local skipped = false
	local skip = make("TextButton", { AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -28, 1, -24), Size = UDim2.new(0, 130, 0, 34), BackgroundTransparency = 1, Font = Enum.Font.BuilderSansBold, TextSize = 18, TextColor3 = Color3.fromRGB(170, 170, 170), TextStrokeTransparency = 0.6, Text = "건너뛰기  ▶", ZIndex = 55 }, gui)
	skip.MouseButton1Click:Connect(function()
		skipped = true
	end)
	local function hold(sec, fn)
		local t0 = os.clock()
		while not skipped do
			local t = os.clock() - t0
			if t >= sec then
				break
			end
			if fn then
				fn(t / sec, t)
			end
			RunService.RenderStepped:Wait()
		end
	end
	local function cutIn()
		fade.BackgroundTransparency = 0
		tween(fade, 0.7, { BackgroundTransparency = 1 })
	end
	local function cutOut()
		if not skipped then
			tween(fade, 0.45, { BackgroundTransparency = 0 }).Completed:Wait()
		end
	end
	-- 길(점 목록)을 일정한 속도로 따라 걷기/뛰기. camFn(진행률, 위치)
	local function travel(pts, speed, trackT, animSpeed, camFn)
		local segs, total = {}, 0
		for i = 1, #pts - 1 do
			local l = (pts[i + 1] - pts[i]).Magnitude
			table.insert(segs, l)
			total = total + l
		end
		play(trackT, animSpeed)
		local d = 0
		while d < total and not skipped do
			local dt = RunService.RenderStepped:Wait()
			d = math.min(total, d + speed * dt)
			local acc, p, dir = 0, pts[#pts], pts[#pts] - pts[#pts - 1]
			for i, l in ipairs(segs) do
				if d <= acc + l then
					local u = (d - acc) / l
					p = pts[i]:Lerp(pts[i + 1], u)
					dir = pts[i + 1] - pts[i]
					break
				end
				acc = acc + l
			end
			place(p, p + dir)
			if camFn then
				camFn(d / total, p)
			end
		end
		play(idleT)
	end

	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = 50
	local savedExposure = Lighting.ExposureCompensation
	Lighting.ExposureCompensation = savedExposure + 0.9
	tween(barTop, 0.8, { Position = UDim2.fromScale(0, 0) })
	tween(barBottom, 0.8, { Position = UDim2.fromScale(0, 0.89) })
	local gateOpened = false
	local V = Vector3.new

	-- 1) 주차장: 차 옆에서 문자를 보고, 경비실로 걸어간다
	if not skipped then
		place(V(46.2, 1, 63), V(40, 1, 70))
		play(idleT)
		showFlashlight(false)
		showPhone(true)
		pose({ RightShoulder = CFrame.Angles(R(62), 0, 0), RightElbow = CFrame.Angles(R(55), 0, 0), Neck = CFrame.Angles(R(-22), 0, 0) })
		camera.CFrame = CFrame.lookAt(V(38, 5.0, 58), head())
		cutIn()
		showSubtitle(T.arrive, 3.6, "static")
		hold(3.4, function(u)
			camera.CFrame = CFrame.lookAt(V(38, 5.0, 58):Lerp(V(39.5, 4.8, 59.5), u), head())
		end)
		pose({})
		showPhone(false)
		showFlashlight(true)
		showSubtitle(T.arrive2, 3.6)
		local cam = camera.CFrame.Position
		travel({ V(46.2, 1, 63), V(42, 1, 68), V(36, 1, 72.2), V(32.7, 1, 73.8) }, 6, walkT, 0.75, function(_, p)
			local want = p + V(9, 4.2, -8)
			cam = cam:Lerp(want, 0.04)
			camera.CFrame = CFrame.lookAt(cam, head())
		end)
		hold(0.4)
		cutOut()
	end
	-- 2) 경비실 안: 책상 위 펼쳐진 근무 수칙 수첩을 손전등으로 비춘다 (어깨 너머)
	if not skipped then
		place(V(24.3, 1.5, 85.4), V(26.6, 1.5, 87.6))
		play(idleT)
		if beam then
			beam.Enabled = true
		end
		pose({ RightShoulder = CFrame.Angles(R(34), 0, 0), Neck = CFrame.Angles(R(-30), 0, 0), Waist = CFrame.Angles(R(-8), 0, 0) })
		camera.CFrame = CFrame.lookAt(V(28.6, 6.9, 83.4), V(25.8, 3.6, 87.4))
		cutIn()
		showSubtitle(T.read, 3.8)
		hold(4.0, function(u)
			camera.CFrame = CFrame.lookAt(V(28.6, 6.9, 83.4):Lerp(V(28.0, 6.6, 84.2), u), V(25.8, 3.6, 87.4))
		end)
	end
	-- 3) 수첩 가까이 (손글씨 수칙)
	if not skipped then
		camera.CFrame = CFrame.lookAt(V(26.6, 5.9, 85.9), V(26.6, 3.45, 87.7))
		showSubtitle(T.rule, 2.8, "red")
		hold(3.0, function(u)
			camera.CFrame = CFrame.lookAt(V(26.6, 5.9, 85.9):Lerp(V(26.6, 5.5, 86.4), u), V(26.6, 3.45, 87.7))
			if beam and u > 0.75 then
				beam.Enabled = math.random() < 0.6 -- 손전등이 지직거린다
			end
		end)
		if beam then
			beam.Enabled = true
		end
	end
	-- 4) 흠칫: 뒤로 물러서며 몸을 젖힌다 (옆에서)
	if not skipped then
		camera.CFrame = CFrame.lookAt(V(29.6, 5.8, 83.2), head())
		pose({ RightShoulder = CFrame.Angles(R(20), 0, 0), Waist = CFrame.Angles(R(12), 0, 0), Neck = CFrame.Angles(R(8), 0, 0), LeftShoulder = CFrame.Angles(R(25), 0, R(-10)) })
		showSubtitle(T.shock, 2.6)
		hold(2.6, function(u)
			local back = math.min(1, u * 4) * 1.3
			place(V(24.3, 1.5, 85.4 - back), V(26.6, 1.5, 87.6))
			camera.CFrame = CFrame.lookAt(V(29.6, 5.8, 83.2), head())
		end)
		cutOut()
	end
	-- 5) 휴대폰: 돌아서서 고개를 숙이고 당근에 대타 5명 글을 올린다 (등 뒤 어깨 너머로 화면이 보임)
	if not skipped then
		if beam then
			beam.Enabled = false
		end
		showFlashlight(false)
		showPhone(true)
		place(V(24.3, 1.5, 83.4), V(24.3, 1.5, 78))
		play(idleT)
		pose({ RightShoulder = CFrame.Angles(R(62), 0, 0), RightElbow = CFrame.Angles(R(60), 0, 0), LeftShoulder = CFrame.Angles(R(40), 0, R(15)), LeftElbow = CFrame.Angles(R(50), 0, 0), Neck = CFrame.Angles(R(-26), 0, 0) })
		camera.CFrame = CFrame.lookAt(V(26.0, 7.0, 85.8), phone.Position)
		cutIn()
		showSubtitle(T.post, 4.0, "static")
		hold(4.2, function(u)
			camera.CFrame = CFrame.lookAt(V(26.0, 7.0, 85.8):Lerp(V(25.6, 6.6, 85.1), u), phone.Position)
		end)
		showSubtitle(T.sorry, 2.2)
		hold(2.2)
		cutOut()
	end
	-- 6) 도망: 정문이 열려 있고, 공유가 정문 밖으로 뛰어나간다 → 정문이 쾅 닫힌다 (길 건너에서)
	if not skipped then
		showPhone(false)
		showFlashlight(true)
		pose({})
		if gate then
			moveGateLocal(gate, gateClosed, true, 0.01)
			gateOpened = true
		end
		place(V(32.7, 1, 74.5), V(24, 1, 78))
		camera.CFrame = CFrame.lookAt(V(9, 5.5, 124), V(24, 4, 80))
		cutIn()
		showSubtitle(T.run, 3.6)
		local cam = V(9, 5.5, 124)
		local closed = false
		travel({ V(32.7, 1, 74.5), V(24, 1, 79), V(12, 1, 90), V(3, 1, 97), V(0, 1, 104), V(0, 1, 116), V(-6, 1, 124), V(-46, 1, 129) }, 17, runT, 1.0, function(u, p)
			cam = cam:Lerp(V(9, 5.5, 124), 0.05)
			camera.CFrame = CFrame.lookAt(cam, p + V(0, 2, 0))
			if not closed and p.Z > 110 and gate then
				closed = true
				moveGateLocal(gate, gateClosed, false, 0.45)
				task.delay(0.45, function()
					showSubtitle(T.slam, 1.6)
				end)
			end
		end)
		hold(1.2, function()
			camera.CFrame = CFrame.lookAt(V(9, 5.5, 124), V(0, 4, 100))
		end)
		cutOut()
	end
	-- 7) 검은 화면
	fade.BackgroundTransparency = 0
	if not skipped then
		showSubtitle(T.finish, 3.0)
		hold(3.2)
	end
	-- 정리
	poseConn:Disconnect()
	actor:Destroy()
	if gate and (gateOpened or skipped) then
		moveGateLocal(gate, gateClosed, false, 0.01)
	end
	Lighting.ExposureCompensation = savedExposure
	subtitle.TextTransparency = 1
	subtitle.TextStrokeTransparency = 1
	skip:Destroy()
	tween(barTop, 0.6, { Position = UDim2.fromScale(0, -0.11) })
	tween(barBottom, 0.6, { Position = UDim2.fromScale(0, 1) })
	camera.CameraType = Enum.CameraType.Custom
	local myHum = humanoid()
	if myHum then
		camera.CameraSubject = myHum
	end
	camera.FieldOfView = Config.FIELD_OF_VIEW
	task.wait(0.3)
end

local function runLobby()
	player.CameraMode = Enum.CameraMode.LockFirstPerson
	inFirstPerson = true
	tween(fade, 1.4, { BackgroundTransparency = 1 })
	lobby.Visible = true
	task.delay(1.2, function()
		if workspace:GetAttribute("SUVState") == "waiting" or workspace:GetAttribute("SUVState") == "countdown" then
			showSubtitle("송천고 앞 편의점. 글을 보고 온 사람들이 모였다. 검은 SUV에 타자.", 5)
		end
	end)
	local conn = RunService.Heartbeat:Connect(refreshLobby)
	local rode, gateOpened = false, false
	while not player:GetAttribute("IntroDone") do
		if workspace:GetAttribute("SUVState") == "driving" and mySeatIndex() and not rode then
			rode = true
			lobby.Visible = false
			gateOpened = rideCinematic()
		end
		task.wait(0.05)
	end
	conn:Disconnect()
	lobby.Visible = false
	if not rode then
		tween(fade, 0.5, { BackgroundTransparency = 0 }).Completed:Wait()
	end
	-- 경비실 도착: 서버가 자리에서 내려 경비실로 옮겨 준다
	lockJump(false)
	task.wait(0.6)
	camera.CameraType = Enum.CameraType.Custom
	local hum = humanoid()
	if hum then
		camera.CameraSubject = hum
	end
	camera.FieldOfView = Config.FIELD_OF_VIEW
	tween(barTop, 0.8, { Position = UDim2.fromScale(0, -0.11) })
	tween(barBottom, 0.8, { Position = UDim2.fromScale(0, 1) })
	tween(title, 0.3, { TextTransparency = 1 })
	tween(subTitle, 0.3, { TextTransparency = 1 })
	tween(fade, 1.4, { BackgroundTransparency = 1 })
	if gate and gateOpened then
		task.delay(0.3, function()
			moveGateLocal(gate, gateClosed, false, 1.4)
		end)
	end
	if rode then
		for _, line in ipairs(Config.AFTER_INTRO_LINES) do
			task.delay(line[1], function()
				showSubtitle(line[2], 3.6)
			end)
		end
	else
		showSubtitle("차를 놓쳐서 택시 타고 왔다… 경비실이 여기구나.", 4)
		task.delay(4.5, function()
			showSubtitle("경비실 옷걸이에 경비복이 걸려 있다. 갈아입었다.", 3.6)
		end)
		task.delay(8.5, function()
			showSubtitle(Config.AFTER_INTRO_LINES[#Config.AFTER_INTRO_LINES][2], 3.6)
		end)
	end
end

if not player:GetAttribute("IntroDone") then
	runPrologue()
	runLobby()
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
-- 폰 달리기 버튼
local function setRun(on)
	sprinting = on
	runBtn.BackgroundColor3 = on and Color3.fromRGB(200, 170, 80) or Color3.fromRGB(30, 34, 46)
end
runBtn.MouseButton1Click:Connect(function()
	setRun(not sprinting)
end)
RunService.Heartbeat:Connect(function()
	if sprinting and stamina <= 0 and UserInputService.TouchEnabled then
		setRun(false) -- 숨이 차면 저절로 걷기로
	end
end)
hud.Visible = true
hint.Visible = not UserInputService.TouchEnabled -- 키보드 안내는 컴퓨터에서만
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
make("TextLabel", { AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -40, 1, -36), Size = UDim2.new(0, 600, 0, 30), BackgroundTransparency = 1, Font = Enum.Font.BuilderSans, TextSize = 18, TextColor3 = Color3.fromRGB(200, 212, 200), TextXAlignment = Enum.TextXAlignment.Right, Text = "◀ A    D ▶   카메라 바꾸기        E  나가기", ZIndex = 37 }, cctvGui)
local cctvExit = make("TextButton", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -40, 0, 80), Size = UDim2.new(0, 110, 0, 38), BackgroundColor3 = Color3.fromRGB(20, 24, 22), BackgroundTransparency = 0.3, Font = Enum.Font.BuilderSansBold, TextSize = 18, TextColor3 = Color3.new(1, 1, 1), Text = "나가기", Modal = true, ZIndex = 38 }, cctvGui)
corner(cctvExit, 8)
local cctvPrev = make("TextButton", { Position = UDim2.new(0, 36, 0.5, -32), Size = UDim2.new(0, 64, 0, 64), BackgroundColor3 = Color3.fromRGB(20, 24, 22), BackgroundTransparency = 0.4, Font = Enum.Font.BuilderSansBold, TextSize = 28, TextColor3 = Color3.new(1, 1, 1), Text = "◀", ZIndex = 38 }, cctvGui)
corner(cctvPrev, 32)
local cctvNext = make("TextButton", { AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -36, 0.5, -32), Size = UDim2.new(0, 64, 0, 64), BackgroundColor3 = Color3.fromRGB(20, 24, 22), BackgroundTransparency = 0.4, Font = Enum.Font.BuilderSansBold, TextSize = 28, TextColor3 = Color3.new(1, 1, 1), Text = "▶", ZIndex = 38 }, cctvGui)
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
		flashSpill.Enabled = false
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
