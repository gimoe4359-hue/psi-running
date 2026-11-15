--!nonstrict
-- 조수민 추격 AI.
--   · ChaserSpawn 태그가 있는 층마다 한 명씩 배치된다 (순찰 지점 = 같은 층의 ChaserPatrol).
--   · M.summon(층, 위치, 지속시간) — 경보가 울리면 잠깐 나타났다 사라진다.
--   · M.setAsleep(층, true/false) — 낮잠 자는 조수민 (10층).
--   · M.makeStatue(cf) — 움직이지 않는 조수민 (50층 "무궁화 꽃이 피었습니다" 술래).
-- 숨는 곳(HideSpot) 안에 있는 플레이어는 보지 못한다.

local Players = game:GetService("Players")
local CS = game:GetService("CollectionService")
local PFS = game:GetService("PathfindingService")
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS:WaitForChild("Config"))

local M = {}
local ctx = nil
local chasers = {}
local summoned = {}
local template = nil
local templateBusy = false

local ANIM_RUN = "rbxassetid://507767714"
local ANIM_WALK = "rbxassetid://507777826"
local ANIM_IDLE = "rbxassetid://507766666"

local function buildRig()
	local model = nil
	pcall(function()
		local id = Config.Chaser.UserId
		if id == 0 and Config.Chaser.UserName ~= "" then
			id = Players:GetUserIdFromNameAsync(Config.Chaser.UserName)
		end
		if id and id > 0 then
			model = Players:CreateHumanoidModelFromUserId(id)
		end
	end)
	if not model then
		local desc = Instance.new("HumanoidDescription")
		desc.HeadColor = Color3.fromRGB(235, 220, 210)
		desc.TorsoColor = Color3.fromRGB(120, 20, 30)
		desc.LeftArmColor = Color3.fromRGB(235, 220, 210)
		desc.RightArmColor = Color3.fromRGB(235, 220, 210)
		desc.LeftLegColor = Color3.fromRGB(30, 30, 36)
		desc.RightLegColor = Color3.fromRGB(30, 30, 36)
		model = Players:CreateHumanoidModelFromDescription(desc, Enum.HumanoidRigType.R15)
	end
	model.Name = Config.Chaser.DisplayName
	local hum = model:FindFirstChildOfClass("Humanoid")
	hum.DisplayName = Config.Chaser.DisplayName
	hum.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff
	hum.NameDisplayDistance = 60
	hum.BreakJointsOnDeath = false
	hum.MaxHealth = 1e9
	hum.Health = 1e9
	-- glowing eyes so she reads in the dark
	local head = model:FindFirstChild("Head")
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
			local w = Instance.new("WeldConstraint")
			w.Part0 = head
			w.Part1 = eye
			w.Parent = eye
			eye.Parent = model
		end
		local l = Instance.new("PointLight")
		l.Color = Color3.fromRGB(255, 60, 60)
		l.Range = 9
		l.Brightness = 0.8
		l.Parent = head
	end
	for _, p in ipairs(model:GetDescendants()) do
		if p:IsA("Script") or p:IsA("LocalScript") then p:Destroy() end
	end
	return model
end

-- the avatar is downloaded once; every other 조수민 is a copy of it
local function newRig()
	if not template then
		if templateBusy then
			while templateBusy do task.wait(0.1) end
		else
			templateBusy = true
			local ok, res = pcall(buildRig)
			if ok then template = res else warn("[Chaser] rig:", res) end
			templateBusy = false
		end
	end
	if not template then return nil end
	return template:Clone()
end

local function loadAnims(hum)
	local animator = hum:FindFirstChildOfClass("Animator")
	if not animator then
		animator = Instance.new("Animator")
		animator.Parent = hum
	end
	local function mk(id)
		local a = Instance.new("Animation")
		a.AnimationId = id
		local ok, track = pcall(function() return animator:LoadAnimation(a) end)
		return if ok then track else nil
	end
	return { run = mk(ANIM_RUN), walk = mk(ANIM_WALK), idle = mk(ANIM_IDLE) }
end

local function newChaser(floor, homeCF, patrol)
	local model = newRig()
	if not model then return nil end
	model:PivotTo(homeCF + Vector3.new(0, 0.5, 0))
	model.Parent = workspace
	local hum = model:FindFirstChildOfClass("Humanoid")
	local hrp = model:WaitForChild("HumanoidRootPart")
	local anims = loadAnims(hum)
	if #patrol == 0 then patrol = { homeCF.Position } end
	local self = { model = model, hum = hum, hrp = hrp, floor = floor, home = homeCF, patrol = patrol,
		cooldown = 0, lastSeen = nil, mode = "none", asleep = false, alert = nil }

	local function play(name)
		if self.mode == name then return end
		self.mode = name
		for k, t in pairs(anims) do
			if t then
				if k == name then t:Play(0.2) else t:Stop(0.2) end
			end
		end
	end

	local rayParams = RaycastParams.new()
	rayParams.FilterType = Enum.RaycastFilterType.Exclude
	local function canSee(pos)
		rayParams.FilterDescendantsInstances = { model }
		local dir = pos - hrp.Position
		if dir.Magnitude > 70 then return false end
		local hit = workspace:Raycast(hrp.Position, dir, rayParams)
		if not hit then return true end
		return Players:GetPlayerFromCharacter(hit.Instance.Parent) ~= nil or (hit.Position - pos).Magnitude < 2
	end

	local path = PFS:CreatePath({ AgentRadius = 2.2, AgentHeight = 5.5, AgentCanJump = true, WaypointSpacing = 4 })
	local waypoints = {}
	local wpIndex = 1
	local lastPathAt = 0
	local lastGoal = nil
	local stuckSince = 0
	local lastPos = hrp.Position

	local function plan(goal)
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
		if self.asleep then
			play("idle")
			waypoints = {}
			if (hrp.Position - self.home.Position).Magnitude > 6 then model:PivotTo(self.home + Vector3.new(0, 0.5, 0)) end
			return
		end
		if self.cooldown > now then
			play("idle")
			hum:MoveTo(hrp.Position)
			return
		end
		-- nearest visible player on this floor; otherwise remember where one was last seen
		local best = nil
		local bestD = 1e9
		for _, e in ipairs(ctx.alive(floor)) do
			if not ctx.isHidden(e.player) then
				local d = (e.hrp.Position - hrp.Position).Magnitude
				if d < bestD and (d < 14 or canSee(e.hrp.Position)) then
					best = e
					bestD = d
				end
			end
		end
		if best then
			self.lastSeen = best.hrp.Position
			hum.WalkSpeed = if bestD < 14 then Config.Chaser.SprintSpeed else Config.Chaser.ChaseSpeed
			play("run")
			if bestD < 3.6 then
				ctx.kill(best.char, "chaser")
				ctx.playAt(hrp, "rbxasset://sounds/HalloweenGhost.wav", 1, 1.3)
				self.cooldown = now + 5
				self.lastSeen = nil
				return
			end
			if bestD < 12 and canSee(self.lastSeen) then
				hum:MoveTo(self.lastSeen)
				waypoints = {}
			else
				plan(self.lastSeen)
			end
		elseif self.lastSeen and (self.lastSeen - hrp.Position).Magnitude > 4 then
			hum.WalkSpeed = Config.Chaser.ChaseSpeed
			play("run")
			plan(self.lastSeen)
		else
			self.lastSeen = nil
			hum.WalkSpeed = Config.Chaser.PatrolSpeed
			play("walk")
			if not lastGoal or (lastGoal - hrp.Position).Magnitude < 4 or now - lastPathAt > 12 then
				plan(self.patrol[math.random(1, #self.patrol)])
			end
		end
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
			if stuckSince == 0 then
				stuckSince = now
			elseif now - stuckSince > 2 then
				hum.Jump = true
				lastGoal = nil
				stuckSince = 0
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
	task.spawn(function()
		for _, s in ipairs(CS:GetTagged("ChaserSpawn")) do
			if s:IsA("BasePart") then
				local floor = ctx.floorOfY(s.Position.Y)
				local patrol = { s.Position }
				for _, p in ipairs(workspace:GetDescendants()) do
					if p.Name == "ChaserPatrol" and p:IsA("BasePart") and ctx.floorOfY(p.Position.Y) == floor then
						table.insert(patrol, p.Position)
					end
				end
				local ok, res = pcall(newChaser, floor, s.CFrame, patrol)
				if ok and res then
					table.insert(chasers, res)
					if Config.Chaser.SleepFloors[floor] then res.asleep = true end
				else
					warn("[Chaser] spawn failed:", res)
				end
			end
		end
		print("[PSI] 조수민 배치:", #chasers, "명")
	end)
end

-- a temporary 조수민: appears at pos, hunts on that floor, disappears after `duration` seconds (nil = until cleared)
function M.summon(floor, pos, duration, headStart)
	task.spawn(function()
		local ok, ch = pcall(newChaser, floor, CFrame.new(pos), { pos })
		if not ok or not ch then
			warn("[Chaser] summon failed:", ch)
			return
		end
		ch.cooldown = os.clock() + (headStart or 1.5)
		table.insert(summoned, ch)
		ctx.playAt(ch.hrp, "rbxasset://sounds/HalloweenGhost.wav", 1, 0.9)
		if duration then
			task.wait(duration)
			if ch.model.Parent then ch.model:Destroy() end
		end
	end)
end

function M.clearSummoned()
	for _, ch in ipairs(summoned) do
		if ch.model.Parent then ch.model:Destroy() end
	end
	summoned = {}
end

function M.setAsleep(floor, asleep)
	for _, ch in ipairs(chasers) do
		if ch.floor == floor then
			ch.asleep = asleep
			ch.lastSeen = nil
			if asleep then ch.model:PivotTo(ch.home + Vector3.new(0, 0.5, 0)) end
		end
	end
end

-- a 조수민 that never walks; the caller turns her with model:PivotTo
function M.makeStatue(cf)
	local model = newRig()
	if not model then return nil end
	local hrp = model:FindFirstChild("HumanoidRootPart")
	if hrp then hrp.Anchored = true end
	model:PivotTo(cf)
	model.Parent = workspace
	local hum = model:FindFirstChildOfClass("Humanoid")
	if hum then
		local anims = loadAnims(hum)
		if anims.idle then anims.idle:Play() end
	end
	return model
end

function M.resetAll()
	M.clearSummoned()
	for _, ch in ipairs(chasers) do
		ch.model:PivotTo(ch.home + Vector3.new(0, 0.5, 0))
		ch.lastSeen = nil
		ch.cooldown = os.clock() + 3
		ch.asleep = Config.Chaser.SleepFloors[ch.floor] == true
	end
end

return M
