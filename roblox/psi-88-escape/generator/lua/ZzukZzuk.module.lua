--!nonstrict
-- 쭉쭉이 (77층 백룸). 누군가 쳐다보는 동안은 꼼짝도 하지 않는다. 아무도 안 볼 때만 다가온다.
-- 정전(M.setDark(true)) 중에는 보고 있어도 움직인다.

local Players = game:GetService("Players")
local CS = game:GetService("CollectionService")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS:WaitForChild("Config"))

local M = {}
local ctx = nil
local model = nil
local home = nil
local floor = nil
local lastGhost = 0
local dark = false

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude

local function looking(e, target)
	local head = e.char:FindFirstChild("Head")
	if not head then return false end
	local eye = head.Position
	local dir = target - eye
	if dir.Magnitude > 85 then return false end
	-- the server does not know the camera; the character's facing is a good enough proxy
	if e.hrp.CFrame.LookVector:Dot(dir.Unit) < 0.35 then return false end
	rayParams.FilterDescendantsInstances = { e.char, model }
	return workspace:Raycast(eye, dir, rayParams) == nil
end

local function step(dt)
	local pivot = model:GetPivot()
	local target = nil
	local bestD = 1e9
	local seen = false
	for _, e in ipairs(ctx.alive(floor)) do
		local d = (e.hrp.Position - pivot.Position).Magnitude
		if d < bestD then
			bestD = d
			target = e
		end
		if looking(e, pivot.Position + Vector3.new(0, 6, 0)) then seen = true end
	end
	if not target or bestD > 75 then return end
	if bestD < 4.5 then
		ctx.kill(target.char, "zzuk")
		ctx.playAt(target.hrp, "rbxasset://sounds/HalloweenGhost.wav", 1, 0.5)
		-- step back so the respawned player gets a breath
		model:PivotTo(pivot * CFrame.new(0, 0, 12))
		task.wait(3)
		return
	end
	if seen and not dark then return end
	-- slide toward the target, facing it, feet on the floor
	local flat = Vector3.new(target.hrp.Position.X, pivot.Position.Y, target.hrp.Position.Z)
	local dir = flat - pivot.Position
	local speed = if dark then Config.Zzuk.Speed * 0.6 else Config.Zzuk.Speed
	local stepLen = math.min(dir.Magnitude - 3.5, speed * dt)
	if stepLen <= 0 then return end
	local newPos = pivot.Position + dir.Unit * stepLen
	model:PivotTo(CFrame.lookAt(newPos, newPos + dir.Unit))
	local now = os.clock()
	if now - lastGhost > 6 and bestD < 30 then
		lastGhost = now
		ctx.playAt(target.hrp, "rbxasset://sounds/HalloweenLightning.wav", 0.5, 0.6)
	end
end

function M.start(c)
	ctx = c
	for _, m in ipairs(CS:GetTagged("ZzukZzuk")) do
		if m:IsA("Model") then model = m end
	end
	if not model then return end
	home = model:GetPivot()
	floor = ctx.floorOfY(home.Position.Y)
	for _, p in ipairs(model:GetDescendants()) do
		if p:IsA("BasePart") then
			p.Anchored = true
			p.CanCollide = false
			p.CanTouch = false
		end
	end
	task.spawn(function()
		local last = os.clock()
		while model.Parent do
			task.wait(0.08)
			local now = os.clock()
			local dt = math.min(0.2, now - last)
			last = now
			local ok, err = pcall(step, dt)
			if not ok then warn("[ZzukZzuk]", err) end
		end
	end)
	print("[PSI] 쭉쭉이 대기 중 (77F)")
end

function M.setDark(on)
	dark = on
end

function M.reset()
	dark = false
	if model and home then model:PivotTo(home) end
end

return M
