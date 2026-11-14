--!nonstrict
-- 조수민 추격 AI. ChaserSpawn 태그가 있는 층마다 한 명씩 배치된다.
-- 같은 층의 플레이어를 쫓고, 잡으면 죽인다. 안 보이면 순찰 지점(ChaserPatrol)을 돈다.

local Players = game:GetService("Players")
local CS = game:GetService("CollectionService")
local PFS = game:GetService("PathfindingService")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS:WaitForChild("Config"))

local M = {}
local ctx: any = nil
local chasers: { any } = {}

local ANIM_RUN = "rbxassetid://507767714"
local ANIM_WALK = "rbxassetid://507777826"
local ANIM_IDLE = "rbxassetid://507766666"

local function buildRig(): Model
	local model: Model? = nil
	local ok = pcall(function()
		local id = Config.Chaser.UserId
		if id == 0 and Config.Chaser.UserName ~= "" then
			id = Players:GetUserIdFromNameAsync(Config.Chaser.UserName)
		end
		if id and id > 0 then
			model = Players:CreateHumanoidModelFromUserId(id)
		end
	end)
	if not ok or not model then
		local desc = Instance.new("HumanoidDescription")
		desc.HeadColor = Color3.fromRGB(235, 220, 210)
		desc.TorsoColor = Color3.fromRGB(120, 20, 30)
		desc.LeftArmColor = Color3.fromRGB(235, 220, 210)
		desc.RightArmColor = Color3.fromRGB(235, 220, 210)
		desc.LeftLegColor = Color3.fromRGB(30, 30, 36)
		desc.RightLegColor = Color3.fromRGB(30, 30, 36)
		model = Players:CreateHumanoidModelFromDescription(desc, Enum.HumanoidRigType.R15)
	end
	local m = model :: Model
	m.Name = Config.Chaser.DisplayName
	local hum = m:FindFirstChildOfClass("Humanoid") :: Humanoid
	hum.DisplayName = Config.Chaser.DisplayName
	hum.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff
	hum.NameDisplayDistance = 60
	hum.BreakJointsOnDeath = false
	hum.MaxHealth = 1e9; hum.Health = 1e9
	-- glowing eyes so she reads in the dark
	local head = m:FindFirstChild("Head")
	if head and head:IsA("BasePart") then
		for _, s in ipairs({ -1, 1 }) do
			local eye = Instance.new("Part")
			eye.Name = "Eye"
			eye.Size = Vector3.new(0.25, 0.14, 0.1)
			eye.Material = Enum.Material.Neon
			eye.Color = Color3.fromRGB(255, 40, 40)
			eye.CanCollide = false
			eye.Massless = true
			eye.CFrame = head.CFrame * CFrame.new(s * 0.25, 0.2, -0.55)
			local w = Instance.new("WeldConstraint"); w.Part0 = head; w.Part1 = eye; w.Parent = eye
			eye.Parent = m
		end
		local l = Instance.new("PointLight"); l.Color = Color3.fromRGB(255, 60, 60); l.Range = 9; l.Brightness = 0.8; l.Parent = head
	end
	for _, p in ipairs(m:GetDescendants()) do
		if p:IsA("BasePart") then p.CollisionGroup = "Default" end
		if p:IsA("Script") or p:IsA("LocalScript") then p:Destroy() end
	end
	return m
end

local function loadAnims(hum: Humanoid)
	local animator = hum:FindFirstChildOfClass("Animator") or Instance.new("Animator", hum)
	local function mk(id)
		local a = Instance.new("Animation"); a.AnimationId = id
		local ok, track = pcall(function() return animator:LoadAnimation(a) end)
		return ok and track or nil
	end
	return { run = mk(ANIM_RUN), walk = mk(ANIM_WALK), idle = mk(ANIM_IDLE) }
end

local function newChaser(spawnPart: BasePart)
	local floor = ctx.floorOfY(spawnPart.Position.Y)
	local f = floor and Config.byN[floor]
	local model = buildRig()
	model:PivotTo(spawnPart.CFrame + Vector3.new(0, 0.5, 0))
	model.Parent = workspace
	local hum = model:FindFirstChildOfClass("Humanoid") :: Humanoid
	local hrp = model:WaitForChild("HumanoidRootPart") :: BasePart
	local anims = loadAnims(hum)
	local patrol: { Vector3 } = { spawnPart.Position }
	for _, p in ipairs(workspace:GetDescendants()) do
		if p.Name == "ChaserPatrol" and p:IsA("BasePart") and ctx.floorOfY(p.Position.Y) == floor then
			table.insert(patrol, p.Position)
		end
	end
	local self = { model = model, hum = hum, hrp = hrp, floor = floor, home = spawnPart.CFrame, patrol = patrol,
		cooldown = 0, target = nil :: Player?, lastSeen = nil :: Vector3?, anims = anims, mode = "idle" }

	local function play(name)
		if self.mode == name then return end
		self.mode = name
		for k, t in pairs(anims) do if t then if k == name then t:Play(0.2) else t:Stop(0.2) end end end
	end

	local function playersOnFloor(): { Player }
		local out = {}
		for _, p in ipairs(Players:GetPlayers()) do
			local c = p.Character
			local h = c and c:FindFirstChildOfClass("Humanoid")
			local r = c and c:FindFirstChild("HumanoidRootPart")
			if h and h.Health > 0 and r and ctx.floorOfY((r :: BasePart).Position.Y) == floor then table.insert(out, p) end
		end
		return out
	end

	local rayParams = RaycastParams.new()
	rayParams.FilterType = Enum.RaycastFilterType.Exclude
	local function canSee(pos: Vector3): boolean
		rayParams.FilterDescendantsInstances = { model }
		local dir = pos - hrp.Position
		if dir.Magnitude > 70 then return false end
		local hit = workspace:Raycast(hrp.Position, dir, rayParams)
		if not hit then return true end
		return Players:GetPlayerFromCharacter(hit.Instance.Parent) ~= nil or (hit.Position - pos).Magnitude < 2
	end

	local path = PFS:CreatePath({ AgentRadius = 2.2, AgentHeight = 5.5, AgentCanJump = true, WaypointSpacing = 4 })
	local waypoints: { PathWaypoint } = {}
	local wpIndex = 1
	local lastPathAt = 0
	local lastGoal: Vector3? = nil
	local stuckSince = 0
	local lastPos = hrp.Position

	local function plan(goal: Vector3)
		if lastGoal and (lastGoal - goal).Magnitude < 3 and os.clock() - lastPathAt < 1.5 then return end
		lastGoal = goal
		lastPathAt = os.clock()
		local ok = pcall(function() path:ComputeAsync(hrp.Position, goal) end)
		if ok and path.Status == Enum.PathStatus.Success then
			waypoints = path:GetWaypoints()
			wpIndex = 2
		else
			waypoints = {}
			hum:MoveTo(goal)
		end
	end

	local function step()
		if hum.Health <= 0 then return end
		local now = os.clock()
		if self.cooldown > now then play("idle"); hum:MoveTo(hrp.Position); return end
		-- pick target: nearest visible player on this floor; otherwise remember where we last saw one
		local best: Player? = nil
		local bestD = 1e9
		for _, p in ipairs(playersOnFloor()) do
			local r = (p.Character :: Model):FindFirstChild("HumanoidRootPart") :: BasePart
			local d = (r.Position - hrp.Position).Magnitude
			if d < bestD and (d < 14 or canSee(r.Position)) then best = p; bestD = d end
		end
		if best then
			self.target = best
			self.lastSeen = ((best.Character :: Model):FindFirstChild("HumanoidRootPart") :: BasePart).Position
			hum.WalkSpeed = if bestD < 14 then Config.Chaser.SprintSpeed else Config.Chaser.ChaseSpeed
			play("run")
			if bestD < 3.6 then
				local char = best.Character :: Model
				char:SetAttribute("DeathCause", "chaser")
				local h = char:FindFirstChildOfClass("Humanoid") :: Humanoid
				h.Health = 0
				ctx.playAt(hrp, "rbxasset://sounds/HalloweenGhost.wav", 1, 1.3)
				self.cooldown = now + 5
				self.target = nil
				return
			end
			if bestD < 12 and canSee(self.lastSeen :: Vector3) then
				hum:MoveTo(self.lastSeen :: Vector3)
				waypoints = {}
			else
				plan(self.lastSeen :: Vector3)
			end
		elseif self.lastSeen and (self.lastSeen - hrp.Position).Magnitude > 4 then
			hum.WalkSpeed = Config.Chaser.ChaseSpeed
			play("run")
			plan(self.lastSeen)
		else
			self.lastSeen = nil
			self.target = nil
			hum.WalkSpeed = Config.Chaser.PatrolSpeed
			play("walk")
			if not lastGoal or (lastGoal - hrp.Position).Magnitude < 4 or now - lastPathAt > 12 then
				plan(patrol[math.random(1, #patrol)])
			end
		end
		-- follow waypoints
		if #waypoints > 0 then
			local wp = waypoints[math.min(wpIndex, #waypoints)]
			if (Vector3.new(wp.Position.X, hrp.Position.Y, wp.Position.Z) - hrp.Position).Magnitude < 3 then
				wpIndex += 1
				if wpIndex > #waypoints then waypoints = {} end
			else
				if wp.Action == Enum.PathWaypointAction.Jump then hum.Jump = true end
				hum:MoveTo(wp.Position)
			end
		end
		-- unstick
		if (hrp.Position - lastPos).Magnitude < 0.3 then
			if stuckSince == 0 then stuckSince = now elseif now - stuckSince > 2 then
				hum.Jump = true; lastGoal = nil; stuckSince = 0
			end
		else
			stuckSince = 0
		end
		lastPos = hrp.Position
	end

	task.spawn(function()
		while model.Parent do
			local ok, err = pcall(step)
			if not ok then warn("[Chaser]", err) end
			task.wait(0.2)
		end
	end)
	return self
end

function M.start(c)
	ctx = c
	for _, s in ipairs(CS:GetTagged("ChaserSpawn")) do
		if s:IsA("BasePart") then
			local ok, err = pcall(function() table.insert(chasers, newChaser(s)) end)
			if not ok then warn("[Chaser] spawn failed:", err) end
		end
	end
	print("[PSI] 조수민 배치:", #chasers, "명")
end

function M.resetAll()
	for _, ch in ipairs(chasers) do
		ch.model:PivotTo(ch.home + Vector3.new(0, 0.5, 0))
		ch.target = nil; ch.lastSeen = nil; ch.cooldown = os.clock() + 3
	end
end

return M
