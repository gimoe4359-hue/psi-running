--!nonstrict
-- PSI 88층 탈출 · 클라이언트
-- HUD, 달리기(Shift)/살금살금(C)/손전등(F), 쪽지·키패드·타이밍 미니게임, 정전·경고 연출, 층별 화면 분위기

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local TS = game:GetService("TweenService")
local UIS = game:GetService("UserInputService")
local RunS = game:GetService("RunService")
local Lighting = game:GetService("Lighting")

local Config = require(RS:WaitForChild("Config"))
local Remotes = RS:WaitForChild("Remotes")
local InputEv = Remotes:WaitForChild("Input")
local player = Players.LocalPlayer
local pg = player:WaitForChild("PlayerGui")

local FONT = Enum.Font.GothamBlack
local FONT_B = Enum.Font.GothamMedium
local INK = Color3.fromRGB(14, 10, 12)
local GOLD = Color3.fromRGB(242, 200, 74)
local ALERT = Color3.fromRGB(255, 90, 90)

local gui = Instance.new("ScreenGui")
gui.Name = "PSI_HUD"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 5
gui.Parent = pg

local function mk(class, props, parent)
	local i = Instance.new(class)
	for k, v in pairs(props) do i[k] = v end
	if parent then i.Parent = parent end
	return i
end

local function corner(parent, r)
	return mk("UICorner", { CornerRadius = UDim.new(0, r or 10) }, parent)
end

local function beep(id, volume, pitch)
	local s = mk("Sound", { SoundId = id, Volume = volume or 0.7, PlaybackSpeed = pitch or 1 }, gui)
	s:Play()
	task.delay(6, function() s:Destroy() end)
end

-- ---------------------------------------------------------------- top-left: floor + objective
local panel = mk("Frame", { Size = UDim2.fromOffset(350, 104), Position = UDim2.new(0, 16, 0, 16), BackgroundColor3 = INK,
	BackgroundTransparency = 0.25, BorderSizePixel = 0 }, gui)
corner(panel)
mk("UIStroke", { Color = Color3.fromRGB(70, 40, 46), Thickness = 1 }, panel)
local floorLbl = mk("TextLabel", { Size = UDim2.new(0, 110, 0, 44), Position = UDim2.new(0, 14, 0, 6), BackgroundTransparency = 1, Font = FONT,
	TextSize = 38, TextColor3 = Color3.fromRGB(255, 255, 255), TextXAlignment = Enum.TextXAlignment.Left, Text = "88F" }, panel)
local titleLbl = mk("TextLabel", { Size = UDim2.new(1, -130, 0, 44), Position = UDim2.new(0, 120, 0, 8), BackgroundTransparency = 1, Font = FONT_B,
	TextSize = 16, TextColor3 = Color3.fromRGB(190, 170, 160), TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = true, Text = "" }, panel)
local objLbl = mk("TextLabel", { Size = UDim2.new(1, -28, 0, 48), Position = UDim2.new(0, 14, 0, 50), BackgroundTransparency = 1, Font = FONT_B,
	TextSize = 14, TextColor3 = GOLD, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
	TextWrapped = true, Text = "" }, panel)

-- top-right: timer + keys
local right = mk("Frame", { Size = UDim2.fromOffset(170, 60), Position = UDim2.new(1, -186, 0, 16), BackgroundColor3 = INK,
	BackgroundTransparency = 0.25, BorderSizePixel = 0 }, gui)
corner(right)
local timerLbl = mk("TextLabel", { Size = UDim2.new(1, -20, 0, 30), Position = UDim2.new(0, 10, 0, 6), BackgroundTransparency = 1, Font = FONT,
	TextSize = 24, TextColor3 = Color3.fromRGB(255, 255, 255), TextXAlignment = Enum.TextXAlignment.Right, Text = "00:00" }, right)
local keyLbl = mk("TextLabel", { Size = UDim2.new(1, -20, 0, 20), Position = UDim2.new(0, 10, 0, 34), BackgroundTransparency = 1, Font = FONT_B,
	TextSize = 13, TextColor3 = Color3.fromRGB(190, 170, 160), TextXAlignment = Enum.TextXAlignment.Right, Text = "열린 층 0 · 열쇠 없음" }, right)

-- lower-centre message
local msgLbl = mk("TextLabel", { Size = UDim2.new(0.8, 0, 0, 60), Position = UDim2.new(0.1, 0, 0.7, 0), BackgroundTransparency = 1, Font = FONT,
	TextSize = 24, TextColor3 = Color3.fromRGB(255, 255, 255), TextStrokeTransparency = 0.3, TextWrapped = true, Text = "", TextTransparency = 1 }, gui)

local function message(text, kind)
	local col = Color3.fromRGB(255, 255, 255)
	if kind == "key" then col = GOLD
	elseif kind == "alert" then col = ALERT
	elseif kind == "win" then col = Color3.fromRGB(120, 255, 160) end
	msgLbl.TextColor3 = col
	msgLbl.Text = text
	msgLbl.TextTransparency = 0
	TS:Create(msgLbl, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.In, 0, false, 4), { TextTransparency = 1 }):Play()
end
Remotes:WaitForChild("Message").OnClientEvent:Connect(message)

-- upper-centre banner: warnings and calls that need reading right now
local banner = mk("TextLabel", { Size = UDim2.new(0.7, 0, 0, 54), Position = UDim2.new(0.15, 0, 0.16, 0), BackgroundColor3 = INK,
	BackgroundTransparency = 0.2, Font = FONT, TextSize = 24, TextColor3 = Color3.fromRGB(255, 255, 255), TextWrapped = true, Text = "",
	Visible = false, ZIndex = 8 }, gui)
corner(banner, 12)
local bannerStroke = mk("UIStroke", { Color = ALERT, Thickness = 2 }, banner)
local bannerToken = 0
local function showBanner(text, secs, kind)
	local col = Color3.fromRGB(235, 235, 235)
	if typeof(kind) == "Color3" then col = kind
	elseif kind == "alert" then col = ALERT
	elseif kind == "key" then col = GOLD end
	banner.Text = text
	banner.TextColor3 = col
	bannerStroke.Color = col
	banner.Visible = true
	bannerToken += 1
	local token = bannerToken
	task.delay(secs or 3, function()
		if bannerToken == token then banner.Visible = false end
	end)
end

-- ---------------------------------------------------------------- state
local openCount = 0
local hasKey = false
local openedSet = {}
local objOverride = {}
local started = os.clock()
Remotes:WaitForChild("State").OnClientEvent:Connect(function(kind, a, b)
	if kind == "floorOpened" then
		if not openedSet[a] then
			openedSet[a] = true
			openCount += 1
		end
	elseif kind == "hasMainKey" then
		hasKey = a
	elseif kind == "objective" then
		objOverride[a] = b
	elseif kind == "reset" then
		openedSet = {}
		objOverride = {}
		openCount = 0
		hasKey = false
		started = os.clock()
	end
	keyLbl.Text = ("열린 층 %d · %s"):format(openCount, if hasKey then "정문 열쇠 보유" else "열쇠 없음")
end)

-- ---------------------------------------------------------------- jumpscare
local SCARE_NAME = { chaser = "조수민", redlight = "조수민", zzuk = "쭉쭉이", rush = "에스키모", patient = "레전드 환자", berry = "베리",
	mannequin = "마네킹", festival = "피의 축제" }
local SCARE_SUB = { chaser = "잡혔다", redlight = "움직였다", zzuk = "…보고 있지 않았다", rush = "숨지 못했다", patient = "복도에 서 있었다",
	berry = "눈이 마주쳤다", mannequin = "불이 꺼져 있었다", festival = "틀린 타일이었다~" }
local scare = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(0, 0, 0), BackgroundTransparency = 1, Visible = false, ZIndex = 20 }, gui)
local scareRed = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(120, 0, 0), BackgroundTransparency = 1, ZIndex = 21 }, scare)
local scareTxt = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 120), Position = UDim2.new(0, 0, 0.42, 0), BackgroundTransparency = 1, Font = FONT, TextSize = 64,
	TextColor3 = Color3.fromRGB(255, 40, 40), Text = "", ZIndex = 22, TextStrokeTransparency = 0.2 }, scare)
local scareSub = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 40), Position = UDim2.new(0, 0, 0.58, 0), BackgroundTransparency = 1, Font = FONT_B, TextSize = 20,
	TextColor3 = Color3.fromRGB(220, 200, 200), Text = "", ZIndex = 22 }, scare)

Remotes:WaitForChild("Caught").OnClientEvent:Connect(function(cause)
	scare.Visible = true
	scare.BackgroundTransparency = 0.15
	scareRed.BackgroundTransparency = 0.2
	scareTxt.TextTransparency = 0
	scareSub.TextTransparency = 0
	scareTxt.Text = SCARE_NAME[cause] or "…"
	scareSub.Text = SCARE_SUB[cause] or ""
	beep("rbxasset://sounds/HalloweenGhost.wav", 1, 0.8)
	local cam = workspace.CurrentCamera
	task.spawn(function()
		for i = 1, 30 do
			if cam then cam.CFrame = cam.CFrame * CFrame.Angles(math.rad((math.random() - 0.5) * 6), math.rad((math.random() - 0.5) * 6), 0) end
			scareRed.BackgroundTransparency = 0.2 + (i % 2) * 0.5
			task.wait(0.04)
		end
		scareRed.BackgroundTransparency = 0.45
		task.wait(2.2)
		TS:Create(scare, TweenInfo.new(1), { BackgroundTransparency = 1 }):Play()
		TS:Create(scareRed, TweenInfo.new(1), { BackgroundTransparency = 1 }):Play()
		TS:Create(scareTxt, TweenInfo.new(1), { TextTransparency = 1 }):Play()
		TS:Create(scareSub, TweenInfo.new(1), { TextTransparency = 1 }):Play()
		task.wait(1.1)
		scare.Visible = false
	end)
end)

-- ---------------------------------------------------------------- win screen
local win = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(8, 6, 7), BackgroundTransparency = 0.35, Visible = false, ZIndex = 30 }, gui)
mk("TextLabel", { Size = UDim2.new(1, 0, 0, 90), Position = UDim2.new(0, 0, 0.3, 0), BackgroundTransparency = 1, Font = FONT, TextSize = 56,
	TextColor3 = Color3.fromRGB(120, 255, 160), Text = "탈출 성공", ZIndex = 31 }, win)
local winS = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 40), Position = UDim2.new(0, 0, 0.42, 0), BackgroundTransparency = 1, Font = FONT_B, TextSize = 22,
	TextColor3 = Color3.fromRGB(230, 230, 230), Text = "", ZIndex = 31 }, win)
local winBtn = mk("TextButton", { Size = UDim2.fromOffset(220, 48), Position = UDim2.new(0.5, -110, 0.55, 0), BackgroundColor3 = Color3.fromRGB(255, 42, 58),
	Font = FONT, TextSize = 20, TextColor3 = Color3.fromRGB(255, 255, 255), Text = "닫기", ZIndex = 31, AutoButtonColor = true }, win)
corner(winBtn)
winBtn.MouseButton1Click:Connect(function() win.Visible = false end)
Remotes:WaitForChild("Win").OnClientEvent:Connect(function(name, secs)
	winS.Text = ("%s 이(가) 정문을 열었다 · 기록 %d분 %02d초 · 30초 뒤 새 라운드"):format(name, secs // 60, secs % 60)
	win.Visible = true
	beep("rbxasset://sounds/victory.wav", 1, 1)
	task.delay(28, function() win.Visible = false end)
end)

-- ---------------------------------------------------------------- flashlight (local only)
local flashOn = false
local spot = nil
local function attachFlash()
	local char = player.Character
	local head = char and char:FindFirstChild("Head")
	if not head then return end
	if spot and spot.Parent == head then return end
	spot = Instance.new("SpotLight")
	spot.Angle = 55
	spot.Range = 60
	spot.Brightness = 2.2
	spot.Color = Color3.fromRGB(255, 244, 220)
	spot.Face = Enum.NormalId.Front
	spot.Shadows = true
	spot.Enabled = flashOn
	spot.Parent = head
end
local function toggleFlash()
	flashOn = not flashOn
	attachFlash()
	if spot then spot.Enabled = flashOn end
	beep("rbxasset://sounds/switch.wav", 0.7, 1)
end
player.CharacterAdded:Connect(function()
	task.wait(0.5)
	attachFlash()
end)
attachFlash()

-- ---------------------------------------------------------------- sprint / sneak / stamina
local WALK, SPRINT, SNEAK = 16, 25, 7
local sprintHeld = false
local sneaking = false
local stamina = 100
local winded = false
local modalOpen = false

local stam = mk("Frame", { Size = UDim2.fromOffset(220, 10), Position = UDim2.new(0.5, -110, 1, -34), BackgroundColor3 = INK,
	BackgroundTransparency = 0.3, BorderSizePixel = 0 }, gui)
corner(stam, 5)
local stamFill = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(120, 230, 150), BorderSizePixel = 0 }, stam)
corner(stamFill, 5)
local moveLbl = mk("TextLabel", { Size = UDim2.fromOffset(220, 18), Position = UDim2.new(0.5, -110, 1, -56), BackgroundTransparency = 1, Font = FONT_B,
	TextSize = 13, TextColor3 = Color3.fromRGB(200, 200, 200), Text = "Shift 달리기 · C 살금살금 · F 손전등" }, gui)

local function setSneak(on)
	sneaking = on
	if on then sprintHeld = false end
end

-- ---------------------------------------------------------------- note (a page the player reads)
local note = mk("Frame", { Size = UDim2.fromOffset(420, 300), Position = UDim2.new(0.5, -210, 0.5, -150), BackgroundColor3 = Color3.fromRGB(244, 238, 216),
	BorderSizePixel = 0, Visible = false, ZIndex = 12 }, gui)
corner(note, 6)
local noteTxt = mk("TextLabel", { Size = UDim2.new(1, -40, 1, -80), Position = UDim2.new(0, 20, 0, 18), BackgroundTransparency = 1, Font = FONT_B,
	TextSize = 19, TextColor3 = Color3.fromRGB(40, 34, 28), TextWrapped = true, TextYAlignment = Enum.TextYAlignment.Top, Text = "", ZIndex = 13 }, note)
local noteBtn = mk("TextButton", { Size = UDim2.fromOffset(140, 40), Position = UDim2.new(0.5, -70, 1, -54), BackgroundColor3 = Color3.fromRGB(60, 50, 44),
	Font = FONT, TextSize = 18, TextColor3 = Color3.fromRGB(255, 255, 255), Text = "닫기", ZIndex = 13 }, note)
corner(noteBtn, 8)
local noteToken = 0
noteBtn.MouseButton1Click:Connect(function() note.Visible = false end)
local function showNote(text)
	noteTxt.Text = text
	note.Visible = true
	noteToken += 1
	local token = noteToken
	task.delay(12, function()
		if noteToken == token then note.Visible = false end
	end)
end

-- ---------------------------------------------------------------- keypad
local pad = mk("Frame", { Size = UDim2.fromOffset(280, 400), Position = UDim2.new(0.5, -140, 0.5, -200), BackgroundColor3 = Color3.fromRGB(22, 24, 28),
	BorderSizePixel = 0, Visible = false, ZIndex = 14 }, gui)
corner(pad, 12)
mk("UIStroke", { Color = Color3.fromRGB(120, 255, 160), Thickness = 2 }, pad)
local padTitle = mk("TextLabel", { Size = UDim2.new(1, -20, 0, 30), Position = UDim2.new(0, 10, 0, 8), BackgroundTransparency = 1, Font = FONT_B, TextSize = 16,
	TextColor3 = Color3.fromRGB(200, 220, 210), Text = "", ZIndex = 15 }, pad)
local padShow = mk("TextLabel", { Size = UDim2.new(1, -40, 0, 54), Position = UDim2.new(0, 20, 0, 42), BackgroundColor3 = Color3.fromRGB(8, 12, 10), Font = FONT,
	TextSize = 36, TextColor3 = Color3.fromRGB(120, 255, 160), Text = "", ZIndex = 15 }, pad)
corner(padShow, 6)
local padId = nil
local padLen = 4
local padCode = ""
local function padRefresh()
	padShow.Text = padCode .. string.rep("_", math.max(0, padLen - #padCode))
end
local function padClose()
	pad.Visible = false
	padId = nil
	modalOpen = false
end
local function padPress(key)
	if not padId then return end
	if key == "지움" then
		padCode = string.sub(padCode, 1, math.max(0, #padCode - 1))
	elseif key == "확인" then
		if #padCode == padLen then
			InputEv:FireServer("keypad", padId, padCode)
			padClose()
			return
		end
	elseif #padCode < padLen then
		padCode = padCode .. key
		beep("rbxasset://sounds/clickfast.wav", 0.5, 1)
	end
	padRefresh()
end
local padKeys = { "1", "2", "3", "4", "5", "6", "7", "8", "9", "지움", "0", "확인" }
for i, key in ipairs(padKeys) do
	local col = (i - 1) % 3
	local row = (i - 1) // 3
	local b = mk("TextButton", { Size = UDim2.fromOffset(76, 58), Position = UDim2.fromOffset(20 + col * 82, 110 + row * 64),
		BackgroundColor3 = if key == "확인" then Color3.fromRGB(40, 130, 80) else Color3.fromRGB(44, 48, 56), Font = FONT,
		TextSize = if #key > 1 then 18 else 26, TextColor3 = Color3.fromRGB(255, 255, 255), Text = key, ZIndex = 15 }, pad)
	corner(b, 8)
	b.MouseButton1Click:Connect(function() padPress(key) end)
end
local padX = mk("TextButton", { Size = UDim2.fromOffset(240, 30), Position = UDim2.fromOffset(20, 364), BackgroundTransparency = 1, Font = FONT_B, TextSize = 15,
	TextColor3 = Color3.fromRGB(170, 170, 170), Text = "닫기 (움직이면 닫힘)", ZIndex = 15 }, pad)
padX.MouseButton1Click:Connect(padClose)
local function openPad(id, title, len)
	padId = id
	padLen = len
	padCode = ""
	padTitle.Text = title
	padRefresh()
	pad.Visible = true
	modalOpen = true
end

-- ---------------------------------------------------------------- timing minigame
local tm = mk("Frame", { Size = UDim2.fromOffset(420, 170), Position = UDim2.new(0.5, -210, 0.62, 0), BackgroundColor3 = Color3.fromRGB(22, 24, 28),
	BorderSizePixel = 0, Visible = false, ZIndex = 14 }, gui)
corner(tm, 12)
mk("UIStroke", { Color = Color3.fromRGB(255, 150, 60), Thickness = 2 }, tm)
local tmTitle = mk("TextLabel", { Size = UDim2.new(1, -20, 0, 30), Position = UDim2.new(0, 10, 0, 8), BackgroundTransparency = 1, Font = FONT_B, TextSize = 16,
	TextColor3 = Color3.fromRGB(230, 220, 210), Text = "", ZIndex = 15 }, tm)
local tmBar = mk("Frame", { Size = UDim2.new(1, -40, 0, 26), Position = UDim2.new(0, 20, 0, 48), BackgroundColor3 = Color3.fromRGB(50, 30, 30), BorderSizePixel = 0, ZIndex = 15 }, tm)
local tmZone = mk("Frame", { Size = UDim2.fromScale(0.16, 1), Position = UDim2.fromScale(0.4, 0), BackgroundColor3 = Color3.fromRGB(70, 230, 120), BorderSizePixel = 0, ZIndex = 16 }, tmBar)
local tmMark = mk("Frame", { Size = UDim2.new(0, 6, 1, 8), Position = UDim2.new(0, 0, 0, -4), BackgroundColor3 = Color3.fromRGB(255, 255, 255), BorderSizePixel = 0, ZIndex = 17 }, tmBar)
local tmBtn = mk("TextButton", { Size = UDim2.fromOffset(200, 50), Position = UDim2.new(0.5, -100, 0, 92), BackgroundColor3 = Color3.fromRGB(220, 110, 40), Font = FONT,
	TextSize = 22, TextColor3 = Color3.fromRGB(255, 255, 255), Text = "충전! (Space)", ZIndex = 15 }, tm)
corner(tmBtn, 8)
local tmX = mk("TextButton", { Size = UDim2.fromOffset(60, 26), Position = UDim2.new(1, -66, 0, 6), BackgroundTransparency = 1, Font = FONT_B, TextSize = 15,
	TextColor3 = Color3.fromRGB(170, 170, 170), Text = "닫기", ZIndex = 15 }, tm)
local tmId = nil
local tmPos = 0
local tmZoneAt = 0.4
local tmCool = 0
local function tmClose()
	tm.Visible = false
	tmId = nil
	modalOpen = false
end
local function tmHit()
	if not tmId or os.clock() < tmCool then return end
	tmCool = os.clock() + 0.5
	local hit = tmPos >= tmZoneAt - 0.01 and tmPos <= tmZoneAt + 0.17
	InputEv:FireServer("timing", tmId, hit)
	beep(if hit then "rbxasset://sounds/electronicpingshort.wav" else "rbxasset://sounds/bass.wav", 0.8, 1)
	tmZoneAt = 0.08 + math.random() * 0.7
	tmZone.Position = UDim2.fromScale(tmZoneAt, 0)
end
tmBtn.MouseButton1Click:Connect(tmHit)
tmX.MouseButton1Click:Connect(tmClose)
local function openTiming(id, title)
	tmId = id
	tmTitle.Text = title
	tm.Visible = true
	modalOpen = true
end

-- ---------------------------------------------------------------- noise meter
local meter = mk("Frame", { Size = UDim2.fromOffset(260, 40), Position = UDim2.new(0.5, -130, 1, -110), BackgroundColor3 = INK, BackgroundTransparency = 0.25,
	BorderSizePixel = 0, Visible = false }, gui)
corner(meter, 8)
local meterLbl = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 18), Position = UDim2.new(0, 0, 0, 2), BackgroundTransparency = 1, Font = FONT_B, TextSize = 13,
	TextColor3 = Color3.fromRGB(230, 230, 230), Text = "" }, meter)
local meterBack = mk("Frame", { Size = UDim2.new(1, -20, 0, 10), Position = UDim2.new(0, 10, 0, 24), BackgroundColor3 = Color3.fromRGB(40, 40, 44), BorderSizePixel = 0 }, meter)
local meterFill = mk("Frame", { Size = UDim2.fromScale(0, 1), BackgroundColor3 = GOLD, BorderSizePixel = 0 }, meterBack)

-- ---------------------------------------------------------------- blackout / flicker
local darkness = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(0, 0, 0), BackgroundTransparency = 1, ZIndex = 3 }, gui)
local darkLbl = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 30), Position = UDim2.new(0, 0, 0.9, 0), BackgroundTransparency = 1, Font = FONT_B, TextSize = 16,
	TextColor3 = Color3.fromRGB(120, 120, 120), Text = "", ZIndex = 4 }, gui)
local darkToken = 0
local function blackoutFx(secs)
	darkToken += 1
	local token = darkToken
	darkLbl.Text = "— 정전 —"
	TS:Create(darkness, TweenInfo.new(0.15), { BackgroundTransparency = 0.07 }):Play()
	task.delay(secs, function()
		if darkToken ~= token then return end
		darkLbl.Text = ""
		TS:Create(darkness, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
	end)
end
local function flickerFx(secs)
	darkToken += 1
	local token = darkToken
	task.spawn(function()
		local untilT = os.clock() + secs
		while os.clock() < untilT and darkToken == token do
			darkness.BackgroundTransparency = if math.random() < 0.5 then 0.45 else 1
			task.wait(0.06 + math.random() * 0.09)
		end
		if darkToken == token then darkness.BackgroundTransparency = 1 end
	end)
end

Remotes:WaitForChild("Fx").OnClientEvent:Connect(function(kind, a, b, c)
	if kind == "banner" then
		showBanner(a, b, c)
	elseif kind == "note" then
		showNote(a)
	elseif kind == "keypad" then
		openPad(a, b, c)
	elseif kind == "timing" then
		openTiming(a, b)
	elseif kind == "closeUi" then
		padClose()
		tmClose()
		note.Visible = false
	elseif kind == "blackout" then
		blackoutFx(a)
	elseif kind == "flicker" then
		flickerFx(a)
	elseif kind == "meter" then
		if b < 0 then
			meter.Visible = false
		else
			meter.Visible = true
			meterLbl.Text = a
			meterFill.Size = UDim2.fromScale(math.clamp(b, 0, 1), 1)
			meterFill.BackgroundColor3 = if b > 0.7 then ALERT else GOLD
		end
	end
end)

-- ---------------------------------------------------------------- input
local DIGITS = { Zero = "0", One = "1", Two = "2", Three = "3", Four = "4", Five = "5", Six = "6", Seven = "7", Eight = "8", Nine = "9",
	KeypadZero = "0", KeypadOne = "1", KeypadTwo = "2", KeypadThree = "3", KeypadFour = "4", KeypadFive = "5", KeypadSix = "6",
	KeypadSeven = "7", KeypadEight = "8", KeypadNine = "9" }
UIS.InputBegan:Connect(function(input, gp)
	local key = input.KeyCode
	if padId then
		local d = DIGITS[key.Name]
		if d then padPress(d)
		elseif key == Enum.KeyCode.Backspace then padPress("지움")
		elseif key == Enum.KeyCode.Return or key == Enum.KeyCode.KeypadEnter then padPress("확인") end
		return
	end
	if tmId and key == Enum.KeyCode.Space then
		tmHit()
		return
	end
	if gp then return end
	if key == Enum.KeyCode.F then toggleFlash()
	elseif key == Enum.KeyCode.LeftShift then
		sprintHeld = true
		sneaking = false
	elseif key == Enum.KeyCode.C or key == Enum.KeyCode.LeftControl then setSneak(not sneaking) end
end)
UIS.InputEnded:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift then sprintHeld = false end
end)

if UIS.TouchEnabled then
	moveLbl.Visible = false
	local function touchBtn(text, order)
		local b = mk("TextButton", { Size = UDim2.fromOffset(64, 64), Position = UDim2.new(1, -90, 1, -200 - order * 74), BackgroundColor3 = INK,
			BackgroundTransparency = 0.3, Font = FONT, TextSize = 14, TextColor3 = Color3.fromRGB(255, 255, 255), Text = text }, gui)
		mk("UICorner", { CornerRadius = UDim.new(1, 0) }, b)
		return b
	end
	touchBtn("손전등", 0).MouseButton1Click:Connect(toggleFlash)
	local runBtn = touchBtn("달리기", 1)
	local sneakBtn = touchBtn("살금", 2)
	runBtn.MouseButton1Click:Connect(function()
		sprintHeld = not sprintHeld
		if sprintHeld then sneaking = false end
		runBtn.BackgroundColor3 = if sprintHeld then Color3.fromRGB(40, 130, 80) else INK
		sneakBtn.BackgroundColor3 = INK
	end)
	sneakBtn.MouseButton1Click:Connect(function()
		setSneak(not sneaking)
		sneakBtn.BackgroundColor3 = if sneaking then Color3.fromRGB(60, 90, 160) else INK
		runBtn.BackgroundColor3 = INK
	end)
end

-- ---------------------------------------------------------------- per-floor HUD + mood
local grade = Lighting:FindFirstChild("ParallelWorldGrade")
local lastFloor = "none"

local MOOD = {
	[77] = { tint = Color3.fromRGB(255, 236, 170), sat = -0.3, con = 0.05 },
	[40] = { tint = Color3.fromRGB(255, 220, 220), sat = -0.5, con = 0.2 },
	[-3] = { tint = Color3.fromRGB(230, 220, 255), sat = -0.4, con = 0.25 },
	[44] = { tint = Color3.fromRGB(255, 205, 205), sat = 0.1, con = 0.15 },
	core = { tint = Color3.fromRGB(255, 200, 160), sat = 0.1, con = 0.1 },
	default = { tint = Color3.fromRGB(255, 238, 232), sat = -0.12, con = 0.12 },
}

local function objectiveFor(n)
	if n == "core" then return "나선 길을 따라 내려가 정문 열쇠를 가져와라. 빨간 원이 뜨면 용암 기둥이 솟는다" end
	if n == "roof" then return "" end
	if n == 1 then return if hasKey then "정문 옆 열쇠 구멍에 열쇠를 꽂아라. 조수민이 쫓아온다!" else "정문이 잠겨 있다. 계단으로 지하에 내려가 열쇠를 찾아라" end
	local f = Config.byN[n]
	if not f then return "" end
	if openedSet[n] then return "계단 창살이 열렸다. 아래층으로" end
	return objOverride[n] or f.objective or "계단 창살을 열 방법을 찾아라"
end

local modalAt = nil
RunS.Heartbeat:Connect(function(dt)
	local secs = math.floor(os.clock() - started)
	timerLbl.Text = ("%02d:%02d"):format(secs // 60, secs % 60)
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if not hrp or not hum then return end

	-- movement: sprint drains stamina, sneaking is slow and quiet
	local moving = hum.MoveDirection.Magnitude > 0.1
	local sprinting = sprintHeld and not sneaking and not winded and moving
	if sprinting then
		stamina = math.max(0, stamina - 22 * dt)
		if stamina <= 0 then winded = true end
	else
		stamina = math.min(100, stamina + 15 * dt)
		if winded and stamina >= 30 then winded = false end
	end
	local speed = if sprinting then SPRINT elseif sneaking then SNEAK else WALK
	if hum.WalkSpeed ~= speed then hum.WalkSpeed = speed end
	stamFill.Size = UDim2.fromScale(stamina / 100, 1)
	stamFill.BackgroundColor3 = if winded then ALERT elseif sneaking then Color3.fromRGB(110, 150, 240) else Color3.fromRGB(120, 230, 150)

	-- timing minigame marker
	if tmId then
		tmPos = math.abs(((os.clock() * 0.9) % 2) - 1)
		tmMark.Position = UDim2.new(tmPos, -3, 0, -4)
	end
	-- a keypad or minigame closes when the player walks away from it
	if modalOpen then
		if not modalAt then modalAt = hrp.Position end
		if (hrp.Position - modalAt).Magnitude > 9 then
			padClose()
			tmClose()
		end
	else
		modalAt = nil
	end

	local y = hrp.Position.Y
	local n = Config.floorOfY(y)
	if n == nil then n = if y < Config.coreTop then "core" else "roof" end
	if n ~= lastFloor then
		lastFloor = n
		if n == "core" then
			floorLbl.Text = "내핵"
			titleLbl.Text = "지구 내핵"
		elseif n == "roof" then
			floorLbl.Text = "옥상"
			titleLbl.Text = ""
		else
			local f = Config.byN[n]
			floorLbl.Text = f.label
			titleLbl.Text = f.title
		end
		local mood = MOOD[n] or MOOD.default
		if grade then
			TS:Create(grade, TweenInfo.new(1.2), { TintColor = mood.tint, Saturation = mood.sat, Contrast = mood.con }):Play()
		end
		meter.Visible = false
	end
	objLbl.Text = objectiveFor(n)
end)

-- ---------------------------------------------------------------- intro
task.delay(1, function()
	showBanner("88층 공유 하우스 — 현관 도어락 암호가 적힌 쪽지 4장을 찾아라", 6, "key")
end)
