-- 손글씨 글자 그림 (tools/make_atlas.js 가 만든 아틀라스) 을 GUI 로 붙이는 도우미.
-- Config.TEXT_ATLAS_IDS 에 그림 ID 가 있으면 ImageLabel(아틀라스의 한 칸), 없으면 비슷한 색의 TextLabel 로 대신 보여 준다.
local RunService = game:GetService("RunService")
local Atlas = require(script.Parent:WaitForChild("TextAtlas"))
local Config = require(script.Parent:WaitForChild("Config"))

local AtlasText = {}

local FALLBACK = {
	chalk = { Color3.fromRGB(236, 236, 228), Enum.Font.PatrickHand },
	blood = { Color3.fromRGB(122, 8, 8), Enum.Font.Creepster },
	ink = { Color3.fromRGB(28, 34, 74), Enum.Font.PatrickHand },
	redink = { Color3.fromRGB(170, 14, 14), Enum.Font.PatrickHand },
	brush = { Color3.fromRGB(20, 18, 16), Enum.Font.PatrickHand },
}

-- 아틀라스 N 번 그림의 이미지 ID (Config 값 → 서버가 데칼에서 찾아 둔 값 순서)
local function imageId(n)
	local ids = Config.TEXT_ATLAS_IDS or {}
	if ids[n] and ids[n] ~= 0 then
		return ids[n]
	end
	return script.Parent:GetAttribute("TextAtlasImage" .. n)
end

-- 서버 전용: 올려 둔 데칼을 열어 진짜 이미지 ID 를 찾아 ReplicatedStorage 속성에 적는다 (클라이언트도 읽음)
function AtlasText.Resolve()
	if not RunService:IsServer() then
		return
	end
	local InsertService = game:GetService("InsertService")
	for n, did in ipairs(Config.TEXT_ATLAS_DECAL_IDS or {}) do
		local cfgId = (Config.TEXT_ATLAS_IDS or {})[n]
		if (not cfgId or cfgId == 0) and did and did ~= 0 and not script.Parent:GetAttribute("TextAtlasImage" .. n) then
			local ok, model = pcall(function()
				return InsertService:LoadAsset(did)
			end)
			if ok and model then
				local d = model:FindFirstChildWhichIsA("Decal", true)
				local id = d and tonumber(string.match(d.Texture, "(%d+)%s*$"))
				if id then
					script.Parent:SetAttribute("TextAtlasImage" .. n, id)
				end
				model:Destroy()
			else
				warn("[AtlasText] 데칼 " .. tostring(did) .. " 을(를) 열지 못했습니다. 게임을 내 계정으로 Publish 했는지 확인하세요. " .. tostring(model))
			end
		end
	end
end

function AtlasText.Entry(key)
	return Atlas.Entries[key]
end

-- 그림 한 칸의 가로/세로 비 (가로 ÷ 세로)
function AtlasText.Aspect(key)
	local e = Atlas.Entries[key]
	return e and e.w / e.h or 4
end

function AtlasText.HasImages()
	for i = 1, Atlas.Count do
		if not imageId(i) then
			return false
		end
	end
	return true
end

-- parent 를 가득 채우는 글자 GUI 를 만든다. 반환: ImageLabel 또는 TextLabel
function AtlasText.Make(key, parent, zIndex)
	local e = Atlas.Entries[key]
	local id = e and imageId(e.atlas)
	local g
	if e and id then
		g = Instance.new("ImageLabel")
		g.Image = "rbxassetid://" .. id
		g.ImageRectOffset = Vector2.new(e.x, e.y)
		g.ImageRectSize = Vector2.new(e.w, e.h)
		g.ScaleType = Enum.ScaleType.Stretch
	else
		g = Instance.new("TextLabel")
		local f = FALLBACK[e and e.style or "ink"] or FALLBACK.ink
		g.Text = e and e.text or key
		g.TextColor3 = f[1]
		g.Font = f[2]
		g.TextScaled = true
		g.TextXAlignment = Enum.TextXAlignment.Left
		-- 이미지 ID 를 나중에 알게 되면 (서버가 데칼을 다 연 뒤) 그림으로 바꾼다
		if e then
			local conn
			conn = script.Parent:GetAttributeChangedSignal("TextAtlasImage" .. e.atlas):Connect(function()
				if g.Parent and imageId(e.atlas) then
					conn:Disconnect()
					local p, z = g.Parent, g.ZIndex
					g:Destroy()
					AtlasText.Make(key, p, z)
				end
			end)
		end
	end
	g.Name = "Writing"
	g.BackgroundTransparency = 1
	g.BorderSizePixel = 0
	g.Size = UDim2.fromScale(1, 1)
	if zIndex then
		g.ZIndex = zIndex
	end
	g:SetAttribute("AtlasKey", key)
	g.Parent = parent
	return g
end

return AtlasText
