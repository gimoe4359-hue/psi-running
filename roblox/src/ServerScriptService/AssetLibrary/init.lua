-- 메시 에셋 라이브러리
-- assets/SongcheonAssets.glb 를 Studio에서 "3D 가져오기(Import 3D)"로 한 번 가져오면
-- (가져온 모델 이름: SongcheonAssets) 나무·책걸상·여학생·농구 골대가 사실적인 메시로 바뀐다.
-- 가져오지 않았으면 아무것도 바꾸지 않는다 (파트로 만든 버전 그대로).

local ServerStorage = game:GetService("ServerStorage")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")

local Templates = require(script:WaitForChild("Templates"))

local AssetLibrary = {}
local cache = {}

local function findPack()
	local pack = ServerStorage:FindFirstChild("SongcheonAssets")
		or workspace:FindFirstChild("SongcheonAssets")
		or ReplicatedStorage:FindFirstChild("SongcheonAssets")
	if pack and pack.Parent ~= ServerStorage then
		pcall(function()
			pack.Parent = ServerStorage
		end)
	end
	return pack
end

function AssetLibrary.HasPack()
	return findPack() ~= nil
end

local function material(name)
	local ok, m = pcall(function()
		return Enum.Material[name]
	end)
	return ok and m or Enum.Material.SmoothPlastic
end

-- 템플릿 만들기: 메시 크기·위치는 Templates.lua 에 적힌 값으로 다시 맞춘다
-- (가져오기 단위 설정이 달라도 크기가 틀어지지 않게)
local function buildTemplate(name)
	if cache[name] ~= nil then
		return cache[name] or nil
	end
	local spec = Templates[name]
	local pack = findPack()
	if not spec or not pack then
		cache[name] = false
		return nil
	end
	local model = Instance.new("Model")
	model.Name = name
	local anchor = Instance.new("Part")
	anchor.Name = "TemplateAnchor"
	anchor.Size = Vector3.new(0.2, 0.2, 0.2)
	anchor.Transparency = 1
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.CanQuery = false
	anchor.CanTouch = false
	anchor.CFrame = CFrame.new()
	anchor.Parent = model
	for _, m in ipairs(spec.meshes) do
		local src = pack:FindFirstChild(m.mesh, true)
		if not src or not src:IsA("MeshPart") then
			warn("[AssetLibrary] SongcheonAssets 안에 " .. m.mesh .. " 메시가 없어 " .. name .. " 은(는) 파트 버전을 씁니다.")
			model:Destroy()
			cache[name] = false
			return nil
		end
		local p = src:Clone()
		p.Name = m.name or m.mesh
		p.Anchored = true
		p.CanCollide = m.collide == true
		p.CanQuery = m.collide == true
		p.CanTouch = false
		p.Size = Vector3.new(m.size[1], m.size[2], m.size[3])
		p.CFrame = CFrame.new(m.pos[1], m.pos[2], m.pos[3])
		p.Color = Color3.fromRGB(m.color[1], m.color[2], m.color[3])
		p.Material = material(m.material)
		p.Transparency = m.transparency or 0
		p.Reflectance = m.reflectance or 0
		p.CastShadow = m.shadow ~= false
		pcall(function()
			p.TextureID = ""
		end)
		for _, c in ipairs(p:GetChildren()) do
			if c:IsA("SurfaceAppearance") then
				c:Destroy()
			end
		end
		p.Parent = model
	end
	model.PrimaryPart = anchor
	cache[name] = model
	return model
end

function AssetLibrary.CloneTemplate(name)
	local t = buildTemplate(name)
	return t and t:Clone() or nil
end

-- 맵 안의 SwapAnchor(나무·책걸상 자리 표시)를 메시로 바꾼다
function AssetLibrary.Apply(root, yield)
	if not findPack() then
		return 0
	end
	local n = 0
	for _, anchor in ipairs(CollectionService:GetTagged("SwapAnchor")) do
		if anchor:IsDescendantOf(root) and not anchor:GetAttribute("Swapped") then
			local tname = anchor:GetAttribute("Template")
			local tpl = tname and buildTemplate(tname)
			if tpl then
				local group = anchor.Parent
				local keep = Templates[tname].keep or {}
				for _, c in ipairs(group:GetChildren()) do
					if c:IsA("BasePart") and c ~= anchor then
						if table.find(keep, c.Name) then
							c.Transparency = 1 -- 부딪힘 판정만 남김
							for _, g in ipairs(c:GetChildren()) do
								g:Destroy()
							end
						else
							c:Destroy()
						end
					end
				end
				local clone = tpl:Clone()
				local s = anchor:GetAttribute("Scale") or 1
				if math.abs(s - 1) > 0.001 then
					pcall(function()
						clone:ScaleTo(s)
					end)
				end
				clone:PivotTo(anchor.CFrame)
				for _, c in ipairs(clone:GetChildren()) do
					if c.Name ~= "TemplateAnchor" then
						c.Parent = group
					end
				end
				clone:Destroy()
				anchor:SetAttribute("Swapped", true)
				n = n + 1
				if yield and n % 40 == 0 then
					task.wait()
				end
			end
		end
	end
	return n
end

return AssetLibrary
