--!nonstrict
-- 쭉쭉이 (77층 백룸). 누군가 쳐다보는 동안은 꼼짝도 하지 않는다. 아무도 안 볼 때만 다가온다.

local Players = game:GetService("Players")
local CS = game:GetService("CollectionService")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS:WaitForChild("Config"))

local M = {}
local ctx: any
local model: Model? = nil
local home: CFrame? = nil
local floor: number? = nil
local lastGhost = 0

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude

local function looking(player: Player, target: Vector3): boolean
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	local head = char and char:FindFirstChild("Head")
	if not hrp or not head then return false end
	local eye = (head :: BasePart).Position
	local dir = target - eye
	local dist = dir.Magnitude
	if dist > 85 then return false end
	-- the server does not know the camera; the character's facing is a good enough proxy
	local facing = (hrp :: BasePart).CFrame.LookVector
	if facing:Dot(dir.Unit) < 0.35 then return false end
	rayParams.FilterDescendantsInstances = { char, model :: Instance }
	local hit = workspace:Raycast(eye, dir, rayParams)
	return hit == nil
end

function M.start(c)
	ctx = c
	for _, m in ipairs(CS:GetTagged("ZzukZzuk")) do if m:IsA("Model") then model = m end end
	if not model then return end
	local mdl = model :: Model
	home = mdl:GetPivot()
	floor = ctx.floorOfY(home.Position.Y)
	for _, p in ipairs(mdl:GetDescendants()) do
		if p:IsA("BasePart") then p.Anchored = true; p.CanCollide = false; p.CanTouch = false end
	end
	task.spawn(function()
		local last = os.clock()
		while mdl.Parent do
			task.wait(0.08)
			local now = os.clock()
			local dt = math.min(0.2, now - last)
			last = now
			local pivot = mdl:GetPivot()
			local target: BasePart? = nil
			local bestD = 1e9
			local seen = false
			for _, p in ipairs(Players:GetPlayers()) do
				local char = p.Character
				local hum = char and char:FindFirstChildOfClass("Humanoid")
				local hrp = char and char:FindFirstChild("HumanoidRootPart")
				if hum and hum.Health > 0 and hrp and ctx.floorOfY((hrp :: BasePart).Position.Y) == floor then
					local d = ((hrp :: BasePart).Position - pivot.Position).Magnitude
					if d < bestD then bestD = d; target = hrp :: BasePart end
					if looking(p, pivot.Position + Vector3.new(0, 6, 0)) then seen = true end
				end
			end
			if not target or bestD > 75 then continue end
			if bestD < 4.5 then
				local char = target.Parent :: Model
				char:SetAttribute("DeathCause", "zzuk")
				local hum = char:FindFirstChildOfClass("Humanoid") :: Humanoid
				hum.Health = 0
				ctx.playAt(target, "rbxasset://sounds/HalloweenGhost.wav", 1, 0.5)
				-- step back so the respawned player gets a breath
				mdl:PivotTo(pivot * CFrame.new(0, 0, 12))
				task.wait(3)
				continue
			end
			if seen then continue end
			-- approach: slide toward the target, facing it, feet on the floor
			local flat = Vector3.new(target.Position.X, pivot.Position.Y, target.Position.Z)
			local dir = (flat - pivot.Position)
			local stepLen = math.min(dir.Magnitude - 3.5, Config.Zzuk.Speed * dt)
			if stepLen <= 0 then continue end
			local newPos = pivot.Position + dir.Unit * stepLen
			mdl:PivotTo(CFrame.lookAt(newPos, newPos + dir.Unit))
			if now - lastGhost > 6 and bestD < 30 then
				lastGhost = now
				ctx.playAt(target, "rbxasset://sounds/HalloweenLightning.wav", 0.5, 0.6)
			end
		end
	end)
	print("[PSI] 쭉쭉이 대기 중 (77F)")
end

function M.reset()
	if model and home then (model :: Model):PivotTo(home :: CFrame) end
end

return M
