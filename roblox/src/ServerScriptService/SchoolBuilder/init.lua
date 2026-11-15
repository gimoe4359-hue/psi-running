-- 송천고등학교 맵 빌더
-- MapData*.lua (tools/generate.js 가 만든 데이터)를 읽어서 파트로 지어 줍니다.
--
-- Studio에서 맵을 미리 지어 두고 싶으면 (편집 모드에서) 명령 바에 붙여 넣으세요:
--   require(game.ServerScriptService.SchoolBuilder).Build(workspace, false)
-- 그 다음 파일 저장하면 맵이 장소에 그대로 남습니다. (이미 있으면 게임 시작 때 다시 짓지 않아요)

local HttpService = game:GetService("HttpService")
local CollectionService = game:GetService("CollectionService")

local Builder = {}

local SHAPES = { [1] = Enum.PartType.Ball, [2] = Enum.PartType.Cylinder }

local function material(name)
	local ok, m = pcall(function()
		return Enum.Material[name]
	end)
	if ok and m then
		return m
	end
	return Enum.Material.SmoothPlastic
end

local function font(name)
	local ok, f = pcall(function()
		return Enum.Font[name]
	end)
	if ok and f then
		return f
	end
	return Enum.Font.GothamBold
end

local function band(a, b)
	return math.floor(a / b) % 2 == 1
end

function Builder.Build(parent, yield)
	parent = parent or workspace
	if yield == nil then
		yield = true
	end
	local existing = parent:FindFirstChild("School")
	if existing then
		return existing
	end

	local header = HttpService:JSONDecode(require(script.MapData0))
	local colors, mats = {}, {}
	for i, c in ipairs(header.colors) do
		colors[i - 1] = Color3.fromRGB(c[1], c[2], c[3])
	end
	for i, m in ipairs(header.mats) do
		mats[i - 1] = material(m)
	end

	-- 그룹(모델) 만들기: 경로 순서대로 부모가 먼저 나온다
	local groupObj, byPath = {}, {}
	for i, path in ipairs(header.groups) do
		local segs = string.split(path, "/")
		local obj
		if #segs == 1 then
			obj = Instance.new("Folder")
		else
			obj = Instance.new("Model")
		end
		obj.Name = segs[#segs]
		if #segs > 1 then
			local parentPath = table.concat(segs, "/", 1, #segs - 1)
			obj.Parent = byPath[parentPath]
		end
		byPath[path] = obj
		groupObj[i - 1] = obj
	end
	local root = groupObj[0]

	-- 파트
	local parts = {}
	local count = 0
	for chunk = 1, header.partChunks do
		local list = HttpService:JSONDecode(require(script["MapData" .. chunk]))
		for _, r in ipairs(list) do
			local shape = r[15]
			local p
			if shape == 3 then
				p = Instance.new("WedgePart")
			else
				p = Instance.new("Part")
				if SHAPES[shape] then
					p.Shape = SHAPES[shape]
				end
			end
			p.Name = r[2]
			p.Anchored = true
			p.Size = Vector3.new(r[3], r[4], r[5])
			p.CFrame = CFrame.new(r[6], r[7], r[8]) * CFrame.Angles(math.rad(r[9]), math.rad(r[10]), math.rad(r[11]))
			p.Color = colors[r[12]]
			p.Material = mats[r[13]]
			p.Transparency = r[14]
			p.TopSurface = Enum.SurfaceType.Smooth
			p.BottomSurface = Enum.SurfaceType.Smooth
			local flags = r[16]
			if band(flags, 1) then
				p.CanCollide = false
			end
			if band(flags, 2) then
				p.CastShadow = false
			end
			if band(flags, 8) then
				-- 판정용 투명 영역
				p.CanCollide = false
				p.CanTouch = false
				p.CastShadow = false
				p.Locked = true
			end
			local g = groupObj[r[1]]
			p.Parent = g
			if band(flags, 4) and g:IsA("Model") then
				g.PrimaryPart = p
			end
			parts[count] = p
			count = count + 1
			if yield and count % 1500 == 0 then
				task.wait()
			end
		end
	end

	-- 조명
	for _, L in ipairs(header.lights) do
		local p = parts[L[1]]
		local light
		if L[2] == 1 then
			light = Instance.new("SpotLight")
			light.Angle = L[8]
			light.Face = Enum.NormalId[L[7]]
		elseif L[2] == 2 then
			light = Instance.new("SurfaceLight")
			light.Angle = math.min(L[8], 90)
			light.Face = Enum.NormalId[L[7]]
		else
			light = Instance.new("PointLight")
		end
		light.Range = math.min(L[3], 60)
		light.Brightness = L[4]
		light.Color = colors[L[5]]
		light.Enabled = L[6] == 1
		light.Shadows = L[9] == 1
		light.Parent = p
	end

	-- 글씨 (SurfaceGui)
	for _, T in ipairs(header.texts) do
		local p = parts[T[1]]
		local gui = Instance.new("SurfaceGui")
		gui.Name = "Text"
		gui.Face = Enum.NormalId[T[2]]
		gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		gui.PixelsPerStud = T[10]
		gui.LightInfluence = T[8]
		if T[8] < 1 then
			gui.Brightness = 1.6
		end
		gui.ResetOnSpawn = false
		local label = Instance.new("TextLabel")
		label.Name = "Label"
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundColor3 = colors[T[5]]
		label.BackgroundTransparency = T[6]
		label.BorderSizePixel = 0
		label.TextColor3 = colors[T[4]]
		label.Font = font(T[7])
		label.Text = T[3]
		label.TextScaled = true
		label.TextWrapped = true
		if T[9] == "Left" then
			label.TextXAlignment = Enum.TextXAlignment.Left
			local pad = Instance.new("UIPadding")
			pad.PaddingLeft = UDim.new(0.04, 0)
			pad.PaddingRight = UDim.new(0.04, 0)
			pad.PaddingTop = UDim.new(0.03, 0)
			pad.PaddingBottom = UDim.new(0.03, 0)
			pad.Parent = label
		end
		label.Parent = gui
		gui.Parent = p
	end

	-- PrimaryPart가 없는 모델은 기준점(피벗)을 모델 한가운데로
	for _, g in pairs(groupObj) do
		if g:IsA("Model") and not g.PrimaryPart and #g:GetChildren() > 0 then
			local ok, cf = pcall(function()
				return g:GetBoundingBox()
			end)
			if ok and cf then
				g.WorldPivot = CFrame.new(cf.Position)
			end
		end
	end

	-- 태그와 속성 (스크립트가 찾을 때 씀)
	for _, t in ipairs(header.tags) do
		CollectionService:AddTag(parts[t[1]], t[2])
	end
	for _, t in ipairs(header.gtags) do
		CollectionService:AddTag(groupObj[t[1]], t[2])
	end
	for _, a in ipairs(header.attrs) do
		parts[a[1]]:SetAttribute(a[2], a[3])
	end

	root.Parent = parent
	return root
end

return Builder
