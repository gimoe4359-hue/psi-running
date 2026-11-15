--!nonstrict
-- 층 컬링 (이 플레이어 화면에서만 적용).
-- 건물 26개 층이 전부 그려지면 무겁다. 벽과 바닥에 가려 어차피 안 보이는 다른 층은 잠시 치워 두고,
-- 지금 있는 층과 바로 위아래 층만 남긴다. 계단실에서는 위아래 2층씩, 건물 밖에서는 건물 전체를 보여 준다.
-- 끄고 싶으면 ReplicatedStorage/Config 의 M.FloorCulling 을 false 로.

local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local RunS = game:GetService("RunService")

if not game:IsLoaded() then game.Loaded:Wait() end

local Config = require(RS:WaitForChild("Config"))
if Config.FloorCulling == false then return end

local player = Players.LocalPlayer
local map = workspace:WaitForChild("PSI_88F_Escape")
local floorsFolder = map:WaitForChild("Floors")

local stash = Instance.new("Folder")
stash.Name = "PSI_HiddenFloors"
stash.Parent = RS

local count = #Config.floors
local models = {}
local shown = {}
local lastWanted = {}
local started = os.clock()
for i = 1, count do
	shown[i] = true
	lastWanted[i] = started
end

-- floor models are named F<label>_<title>, e.g. F88F_공유하우스, FB3_짱큰베리
local function register(m)
	local lab = string.match(m.Name, "^F([^_]+)_")
	if not lab then return end
	for i, f in ipairs(Config.floors) do
		if f.label == lab then models[i] = m end
	end
end
for _, m in ipairs(floorsFolder:GetChildren()) do register(m) end
for _, m in ipairs(stash:GetChildren()) do register(m) end

local function indexAt(y)
	local n = Config.floorOfY(y)
	if n then
		for i, f in ipairs(Config.floors) do
			if f.n == n then return i end
		end
	end
	if y >= Config.floors[1].base then return 1 end
	return count
end

local function setShown(i, on)
	local m = models[i]
	shown[i] = on
	if m then m.Parent = if on then floorsFolder else stash end
end

RunS.Stepped:Connect(function()
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then return end
	local pos = hrp.Position
	local idx = indexAt(pos.Y)
	local lo, hi = 1, count
	local outside = pos.X < -84 or pos.X > 82 or math.abs(pos.Z) > 60
	if not (outside and pos.Y > Config.coreTop) then
		local r = if pos.X > 60 then 2 else 1
		lo = math.max(1, idx - r)
		hi = math.min(count, idx + r)
	end
	-- the floor under the player's feet comes back before physics runs (teleports, respawns)
	if not shown[idx] then setShown(idx, true) end
	local now = os.clock()
	local changed = false
	for i = lo, hi do
		lastWanted[i] = now
		if not shown[i] and not changed then
			setShown(i, true)
			changed = true
		end
	end
	-- at most one floor is moved per frame, and only after it has been out of range for a moment
	if not changed then
		for i = 1, count do
			if shown[i] and (i < lo or i > hi) and now - lastWanted[i] > 2 then
				setShown(i, false)
				break
			end
		end
	end
end)
