-- 출근 차량(SUV)이 로비에서 학교 주차 자리까지 가는 길.
-- 서버와 모든 클라이언트가 같은 시각(서버 시계)으로 같은 자리를 계산하므로, 같이 탄 친구들끼리 화면이 맞는다.

local Config = require(script.Parent:WaitForChild("Config"))

local IntroPath = {}

local function catmull(p0, p1, p2, p3, t)
	local t2, t3 = t * t, t * t * t
	return 0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3)
end

-- 길을 잘게 나눈 점들과 누적 거리
local samples, length = {}, 0
do
	local pts = Config.INTRO_PATH
	local prev
	for i = 1, #pts - 1 do
		local p0, p1, p2, p3 = pts[math.max(i - 1, 1)], pts[i], pts[i + 1], pts[math.min(i + 2, #pts)]
		for k = 0, 19 do
			local pos = catmull(p0, p1, p2, p3, k / 20)
			if prev then
				length = length + (pos - prev).Magnitude
			end
			table.insert(samples, { pos = pos, d = length })
			prev = pos
		end
	end
	local last = pts[#pts]
	length = length + (last - prev).Magnitude
	table.insert(samples, { pos = last, d = length })
end
IntroPath.Length = length

--- 출발점에서 d 만큼 간 자리 (Y 는 0)
function IntroPath.PointAt(d)
	d = math.clamp(d, 0, length)
	for i = 1, #samples - 1 do
		local a, b = samples[i], samples[i + 1]
		if d <= b.d then
			local span = b.d - a.d
			return a.pos:Lerp(b.pos, span > 0 and (d - a.d) / span or 0)
		end
	end
	return samples[#samples].pos
end

--- 출발한 지 t 초일 때 간 거리: 천천히 출발해서 달리다가 주차할 때 천천히 선다
function IntroPath.DistanceAt(t)
	local u = math.clamp(t / Config.INTRO_SECONDS, 0, 1)
	local e = u * u * (3 - 2 * u)
	-- 출발·도착이 너무 느리지 않게 직선과 섞는다
	return length * (0.35 * u + 0.65 * e)
end

--- 출발한 지 t 초일 때 차의 CFrame (y 는 바퀴 밑 높이 groundY 를 따로 받는다)
function IntroPath.CFrameAt(t, groundY)
	local d = IntroPath.DistanceAt(t)
	local p = IntroPath.PointAt(d)
	local ahead = IntroPath.PointAt(d + 3)
	local pos = Vector3.new(p.X, groundY, p.Z)
	local look = Vector3.new(ahead.X, groundY, ahead.Z)
	if (look - pos).Magnitude < 0.05 then
		local back = IntroPath.PointAt(d - 3)
		look = pos + (pos - Vector3.new(back.X, groundY, back.Z))
	end
	return CFrame.lookAt(pos, look)
end

return IntroPath
