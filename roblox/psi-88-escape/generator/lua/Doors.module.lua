--!nonstrict
-- 여닫는 문. 맵 생성기가 문짝마다 'Door' 태그와 경첩 기준점(DoorPivot_<지금 각도>_<열린 각도>)을 넣어 둔다.
-- 문 앞에서 "열기 / 닫기"를 누르면 문짝이 경첩을 축으로 돈다. 닫힌 문은 조수민의 길도 막지만,
-- 쫓는 중인 조수민은 문 앞에서 잠깐 멈췄다가 문을 연다. 'DoorLocked' 문은 잠겨 있다.

local CS = game:GetService("CollectionService")

local M = {}
local ctx = nil
local doors = {}

local SND_DOOR = "rbxasset://sounds/switch.wav"

local function pose(door, angle)
	local pivot = door.closed * CFrame.Angles(0, math.rad(angle), 0)
	for _, p in ipairs(door.parts) do
		p.CFrame = pivot * door.rel[p]
	end
end

local function label(door)
	if door.prompt then door.prompt.ActionText = if door.angle == 0 then "열기" else "닫기" end
end

local function swingTo(door, target)
	if door.busy or door.angle == target then return end
	door.busy = true
	local from = door.angle
	ctx.playAt(door.leaf, SND_DOOR, 0.6, if target == 0 then 0.7 else 0.9)
	for k = 1, 8 do
		local t = k / 8
		t = 1 - (1 - t) * (1 - t)
		pose(door, from + (target - from) * t)
		task.wait(0.03)
	end
	door.angle = target
	door.busy = false
	door.pending = false
	label(door)
end

local function setup(model, locked)
	local pivot = nil
	local parts = {}
	for _, d in ipairs(model:GetDescendants()) do
		if d:IsA("BasePart") then
			if string.match(d.Name, "^DoorPivot_") then
				pivot = d
			else
				table.insert(parts, d)
			end
		end
	end
	if not pivot or #parts == 0 then return end
	local curText, openText = string.match(pivot.Name, "^DoorPivot_(%-?%d+)_(%-?%d+)$")
	local cur = tonumber(curText)
	local opened = tonumber(openText)
	if not cur or not opened then return end
	local leaf = parts[1]
	for _, p in ipairs(parts) do
		if p.Size.X * p.Size.Y * p.Size.Z > leaf.Size.X * leaf.Size.Y * leaf.Size.Z then leaf = p end
	end
	local door = { parts = parts, rel = {}, leaf = leaf, pos = pivot.Position, angle = cur, home = cur, openAngle = opened,
		closed = pivot.CFrame * CFrame.Angles(0, -math.rad(cur), 0), busy = false, pending = false, locked = locked }
	for _, p in ipairs(parts) do
		door.rel[p] = pivot.CFrame:ToObjectSpace(p.CFrame)
	end
	local pp = ctx.prompt(leaf, if locked then "당겨 보기" else "열기", "문", 0)
	pp.MaxActivationDistance = 8
	if locked then
		pp.Triggered:Connect(function(player)
			ctx.playAt(leaf, SND_DOOR, 0.7, 0.5)
			ctx.say(player, "잠겨 있다. 덜컹거리기만 한다", "alert")
		end)
		return
	end
	door.prompt = pp
	label(door)
	pp.Triggered:Connect(function()
		swingTo(door, if door.angle == 0 then door.openAngle else 0)
	end)
	table.insert(doors, door)
end

-- 조수민 calls this while hunting: a closed door next to her opens after a short pause
function M.openNear(pos, radius)
	for _, door in ipairs(doors) do
		if door.angle == 0 and not door.busy and not door.pending then
			local d = door.pos - pos
			if math.abs(d.Y) < 8 and d.X * d.X + d.Z * d.Z < radius * radius then
				door.pending = true
				task.delay(0.9, function()
					local ok, err = pcall(swingTo, door, door.openAngle)
					if not ok then warn("[Doors]", err) end
					door.pending = false
				end)
			end
		end
	end
end

function M.reset()
	for _, door in ipairs(doors) do
		if not door.busy and door.angle ~= door.home then
			door.angle = door.home
			pose(door, door.home)
			label(door)
		end
	end
end

function M.start(c)
	ctx = c
	for _, m in ipairs(CS:GetTagged("Door")) do
		local ok, err = pcall(setup, m, false)
		if not ok then warn("[Doors]", err) end
	end
	for _, m in ipairs(CS:GetTagged("DoorLocked")) do
		local ok, err = pcall(setup, m, true)
		if not ok then warn("[Doors]", err) end
	end
	print("[PSI] 여닫는 문:", #doors, "개")
end

return M
