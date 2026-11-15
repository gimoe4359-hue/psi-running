-- 경비원 공유 스킨 (무료)
-- 모든 플레이어를 남색 경비복 + 경비 모자 + 손전등 차림의 "경비원 공유"로 바꿉니다.
-- 옷 이미지는 roblox/clothes/*.png 를 Studio에서 무료 업로드한 뒤 Config에 ID를 넣으면 적용됩니다.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local GuardOutfit = {}

local NAVY = Color3.fromRGB(36, 46, 74)
local NAVY_DARK = Color3.fromRGB(30, 36, 52)
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
		desc.TorsoColor = NAVY
		desc.LeftArmColor = NAVY
		desc.RightArmColor = NAVY
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

	humanoid.DisplayName = "경비원 " .. Config.HERO_NAME
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
	-- 경비 모자
	local crownD = hs.X * 1.2
	weldPart(outfit, head, "CapCrown", Vector3.new(hs.Y * 0.42, crownD, crownD), CFrame.new(0, hs.Y * 0.62, 0) * CFrame.Angles(0, 0, math.rad(90)), NAVY, Enum.Material.Fabric, Enum.PartType.Cylinder)
	weldPart(outfit, head, "CapBand", Vector3.new(hs.Y * 0.14, crownD * 0.94, crownD * 0.94), CFrame.new(0, hs.Y * 0.42, 0) * CFrame.Angles(0, 0, math.rad(90)), BLACK, Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
	weldPart(outfit, head, "CapVisor", Vector3.new(hs.X * 0.95, 0.08, hs.Z * 0.5), CFrame.new(0, hs.Y * 0.4, -hs.Z * 0.66) * CFrame.Angles(math.rad(-12), 0, 0), BLACK, Enum.Material.SmoothPlastic)
	weldPart(outfit, head, "CapBadge", Vector3.new(hs.X * 0.24, hs.Y * 0.24, 0.06), CFrame.new(0, hs.Y * 0.66, -crownD * 0.5), GOLD, Enum.Material.Metal)

	-- 손전등 (오른손에 들고 있음. 빛은 각자 화면에서 켜짐 → Client 스크립트)
	local hand = character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
	if hand then
		local downOffset = hand.Name == "Right Arm" and -hand.Size.Y * 0.45 or -hand.Size.Y * 0.2
		local body = weldPart(outfit, hand, "Flashlight", Vector3.new(1.1, 0.34, 0.34), CFrame.new(0, downOffset, -0.45) * CFrame.Angles(0, math.rad(90), 0), Color3.fromRGB(34, 34, 36), Enum.Material.Metal, Enum.PartType.Cylinder)
		weldPart(outfit, body, "Lens", Vector3.new(0.08, 0.36, 0.36), CFrame.new(0.56, 0, 0), Color3.fromRGB(255, 246, 216), Enum.Material.Neon, Enum.PartType.Cylinder)
	end
end

return GuardOutfit
