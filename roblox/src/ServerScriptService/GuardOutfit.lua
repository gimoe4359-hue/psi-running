-- 경비원 공유 스킨 (무료)
-- 게임에 들어온 플레이어(= 공유가 당근에서 구한 대타 경비원)를 남색 경비복 + 경비 모자 + 이름표 차림으로 바꿉니다.
-- 이름표에는 각자 자기 이름이 들어갑니다.
-- 옷 이미지는 roblox/clothes/*.png 를 Studio에서 무료 업로드한 뒤 Config에 ID를 넣으면 적용됩니다.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local GuardOutfit = {}

-- 한국 경비원 근무복: 하늘색 반팔 셔츠 + 남색 바지 + 남색 야구모자(금색 엠블럼) + 초록 견장 + 검은 벨트
local NAVY = Color3.fromRGB(24, 28, 48) -- 모자
local NAVY_DARK = Color3.fromRGB(28, 32, 52) -- 바지
local SHIRT = Color3.fromRGB(128, 172, 218)
local GREEN = Color3.fromRGB(36, 132, 86)
local SILVER = Color3.fromRGB(200, 204, 210)
local BLACK = Color3.fromRGB(16, 16, 18)
local GOLD = Color3.fromRGB(222, 184, 74)

local function weldPart(parent, attachTo, name, size, offset, color, mat, shape)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	if shape then
		p.Shape = shape
	end
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.Massless = true
	p.Anchored = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.CFrame = attachTo.CFrame * offset
	local w = Instance.new("WeldConstraint")
	w.Part0 = attachTo
	w.Part1 = p
	w.Parent = p
	p.Parent = parent
	return p
end

local function applyDescription(humanoid)
	local ok, desc = pcall(function()
		return humanoid:GetAppliedDescription()
	end)
	if not ok or not desc then
		return
	end
	desc.Shirt = 0
	desc.Pants = 0
	desc.GraphicTShirt = 0
	-- 몸은 기본 R15 몸으로 (특수 번들·애니메이션 얼굴이면 경비복이 어긋나므로). 플레이어 = 공유
	desc.Head = 0
	desc.Torso = 0
	desc.LeftArm = 0
	desc.RightArm = 0
	desc.LeftLeg = 0
	desc.RightLeg = 0
	desc.HeightScale = 1
	desc.WidthScale = 1
	desc.DepthScale = 1
	desc.HeadScale = 1
	desc.BodyTypeScale = 0
	desc.ProportionScale = 0
	pcall(function()
		desc:SetAccessories({}, true) -- 모자·가방 등 전부 벗기기
	end)
	desc.HatAccessory = ""
	desc.FaceAccessory = ""
	desc.BackAccessory = ""
	desc.FrontAccessory = ""
	desc.NeckAccessory = ""
	desc.ShouldersAccessory = ""
	desc.WaistAccessory = ""
	desc.HairAccessory = Config.HAIR_ACCESSORY_ID ~= 0 and tostring(Config.HAIR_ACCESSORY_ID) or ""
	if Config.FACE_ID ~= 0 then
		desc.Face = Config.FACE_ID
	end
	local skin = Config.SKIN_COLOR
	desc.HeadColor = skin
	if Config.SHIRT_IMAGE_ID ~= 0 then
		desc.TorsoColor = skin
		desc.LeftArmColor = skin
		desc.RightArmColor = skin
	else
		-- 옷 이미지가 없으면 몸 색으로 유니폼 흉내
		desc.TorsoColor = SHIRT
		desc.LeftArmColor = SHIRT
		desc.RightArmColor = SHIRT
	end
	desc.LeftLegColor = NAVY_DARK
	desc.RightLegColor = NAVY_DARK
	pcall(function()
		humanoid:ApplyDescription(desc)
	end)
end

function GuardOutfit.Apply(player, character)
	local humanoid = character:WaitForChild("Humanoid", 10)
	local head = character:WaitForChild("Head", 10)
	if not humanoid or not head then
		return
	end
	if player:HasAppearanceLoaded() == false then
		player.CharacterAppearanceLoaded:Wait()
	end
	if character.Parent == nil then
		return
	end
	GuardOutfit.Dress(character, player.DisplayName)
end

--- 플레이어가 아닌 모델(오프닝의 공유 등)에도 경비복을 입힌다. name = 이름표 글자
function GuardOutfit.Dress(character, name)
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local head = character:FindFirstChild("Head")
	if not humanoid or not head then
		return
	end
	applyDescription(humanoid)
	head = character:FindFirstChild("Head") or head

	-- 셔츠·바지 (업로드한 이미지 ID)
	for _, c in ipairs(character:GetChildren()) do
		if c:IsA("Shirt") or c:IsA("Pants") or c:IsA("ShirtGraphic") then
			c:Destroy()
		end
	end
	if Config.SHIRT_IMAGE_ID ~= 0 then
		local s = Instance.new("Shirt")
		s.ShirtTemplate = "rbxassetid://" .. Config.SHIRT_IMAGE_ID
		s.Parent = character
	end
	if Config.PANTS_IMAGE_ID ~= 0 then
		local p = Instance.new("Pants")
		p.PantsTemplate = "rbxassetid://" .. Config.PANTS_IMAGE_ID
		p.Parent = character
	end

	humanoid.DisplayName = "경비원 " .. name -- 이름표는 각자 자기 이름 (오프닝의 공유는 "공유")
	humanoid.NameDisplayDistance = 30

	local outfit = character:FindFirstChild("GuardOutfit")
	if outfit then
		outfit:Destroy()
	end
	outfit = Instance.new("Folder")
	outfit.Name = "GuardOutfit"
	outfit.Parent = character

	local hs = head.Size
	-- 짧은 검은 머리 (무료 머리 아이템을 안 쓸 때)
	if Config.HAIR_ACCESSORY_ID == 0 then
		weldPart(outfit, head, "Hair", Vector3.new(hs.X * 1.06, hs.Y * 0.32, hs.Z * 1.06), CFrame.new(0, hs.Y * 0.36, hs.Z * 0.04), Color3.fromRGB(26, 20, 16), Enum.Material.SmoothPlastic)
		weldPart(outfit, head, "HairBack", Vector3.new(hs.X * 1.06, hs.Y * 0.5, hs.Z * 0.2), CFrame.new(0, hs.Y * 0.12, hs.Z * 0.47), Color3.fromRGB(26, 20, 16), Enum.Material.SmoothPlastic)
	end
	GuardOutfit.Gear(character, name, outfit)
end

--- 경비 모자·이름표·가슴 휘장·완장·손전등만 붙인다 (몸·머리카락은 그대로). 오프닝의 공유처럼 몸이 따로 있는 인형에 쓴다
-- opts.headScale / opts.headDrop: 머리를 줄이거나 내린 인형(오프닝 공유)에서 모자를 그 머리에 맞춘다
function GuardOutfit.Gear(character, name, outfit, opts)
	opts = opts or {}
	local head = character:FindFirstChild("Head")
	if not head then
		return
	end
	if not outfit then
		outfit = Instance.new("Folder")
		outfit.Name = "GuardGear"
		outfit.Parent = character
	end
	local hs = head.Size * (opts.headScale or 1)
	local dy = -(opts.headDrop or 0)
	-- 경비 야구모자: 둥근 머리 덮개 + 앞챙 + 금색 엠블럼 + 챙 위 금색 줄
	weldPart(outfit, head, "CapCrown", Vector3.new(hs.X * 1.04, hs.Y * 0.62, hs.Z * 1.06), CFrame.new(0, hs.Y * 0.38 + dy, hs.Z * 0.02), NAVY, Enum.Material.Fabric, Enum.PartType.Ball)
	weldPart(outfit, head, "CapBrim", Vector3.new(hs.X * 0.7, 0.07, hs.Z * 0.5), CFrame.new(0, hs.Y * 0.28 + dy, -hs.Z * 0.66) * CFrame.Angles(math.rad(-8), 0, 0), NAVY, Enum.Material.Fabric)
	weldPart(outfit, head, "CapBadge", Vector3.new(hs.X * 0.2, hs.Y * 0.2, 0.06), CFrame.new(0, hs.Y * 0.5 + dy, -hs.Z * 0.5), GOLD, Enum.Material.Metal)
	weldPart(outfit, head, "CapBraid", Vector3.new(hs.X * 0.66, 0.05, 0.05), CFrame.new(0, hs.Y * 0.33 + dy, -hs.Z * 0.48), GOLD, Enum.Material.Metal)
	-- 반팔: 아래팔·손은 맨살
	for _, nm in ipairs({ "LeftLowerArm", "RightLowerArm", "LeftHand", "RightHand" }) do
		local p = character:FindFirstChild(nm)
		if p then
			p.Color = Config.SKIN_COLOR
		end
	end
	-- 초록 견장, 검은 벨트 + 은색 버클
	local ut = character:FindFirstChild("UpperTorso")
	if ut then
		local u = ut.Size
		for _, sx in ipairs({ -1, 1 }) do
			weldPart(outfit, ut, "Epaulette", Vector3.new(u.X * 0.26, 0.08, u.Z * 0.3), CFrame.new(sx * u.X * 0.3, u.Y / 2 + 0.02, 0), GREEN, Enum.Material.Fabric)
		end
	end
	local lt = character:FindFirstChild("LowerTorso")
	if lt then
		local l = lt.Size
		weldPart(outfit, lt, "Belt", Vector3.new(l.X * 1.02, l.Y * 0.5, l.Z * 1.04), CFrame.new(0, l.Y * 0.2, 0), Color3.fromRGB(18, 18, 20), Enum.Material.Leather)
		weldPart(outfit, lt, "Buckle", Vector3.new(0.3, l.Y * 0.4, 0.06), CFrame.new(0, l.Y * 0.2, -l.Z * 0.53), SILVER, Enum.Material.Metal)
	end

	-- 가슴 이름표(플레이어 이름) + 왼팔 경비 표지
	local torso = character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso")
	if torso then
		local ts = torso.Size
		local tag = weldPart(outfit, torso, "NameTag", Vector3.new(ts.X * 0.3, ts.Y * 0.12, 0.05), CFrame.new(ts.X * 0.24, ts.Y * 0.22, -ts.Z / 2 - 0.03), Color3.fromRGB(240, 240, 236), Enum.Material.SmoothPlastic)
		local gui = Instance.new("SurfaceGui")
		gui.Face = Enum.NormalId.Front
		gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		gui.PixelsPerStud = 120
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Text = name
		label.TextScaled = true
		label.Font = Enum.Font.BuilderSansBold
		label.TextColor3 = Color3.fromRGB(20, 24, 40)
		label.Parent = gui
		gui.Parent = tag
		weldPart(outfit, torso, "ChestBadge", Vector3.new(ts.X * 0.12, ts.Y * 0.16, 0.05), CFrame.new(-ts.X * 0.24, ts.Y * 0.05, -ts.Z / 2 - 0.03), SILVER, Enum.Material.Metal)
	end
	-- 오른팔 소매 바깥쪽 남색 패치 (금색 테두리)
	local arm = character:FindFirstChild("RightUpperArm") or character:FindFirstChild("Right Arm")
	if arm then
		local as = arm.Size
		local patch = weldPart(outfit, arm, "ArmPatch", Vector3.new(0.05, as.Y * 0.3, as.Z * 0.42), CFrame.new(as.X / 2 + 0.02, as.Y * 0.22, 0), Color3.fromRGB(30, 36, 70), Enum.Material.Fabric)
		weldPart(outfit, patch, "ArmPatchRim", Vector3.new(0.04, as.Y * 0.34, as.Z * 0.46), CFrame.new(-0.01, 0, 0), GOLD, Enum.Material.Fabric)
	end

	-- 손전등 (오른손에 들고 있음. 빛은 각자 화면에서 켜짐 → Client 스크립트)
	local hand = character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
	if hand then
		local downOffset = hand.Name == "Right Arm" and -hand.Size.Y * 0.45 or -hand.Size.Y * 0.2
		local body = weldPart(outfit, hand, "Flashlight", Vector3.new(1.1, 0.34, 0.34), CFrame.new(0, downOffset, -0.45) * CFrame.Angles(0, math.rad(90), 0), Color3.fromRGB(34, 34, 36), Enum.Material.Metal, Enum.PartType.Cylinder)
		weldPart(outfit, body, "Lens", Vector3.new(0.08, 0.36, 0.36), CFrame.new(0.56, 0, 0), Color3.fromRGB(255, 246, 216), Enum.Material.Neon, Enum.PartType.Cylinder)
	end
end

return GuardOutfit
