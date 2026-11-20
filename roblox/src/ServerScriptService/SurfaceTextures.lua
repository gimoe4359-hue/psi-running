-- 벽·바닥·천장 실사 텍스처
-- Roblox 기본 재질(회반죽·벽돌 질감)은 장난감처럼 보여서, 직접 만든 텍스처 그림(Config.SURFACE_TEXTURE_DECALS)을
-- Texture 로 면에 붙인다. 이웃한 파트끼리 무늬가 이어지도록 월드 좌표에 맞춰 Offset 을 정한다.
-- 데칼 → 이미지 ID 는 서버가 InsertService 로 찾는다 (게임을 aied0 계정으로 게시해야 열림).

local InsertService = game:GetService("InsertService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage:WaitForChild("Config"))

local SurfaceTextures = {}

-- 종류별: 한 장이 덮는 크기(stud, 가로·세로), 텍스처를 붙였을 때 파트 바탕색
local KINDS = {
	paint = { u = 12, v = 12, base = Color3.fromRGB(226, 223, 214) },
	lower = { u = 8, v = 8, base = Color3.fromRGB(176, 178, 180) },
	brick = { u = 3.0, v = 3.6, base = Color3.fromRGB(150, 76, 58) },
	floor = { u = 6, v = 6, base = Color3.fromRGB(146, 148, 150) },
	wood = { u = 5, v = 5, base = Color3.fromRGB(170, 124, 80) },
	ceiling = { u = 4, v = 4, base = Color3.fromRGB(236, 236, 232) },
	concrete = { u = 10, v = 10, base = Color3.fromRGB(212, 210, 204) },
}

-- 어느 파트에 어떤 텍스처를 붙일지 (본관·체육관 안의 큰 면만)
local FLOOR_NAMES = { CorridorFloor = "floor", HallFloor = "floor", Landing = "floor", StairFloor = "floor", WingFloor = "wood", Floor = "wood" }
local function kindOf(p)
	if p.Transparency > 0.05 or p.Size.X * p.Size.Y * p.Size.Z < 2 then
		return nil
	end
	local n, m = p.Name, p.Material
	if FLOOR_NAMES[n] then
		return FLOOR_NAMES[n], "floor"
	end
	if n == "CeilingTile" then
		return "ceiling", "ceiling"
	end
	if n == "Wainscot" then
		return "lower", "wall"
	end
	if m == Enum.Material.Brick then
		return "brick", "wall"
	end
	if m == Enum.Material.Plaster then
		return "paint", "wall"
	end
	if m == Enum.Material.Concrete and (n == "FloorBand" or n == "Sunshade" or n == "SunshadeLip" or n == "GymBand" or n == "ParapetCap" or n == "Canopy") then
		return "concrete", "wall"
	end
	return nil
end

local function resolve(decalId)
	if not decalId or decalId == 0 then
		return nil
	end
	local ok, model = pcall(function()
		return InsertService:LoadAsset(decalId)
	end)
	if not ok or not model then
		warn("[SurfaceTextures] 데칼 " .. tostring(decalId) .. " 을(를) 열지 못했습니다. 게임을 aied0 계정으로 Publish 했는지 확인하세요.")
		return nil
	end
	local d = model:FindFirstChildWhichIsA("Decal", true)
	local id = d and d.Texture
	model:Destroy()
	return id
end

local function wrap(x, t)
	return x % t
end

-- 면 하나에 Texture 붙이기. 회전 없는 파트면 월드 좌표에 맞춰 무늬를 잇는다
local function addTexture(p, face, image, k)
	local t = Instance.new("Texture")
	t.Name = "Surface"
	t.Texture = image
	t.Face = face
	t.StudsPerTileU = k.u
	t.StudsPerTileV = k.v
	local cf, s = p.CFrame, p.Size
	local axisAligned = cf.RightVector:FuzzyEq(Vector3.xAxis, 1e-3) and cf.UpVector:FuzzyEq(Vector3.yAxis, 1e-3)
	if axisAligned then
		local c = cf.Position
		local x0, x1 = c.X - s.X / 2, c.X + s.X / 2
		local y1 = c.Y + s.Y / 2
		local z0, z1 = c.Z - s.Z / 2, c.Z + s.Z / 2
		local offU, offV = 0, wrap(-y1, k.v)
		if face == Enum.NormalId.Front then
			offU = wrap(-x1, k.u)
		elseif face == Enum.NormalId.Back then
			offU = wrap(x0, k.u)
		elseif face == Enum.NormalId.Right then
			offU = wrap(-z1, k.u)
		elseif face == Enum.NormalId.Left then
			offU = wrap(z0, k.u)
		else
			offU, offV = wrap(x0, k.u), wrap(z0, k.v)
		end
		t.OffsetStudsU = offU
		t.OffsetStudsV = offV
	end
	t.Parent = p
end

function SurfaceTextures.Apply(root)
	local ids = Config.SURFACE_TEXTURE_DECALS or {}
	local images = {}
	for kind, did in pairs(ids) do
		images[kind] = resolve(did)
	end
	if not next(images) then
		return 0
	end
	local count = 0
	local scopes = { root:FindFirstChild("MainBuilding"), root:FindFirstChild("Gym") }
	for _, scope in ipairs(scopes) do
		if scope then
			for _, p in ipairs(scope:GetDescendants()) do
				if p:IsA("BasePart") and p.ClassName == "Part" then
					local kind, role = kindOf(p)
					local image = kind and images[kind]
					if image then
						local k = KINDS[kind]
						local s = p.Size
						local faces
						if role == "floor" then
							faces = { Enum.NormalId.Top }
						elseif role == "ceiling" then
							faces = { Enum.NormalId.Bottom }
						elseif s.X <= s.Y and s.X <= s.Z then
							faces = { Enum.NormalId.Left, Enum.NormalId.Right }
						elseif s.Z <= s.X and s.Z <= s.Y then
							faces = { Enum.NormalId.Front, Enum.NormalId.Back }
						else
							faces = { Enum.NormalId.Top, Enum.NormalId.Bottom }
						end
						for _, f in ipairs(faces) do
							addTexture(p, f, image, k)
						end
						p.Material = Enum.Material.SmoothPlastic
						p.Color = k.base
						count = count + 1
						if count % 300 == 0 then
							task.wait()
						end
					end
				end
			end
		end
	end
	-- 천장 텍스처에 이미 T바 무늬가 있으니 따로 만든 T바 파트는 숨긴다
	if images.ceiling then
		for _, p in ipairs(root:GetDescendants()) do
			if p:IsA("BasePart") and p.Name == "TBar" then
				p.Transparency = 1
			end
		end
	end
	return count
end

-- 나무 잎 뭉치: 투명한 판(LeafG/LeafZ/LeafP)의 앞뒤에 잎 그림을 붙인다.
-- 그림을 못 불러오면 판을 반투명한 잎 색으로 보이게 해 나무가 앙상해지지 않게 한다.
local LEAF_FALLBACK = { LeafG = Color3.fromRGB(226, 182, 48), LeafZ = Color3.fromRGB(186, 96, 40), LeafP = Color3.fromRGB(44, 72, 46) }
function SurfaceTextures.ApplyLeaves(root)
	local images = {}
	for name, did in pairs(Config.LEAF_DECALS or {}) do
		images[name] = resolve(did)
	end
	local n = 0
	for _, p in ipairs(root:GetDescendants()) do
		if p:IsA("BasePart") and LEAF_FALLBACK[p.Name] then
			local image = images[p.Name]
			if image then
				for _, face in ipairs({ Enum.NormalId.Front, Enum.NormalId.Back }) do
					local d = Instance.new("Decal")
					d.Texture = image
					d.Face = face
					d.Color3 = p.Color
					d.Parent = p
				end
			else
				p.Transparency = 0.35
				p.Color = LEAF_FALLBACK[p.Name]
				p.Material = Enum.Material.LeafyGrass
			end
			n = n + 1
			if n % 400 == 0 then
				task.wait()
			end
		end
	end
	return n
end

return SurfaceTextures
