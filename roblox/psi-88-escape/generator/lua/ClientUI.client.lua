--!nonstrict
-- PSI 88층 탈출 · 클라이언트 UI, 손전등, 층별 화면 분위기

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local TS = game:GetService("TweenService")
local UIS = game:GetService("UserInputService")
local RunS = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local CS = game:GetService("CollectionService")

local Config = require(RS:WaitForChild("Config"))
local Remotes = RS:WaitForChild("Remotes")
local player = Players.LocalPlayer
local pg = player:WaitForChild("PlayerGui")

local FONT = Enum.Font.GothamBlack
local FONT_B = Enum.Font.GothamMedium

local gui = Instance.new("ScreenGui")
gui.Name = "PSI_HUD"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 5
gui.Parent = pg

local function mk(class: string, props: { [string]: any }, parent: Instance?)
	local i = Instance.new(class)
	for k, v in pairs(props) do (i :: any)[k] = v end
	if parent then i.Parent = parent end
	return i
end

-- ---------------------------------------------------------------- top-left: floor + objective
local panel = mk("Frame", { Size = UDim2.fromOffset(330, 92), Position = UDim2.new(0, 16, 0, 16), BackgroundColor3 = Color3.fromRGB(14, 10, 12),
	BackgroundTransparency = 0.25, BorderSizePixel = 0 }, gui)
mk("UICorner", { CornerRadius = UDim.new(0, 10) }, panel)
mk("UIStroke", { Color = Color3.fromRGB(70, 40, 46), Thickness = 1 }, panel)
local floorLbl = mk("TextLabel", { Size = UDim2.new(0, 110, 0, 44), Position = UDim2.new(0, 14, 0, 6), BackgroundTransparency = 1, Font = FONT,
	TextSize = 38, TextColor3 = Color3.fromRGB(255, 255, 255), TextXAlignment = Enum.TextXAlignment.Left, Text = "88F" }, panel)
local titleLbl = mk("TextLabel", { Size = UDim2.new(1, -130, 0, 44), Position = UDim2.new(0, 120, 0, 8), BackgroundTransparency = 1, Font = FONT_B,
	TextSize = 16, TextColor3 = Color3.fromRGB(190, 170, 160), TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = true, Text = "" }, panel)
local objLbl = mk("TextLabel", { Size = UDim2.new(1, -28, 0, 36), Position = UDim2.new(0, 14, 0, 50), BackgroundTransparency = 1, Font = FONT_B,
	TextSize = 14, TextColor3 = Color3.fromRGB(242, 200, 74), TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
	TextWrapped = true, Text = "" }, panel)

-- top-right: timer + keys
local right = mk("Frame", { Size = UDim2.fromOffset(170, 60), Position = UDim2.new(1, -186, 0, 16), BackgroundColor3 = Color3.fromRGB(14, 10, 12),
	BackgroundTransparency = 0.25, BorderSizePixel = 0 }, gui)
mk("UICorner", { CornerRadius = UDim.new(0, 10) }, right)
local timerLbl = mk("TextLabel", { Size = UDim2.new(1, -20, 0, 30), Position = UDim2.new(0, 10, 0, 6), BackgroundTransparency = 1, Font = FONT,
	TextSize = 24, TextColor3 = Color3.fromRGB(255, 255, 255), TextXAlignment = Enum.TextXAlignment.Right, Text = "00:00" }, right)
local keyLbl = mk("TextLabel", { Size = UDim2.new(1, -20, 0, 20), Position = UDim2.new(0, 10, 0, 34), BackgroundTransparency = 1, Font = FONT_B,
	TextSize = 13, TextColor3 = Color3.fromRGB(190, 170, 160), TextXAlignment = Enum.TextXAlignment.Right, Text = "열린 층 0 · 열쇠 없음" }, right)

-- centre message
local msgLbl = mk("TextLabel", { Size = UDim2.new(0.8, 0, 0, 60), Position = UDim2.new(0.1, 0, 0.72, 0), BackgroundTransparency = 1, Font = FONT,
	TextSize = 26, TextColor3 = Color3.fromRGB(255, 255, 255), TextStrokeTransparency = 0.3, TextWrapped = true, Text = "", TextTransparency = 1 }, gui)

local function message(text: string, kind: string)
	local col = Color3.fromRGB(255, 255, 255)
	if kind == "key" then col = Color3.fromRGB(242, 200, 74)
	elseif kind == "alert" then col = Color3.fromRGB(255, 90, 90)
	elseif kind == "win" then col = Color3.fromRGB(120, 255, 160) end
	msgLbl.TextColor3 = col
	msgLbl.Text = text
	msgLbl.TextTransparency = 0
	TS:Create(msgLbl, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.In, 0, false, 4), { TextTransparency = 1 }):Play()
end
Remotes.Message.OnClientEvent:Connect(message)

-- ---------------------------------------------------------------- state
local openCount = 0
local hasKey = false
local openedSet: { [number]: boolean } = {}
Remotes.State.OnClientEvent:Connect(function(kind, v)
	if kind == "floorOpened" then
		if not openedSet[v] then openedSet[v] = true; openCount += 1 end
	elseif kind == "hasMainKey" then hasKey = v
	elseif kind == "reset" then openedSet = {}; openCount = 0; hasKey = false end
	keyLbl.Text = ("열린 층 %d · %s"):format(openCount, if hasKey then "정문 열쇠 보유" else "열쇠 없음")
end)

-- ---------------------------------------------------------------- jumpscare
local scare = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(0, 0, 0), BackgroundTransparency = 1, Visible = false, ZIndex = 20 }, gui)
local scareRed = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(120, 0, 0), BackgroundTransparency = 1, ZIndex = 21 }, scare)
local scareTxt = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 120), Position = UDim2.new(0, 0, 0.42, 0), BackgroundTransparency = 1, Font = FONT, TextSize = 64,
	TextColor3 = Color3.fromRGB(255, 40, 40), Text = "", ZIndex = 22, TextStrokeTransparency = 0.2 }, scare)
local scareSub = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 40), Position = UDim2.new(0, 0, 0.58, 0), BackgroundTransparency = 1, Font = FONT_B, TextSize = 20,
	TextColor3 = Color3.fromRGB(220, 200, 200), Text = "", ZIndex = 22 }, scare)

Remotes.Caught.OnClientEvent:Connect(function(cause)
	scare.Visible = true
	scare.BackgroundTransparency = 0.15
	scareRed.BackgroundTransparency = 0.2
	scareTxt.Text = if cause == "zzuk" then "쭉쭉이" else "조수민"
	scareSub.Text = if cause == "zzuk" then "…보고 있지 않았다" else "잡혔다"
	local s = Instance.new("Sound"); s.SoundId = "rbxasset://sounds/HalloweenGhost.wav"; s.Volume = 1; s.PlaybackSpeed = 0.8; s.Parent = gui; s:Play()
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
		scareTxt.TextTransparency = 0; scareSub.TextTransparency = 0
		s:Destroy()
	end)
end)

-- ---------------------------------------------------------------- win screen
local win = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(8, 6, 7), BackgroundTransparency = 0.35, Visible = false, ZIndex = 30 }, gui)
local winT = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 90), Position = UDim2.new(0, 0, 0.3, 0), BackgroundTransparency = 1, Font = FONT, TextSize = 56,
	TextColor3 = Color3.fromRGB(120, 255, 160), Text = "탈출 성공", ZIndex = 31 }, win)
local winS = mk("TextLabel", { Size = UDim2.new(1, 0, 0, 40), Position = UDim2.new(0, 0, 0.42, 0), BackgroundTransparency = 1, Font = FONT_B, TextSize = 22,
	TextColor3 = Color3.fromRGB(230, 230, 230), Text = "", ZIndex = 31 }, win)
local winBtn = mk("TextButton", { Size = UDim2.fromOffset(220, 48), Position = UDim2.new(0.5, -110, 0.55, 0), BackgroundColor3 = Color3.fromRGB(255, 42, 58),
	Font = FONT, TextSize = 20, TextColor3 = Color3.fromRGB(255, 255, 255), Text = "닫기", ZIndex = 31, AutoButtonColor = true }, win)
mk("UICorner", { CornerRadius = UDim.new(0, 10) }, winBtn)
winBtn.MouseButton1Click:Connect(function() win.Visible = false end)
Remotes.Win.OnClientEvent:Connect(function(name, secs)
	winS.Text = ("%s 이(가) 정문을 열었다 · 기록 %d분 %02d초 · 30초 뒤 새 라운드"):format(name, secs // 60, secs % 60)
	win.Visible = true
	local s = Instance.new("Sound"); s.SoundId = "rbxasset://sounds/victory.wav"; s.Volume = 1; s.Parent = gui; s:Play()
	task.delay(28, function() win.Visible = false end)
end)

-- ---------------------------------------------------------------- flashlight (local only)
local flashOn = false
local spot: SpotLight? = nil
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
	local s = Instance.new("Sound"); s.SoundId = "rbxasset://sounds/switch.wav"; s.Volume = 0.7; s.Parent = gui; s:Play(); task.delay(2, function() s:Destroy() end)
end
UIS.InputBegan:Connect(function(input, gp)
	if gp then return end
	if input.KeyCode == Enum.KeyCode.F then toggleFlash() end
end)
player.CharacterAdded:Connect(function() task.wait(0.5); attachFlash() end)
attachFlash()

if UIS.TouchEnabled then
	local fb = mk("TextButton", { Size = UDim2.fromOffset(64, 64), Position = UDim2.new(1, -90, 1, -200), BackgroundColor3 = Color3.fromRGB(14, 10, 12),
		BackgroundTransparency = 0.3, Font = FONT, TextSize = 14, TextColor3 = Color3.fromRGB(255, 255, 255), Text = "손전등" }, gui)
	mk("UICorner", { CornerRadius = UDim.new(1, 0) }, fb)
	fb.MouseButton1Click:Connect(toggleFlash)
end

-- ---------------------------------------------------------------- per-floor HUD + mood
local grade = Lighting:FindFirstChild("ParallelWorldGrade") :: ColorCorrectionEffect?
local atmo = Lighting:FindFirstChildOfClass("Atmosphere")
local lastFloor: any = "none"
local started = os.clock()
local berryWarned = 0

local MOOD = {
	[77] = { tint = Color3.fromRGB(255, 236, 170), sat = -0.3, con = 0.05 },
	[40] = { tint = Color3.fromRGB(255, 220, 220), sat = -0.5, con = 0.2 },
	[-3] = { tint = Color3.fromRGB(230, 220, 255), sat = -0.4, con = 0.25 },
	[44] = { tint = Color3.fromRGB(255, 205, 205), sat = 0.1, con = 0.15 },
	core = { tint = Color3.fromRGB(255, 200, 160), sat = 0.1, con = 0.1 },
	default = { tint = Color3.fromRGB(255, 238, 232), sat = -0.12, con = 0.12 },
}

local function objectiveFor(n: any): string
	if n == "core" then return "나선 길을 따라 내려가 정문 열쇠를 가져와라. 용암에 닿으면 끝이다" end
	if n == 1 then return if hasKey then "정문 옆 열쇠 구멍에 열쇠를 꽂아라" else "정문이 잠겨 있다. 계단으로 지하에 내려가 열쇠를 찾아라" end
	local f = Config.byN[n]
	if not f then return "" end
	if openedSet[n] then return "계단 창살이 열렸다. 아래층으로" end
	return f.objective or "출입 카드를 찾아 계단 창살을 열어라"
end

RunS.Heartbeat:Connect(function()
	local secs = math.floor(os.clock() - started)
	timerLbl.Text = ("%02d:%02d"):format(secs // 60, secs % 60)
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then return end
	local y = (hrp :: BasePart).Position.Y
	local n: any = Config.floorOfY(y)
	if n == nil then n = if y < Config.coreTop then "core" else "roof" end
	if n ~= lastFloor then
		lastFloor = n
		if n == "core" then floorLbl.Text = "내핵"; titleLbl.Text = "지구 내핵"
		elseif n == "roof" then floorLbl.Text = "옥상"; titleLbl.Text = ""
		else
			local f = Config.byN[n]
			floorLbl.Text = f.label; titleLbl.Text = f.title
		end
		local mood = MOOD[n] or MOOD.default
		if grade then
			TS:Create(grade, TweenInfo.new(1.2), { TintColor = mood.tint, Saturation = mood.sat, Contrast = mood.con }):Play()
		end
	end
	objLbl.Text = objectiveFor(n)
	-- Berry whisper
	if n == -3 and os.clock() - berryWarned > 20 then
		for _, m in ipairs(CS:GetTagged("JjangkeunBerry")) do
			if m:IsA("Model") and (m:GetPivot().Position - (hrp :: BasePart).Position).Magnitude < 34 then
				berryWarned = os.clock()
				message("…베리가 보고 있다. 눈 마주치지 마", "alert")
				local s = Instance.new("Sound"); s.SoundId = "rbxasset://sounds/HalloweenLightning.wav"; s.Volume = 0.4; s.PlaybackSpeed = 0.5; s.Parent = gui; s:Play()
				task.delay(6, function() s:Destroy() end)
			end
		end
	end
end)

-- ---------------------------------------------------------------- intro card
task.delay(1, function()
	message("88층. 현관은 쇠사슬로 잠겨 있다", "info")
end)
