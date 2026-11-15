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
local hud = make("Frame", { Size = UDim2.new(0, 270, 0, 108), Position = UDim2.new(0, 16, 0, 16), BackgroundColor3 = Color3.fromRGB(8, 10, 16), BackgroundTransparency = 0.35, Visible = false, ZIndex = 20 }, gui)
corner(hud, 12)
local clockLabel = make("TextLabel", { Size = UDim2.new(1, -24, 0, 34), Position = UDim2.new(0, 12, 0, 8), BackgroundTransparency = 1, Font = Enum.Font.Code, Text = "PM 10:00", TextColor3 = Color3.fromRGB(255, 90, 90), TextSize = 30, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
make("TextLabel", { Size = UDim2.new(0, 60, 0, 16), Position = UDim2.new(0, 12, 0, 48), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, Text = "정신력", TextColor3 = Color3.fromRGB(200, 200, 210), TextSize = 14, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
local barBg = make("Frame", { Size = UDim2.new(1, -86, 0, 12), Position = UDim2.new(0, 72, 0, 50), BackgroundColor3 = Color3.fromRGB(40, 40, 48), BorderSizePixel = 0, ZIndex = 21 }, hud)
corner(barBg, 6)
local barFill = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(110, 220, 130), BorderSizePixel = 0, ZIndex = 22 }, barBg)
corner(barFill, 6)
local patrolLabel = make("TextLabel", { Size = UDim2.new(1, -24, 0, 20), Position = UDim2.new(0, 12, 0, 74), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, Text = "", TextColor3 = Color3.fromRGB(220, 220, 230), TextSize = 16, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21 }, hud)
local hint = make("TextLabel", { Size = UDim2.new(0, 360, 0, 22), Position = UDim2.new(0, 18, 0, 128), BackgroundTransparency = 1, Font = Enum.Font.Gotham, Text = "[R] 근무 수칙   [F] 손전등", TextColor3 = Color3.fromRGB(170, 170, 185), TextSize = 15, TextXAlignment = Enum.TextXAlignment.Left, Visible = false, ZIndex = 20 }, gui)

-- 근무 수칙 종이
local paper = make("Frame", { Size = UDim2.new(0, 470, 0, 540), Position = UDim2.new(0.5, -235, 0.5, -270), BackgroundColor3 = Color3.fromRGB(242, 234, 208), Visible = false, ZIndex = 60 }, gui)
corner(paper, 4)
make("UIStroke", { Color = Color3.fromRGB(120, 100, 70), Thickness = 2 }, paper)
make("UISizeConstraint", { MaxSize = Vector2.new(470, 540) }, paper)
make("TextLabel", { Size = UDim2.new(1, -40, 0, 40), Position = UDim2.new(0, 20, 0, 16), BackgroundTransparency = 1, Font = Enum.Font.GothamBlack, Text = "[ 야간 경비원 근무 수칙 ]", TextColor3 = Color3.fromRGB(40, 30, 24), TextSize = 26, ZIndex = 61 }, paper)
local rulesText = {}
for i, r in ipairs(Config.RULES) do
	table.insert(rulesText, i .. ". " .. r)
end
local rulesLabel = make("TextLabel", { Size = UDim2.new(1, -44, 1, -150), Position = UDim2.new(0, 22, 0, 64), BackgroundTransparency = 1, Font = Enum.Font.Gotham, Text = table.concat(rulesText, "\n\n"), TextColor3 = Color3.fromRGB(40, 30, 24), TextSize = 17, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 61 }, paper)
local nine = make("TextLabel", { Size = UDim2.new(1, -44, 0, 44), Position = UDim2.new(0, 22, 1, -86), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, Text = Config.RULE_NINE, TextColor3 = Color3.fromRGB(170, 0, 0), TextSize = 16, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, Visible = false, ZIndex = 61 }, paper)
local closeBtn = make("TextButton", { Size = UDim2.new(0, 140, 0, 34), Position = UDim2.new(0.5, -70, 1, -44), BackgroundColor3 = Color3.fromRGB(60, 48, 36), Font = Enum.Font.GothamBold, Text = "알겠습니다 (R)", TextColor3 = Color3.new(1, 1, 1), TextSize = 16, ZIndex = 62 }, paper)
corner(closeBtn, 6)

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
RunService.RenderStepped:Connect(function()
	local hum = humanoid()
	if not hum then
		return
	end
	if os.clock() < shakeUntil then
		hum.CameraOffset = Vector3.new((math.random() - 0.5) * shakePower, (math.random() - 0.5) * shakePower, 0)
	elseif hum.CameraOffset.Magnitude > 0 then
		hum.CameraOffset = Vector3.new()
	end
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
		if gate and not gateOpened and t >= 12.6 then
			gateOpened = true
			moveGateLocal(gate, gateClosed, true, 2)
		end
		-- 카메라 연출
		local wantPos, target
		if t < 9 then
			wantPos = (carCF * CFrame.new(7, 6, 26)).Position
			target = pos + carCF.LookVector * 30 + Vector3.new(0, 2, 0)
		elseif t < 13 then
			wantPos = Vector3.new(-40, 6, 256)
			target = pos + Vector3.new(0, 2, 0)
		elseif t < 18 then
			wantPos = Vector3.new(-26, 8, 162)
			target = pos + Vector3.new(0, 2, 0)
		else
			wantPos = Vector3.new(16, 8, 146)
			target = pos + Vector3.new(0, 2.5, 0)
		end
		if (wantPos - camPos).Magnitude > 40 then
			camPos = wantPos -- 컷 전환
		else
			camPos = camPos:Lerp(wantPos, math.min(1, dt * 4))
		end
		camera.CFrame = CFrame.lookAt(camPos, target)
	end
	skipConn:Disconnect()
	skipBtn.Visible = false
	car:PivotTo(parked)

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

hud.Visible = true
hint.Visible = true
mobile.Visible = UserInputService.TouchEnabled
setFlash(true)
task.delay(6.5, function()
	setRules(true)
end)
