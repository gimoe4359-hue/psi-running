-- 손글씨 글자 그림 (tools/make_atlas.js 가 만든 아틀라스) 을 GUI 로 붙이는 도우미.
-- Config.TEXT_ATLAS_IDS 에 그림 ID 가 있으면 ImageLabel(아틀라스의 한 칸), 없으면 비슷한 색의 TextLabel 로 대신 보여 준다.
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

function AtlasText.Entry(key)
	return Atlas.Entries[key]
end

-- 그림 한 칸의 가로/세로 비 (가로 ÷ 세로)
function AtlasText.Aspect(key)
	local e = Atlas.Entries[key]
	return e and e.w / e.h or 4
end

function AtlasText.HasImages()
	local ids = Config.TEXT_ATLAS_IDS or {}
	for i = 1, Atlas.Count do
		if not ids[i] or ids[i] == 0 then
			return false
		end
	end
	return true
end

-- parent 를 가득 채우는 글자 GUI 를 만든다. 반환: ImageLabel 또는 TextLabel
function AtlasText.Make(key, parent, zIndex)
	local e = Atlas.Entries[key]
	local ids = Config.TEXT_ATLAS_IDS or {}
	local id = e and ids[e.atlas] or 0
	local g
	if e and id and id ~= 0 then
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
