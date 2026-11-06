"""Minimal Roblox XML place (.rbxlx) writer + geometry helpers.

No external dependencies. Everything is built from Parts / WedgeParts so the
place opens in Roblox Studio without any uploaded assets.
"""
import base64
import math
from xml.sax.saxutils import escape

# ---------------------------------------------------------------- enums
MAT = {
    'Plastic': 256, 'SmoothPlastic': 272, 'Neon': 288, 'Wood': 512,
    'WoodPlanks': 528, 'Marble': 784, 'Basalt': 788, 'Slate': 800,
    'CrackedLava': 804, 'Concrete': 816, 'Limestone': 820, 'Granite': 832,
    'Pavement': 836, 'Brick': 848, 'Pebble': 864, 'Cobblestone': 880,
    'Rock': 896, 'Sandstone': 912, 'CorrodedMetal': 1040,
    'DiamondPlate': 1056, 'Foil': 1072, 'Metal': 1088, 'Grass': 1280,
    'LeafyGrass': 1284, 'Sand': 1296, 'Fabric': 1312, 'Snow': 1328,
    'Mud': 1344, 'Ground': 1360, 'Asphalt': 1376, 'Ice': 1536,
    'Glass': 1568, 'ForceField': 1584,
}
FACE = {'Right': 0, 'Top': 1, 'Back': 2, 'Left': 3, 'Bottom': 4, 'Front': 5}
SHAPE = {'Ball': 0, 'Block': 1, 'Cylinder': 2}


# ---------------------------------------------------------------- CFrame
def _mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def _mv(a, v):
    return [sum(a[i][k] * v[k] for k in range(3)) for i in range(3)]


I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]


class CF:
    __slots__ = ('p', 'R')

    def __init__(self, p=(0, 0, 0), R=None):
        self.p = list(p)
        self.R = R if R is not None else I3

    def __mul__(self, o):
        q = _mv(self.R, o.p)
        return CF((self.p[0] + q[0], self.p[1] + q[1], self.p[2] + q[2]), _mm(self.R, o.R))

    def point(self, v):
        q = _mv(self.R, v)
        return (self.p[0] + q[0], self.p[1] + q[1], self.p[2] + q[2])


def T(x=0, y=0, z=0):
    return CF((x, y, z))


def Ry(d):
    c, s = math.cos(math.radians(d)), math.sin(math.radians(d))
    return CF(R=[[c, 0, s], [0, 1, 0], [-s, 0, c]])


def Rx(d):
    c, s = math.cos(math.radians(d)), math.sin(math.radians(d))
    return CF(R=[[1, 0, 0], [0, c, -s], [0, s, c]])


def Rz(d):
    c, s = math.cos(math.radians(d)), math.sin(math.radians(d))
    return CF(R=[[c, -s, 0], [s, c, 0], [0, 0, 1]])


def _norm(v):
    m = math.sqrt(sum(a * a for a in v)) or 1.0
    return [a / m for a in v]


def _cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def lookat(frm, to, up=(0, 1, 0)):
    look = _norm([to[i] - frm[i] for i in range(3)])
    if abs(look[1]) > 0.999:
        up = (0, 0, 1)
    right = _norm(_cross(look, up))
    upv = _cross(right, look)
    back = [-a for a in look]
    R = [[right[i], upv[i], back[i]] for i in range(3)]
    return CF(frm, R)


FACING_YAW = {'-z': 0, '+z': 180, '-x': 90, '+x': -90}


# ---------------------------------------------------------------- instances
class Inst:
    count = 0
    parts = 0

    def __init__(self, cls, name, parent=None):
        self.cls = cls
        self.props = []
        self.children = []
        self.prop('string', 'Name', name)
        if parent is not None:
            parent.children.append(self)
        Inst.count += 1

    def prop(self, t, n, v):
        self.props.append((t, n, v))
        return self


def _f(v):
    s = '%.4f' % v
    s = s.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def _ser_prop(t, n, v):
    if t == 'string':
        return '<string name="%s">%s</string>' % (n, escape(v))
    if t == 'bool':
        return '<bool name="%s">%s</bool>' % (n, 'true' if v else 'false')
    if t in ('float', 'double'):
        return '<%s name="%s">%s</%s>' % (t, n, _f(v), t)
    if t in ('int', 'token', 'int64'):
        return '<%s name="%s">%d</%s>' % (t, n, int(v), t)
    if t == 'Vector3':
        return '<Vector3 name="%s"><X>%s</X><Y>%s</Y><Z>%s</Z></Vector3>' % (n, _f(v[0]), _f(v[1]), _f(v[2]))
    if t == 'Vector2':
        return '<Vector2 name="%s"><X>%s</X><Y>%s</Y></Vector2>' % (n, _f(v[0]), _f(v[1]))
    if t == 'CoordinateFrame':
        p, R = v.p, v.R
        body = '<X>%s</X><Y>%s</Y><Z>%s</Z>' % (_f(p[0]), _f(p[1]), _f(p[2]))
        for i in range(3):
            for j in range(3):
                body += '<R%d%d>%s</R%d%d>' % (i, j, _f(R[i][j]), i, j)
        return '<CoordinateFrame name="%s">%s</CoordinateFrame>' % (n, body)
    if t == 'Color3uint8':
        return '<Color3uint8 name="%s">%d</Color3uint8>' % (n, 0xFF000000 | v)
    if t == 'Color3':
        r, g, b = ((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255
        return '<Color3 name="%s"><R>%s</R><G>%s</G><B>%s</B></Color3>' % (n, _f(r), _f(g), _f(b))
    if t == 'UDim2':
        return '<UDim2 name="%s"><XS>%s</XS><XO>%d</XO><YS>%s</YS><YO>%d</YO></UDim2>' % (
            n, _f(v[0]), v[1], _f(v[2]), v[3])
    if t == 'NumberRange':
        return '<NumberRange name="%s">%s %s </NumberRange>' % (n, _f(v[0]), _f(v[1]))
    if t == 'NumberSequence':
        return '<NumberSequence name="%s">%s</NumberSequence>' % (
            n, ''.join('%s %s %s ' % (_f(a), _f(b), _f(c)) for a, b, c in v))
    if t == 'ColorSequence':
        out = ''
        for tm, col in v:
            r, g, b = ((col >> 16) & 255) / 255, ((col >> 8) & 255) / 255, (col & 255) / 255
            out += '%s %s %s %s 0 ' % (_f(tm), _f(r), _f(g), _f(b))
        return '<ColorSequence name="%s">%s</ColorSequence>' % (n, out)
    if t == 'Content':
        return '<Content name="%s"><url>%s</url></Content>' % (n, escape(v))
    if t == 'BinaryString':
        return '<BinaryString name="%s">%s</BinaryString>' % (n, base64.b64encode(v).decode())
    raise ValueError(t)


def serialize(roots, path):
    ref = [0]
    out = []

    def w(inst, depth):
        ref[0] += 1
        ind = ''
        out.append('%s<Item class="%s" referent="RBX%08X">' % (ind, inst.cls, ref[0]))
        out.append('<Properties>')
        for t, n, v in inst.props:
            out.append(_ser_prop(t, n, v))
        out.append('</Properties>')
        for c in inst.children:
            w(c, depth + 1)
        out.append('%s</Item>' % ind)

    out.append('<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" '
               'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
               'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">')
    out.append('\t<Meta name="ExplicitAutoJoints">true</Meta>')
    out.append('\t<External>null</External>')
    out.append('\t<External>nil</External>')
    for r in roots:
        w(r, 1)
    out.append('</roblox>')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(out))


# ---------------------------------------------------------------- preview export
PREVIEW = []  # (kind, size, cf, color, transparency, material)
PREVIEW_TEXT = []  # (cf, size, face, text, bg, fg, bg_tr)
REGISTRY = []  # (x0,y0,z0,x1,y1,z1, name, collide, mat, tr)
OPENINGS = []  # world rects (x0,z0,x1,z1,y) kept clear by the dresser
PREVIEW_LIGHTS = []  # (pos, kind, color, brightness, range, shadows, face_dir)


# ---------------------------------------------------------------- builder
class B:
    """A parent instance + a local coordinate frame."""

    def __init__(self, parent, cf=None):
        self.parent = parent
        self.cf = cf if cf is not None else CF()

    def at(self, cf):
        return B(self.parent, self.cf * cf)

    def model(self, name, cls='Model', cf=None):
        m = Inst(cls, name, self.parent)
        return B(m, self.cf if cf is None else self.cf * cf)

    def folder(self, name):
        return self.model(name, 'Folder')

    # -- core part
    def part(self, name, size, cf, color, mat='SmoothPlastic', cls='Part', shape=None,
             tr=0.0, refl=0.0, collide=True, shadow=True, tags=None, touch=True, query=True):
        p = Inst(cls, name, self.parent)
        Inst.parts += 1
        world = self.cf * cf
        size = (max(size[0], 0.05), max(size[1], 0.05), max(size[2], 0.05))
        p.prop('bool', 'Anchored', True)
        p.prop('CoordinateFrame', 'CFrame', world)
        p.prop('Vector3', 'size', size)
        p.prop('Color3uint8', 'Color3uint8', color)
        p.prop('token', 'Material', MAT[mat])
        p.prop('token', 'TopSurface', 0)
        p.prop('token', 'BottomSurface', 0)
        if shape is not None:
            p.prop('token', 'shape', SHAPE[shape])
        if tr:
            p.prop('float', 'Transparency', tr)
        if refl:
            p.prop('float', 'Reflectance', refl)
        if not collide:
            p.prop('bool', 'CanCollide', False)
        if not touch:
            p.prop('bool', 'CanTouch', False)
        if not query:
            p.prop('bool', 'CanQuery', False)
        if not shadow:
            p.prop('bool', 'CastShadow', False)
        if tags:
            p.prop('BinaryString', 'Tags', '\0'.join(tags).encode('utf-8'))
        kind = shape or ('Wedge' if cls == 'WedgePart' else 'Block')
        if cls == 'SpawnLocation':
            kind = 'Block'
        PREVIEW.append((kind, size, world, color, tr, mat, refl))
        p._cf, p._size = world, size
        R = world.R
        hx = sum(abs(R[0][j]) * size[j] for j in range(3)) / 2
        hy = sum(abs(R[1][j]) * size[j] for j in range(3)) / 2
        hz = sum(abs(R[2][j]) * size[j] for j in range(3)) / 2
        pp = world.p
        REGISTRY.append((pp[0] - hx, pp[1] - hy, pp[2] - hz, pp[0] + hx, pp[1] + hy, pp[2] + hz, name, collide, mat, tr))
        return p

    def box(self, name, x0, y0, z0, x1, y1, z1, color, mat='SmoothPlastic', **kw):
        cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
        return self.part(name, (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)), T(cx, cy, cz), color, mat, **kw)

    def blk(self, name, size, pos, color, mat='SmoothPlastic', rot=None, **kw):
        cf = T(*pos)
        if rot is not None:
            cf = cf * rot
        return self.part(name, size, cf, color, mat, **kw)

    def cyl(self, name, length, diameter, pos, color, mat='SmoothPlastic', axis='y', rot=None, **kw):
        """Cylinder; Roblox cylinders run along local X, so we rotate."""
        cf = T(*pos)
        if rot is not None:
            cf = cf * rot
        if axis == 'y':
            cf = cf * Rz(90)
        elif axis == 'z':
            cf = cf * Ry(90)
        return self.part(name, (length, diameter, diameter), cf, color, mat, shape='Cylinder', **kw)

    def ball(self, name, d, pos, color, mat='SmoothPlastic', **kw):
        return self.part(name, (d, d, d), T(*pos), color, mat, shape='Ball', **kw)

    def wedge(self, name, size, cf, color, mat='SmoothPlastic', **kw):
        return self.part(name, size, cf, color, mat, cls='WedgePart', **kw)

    def beam(self, name, a, b, w, h, color, mat='SmoothPlastic', **kw):
        """Block stretched between two local points (centre line)."""
        L = math.dist(a, b)
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
        return self.part(name, (w, h, L), lookat(mid, b), color, mat, **kw)


# ---------------------------------------------------------------- decorations attached to parts
def light(part, kind='PointLight', color=0xFFF1E0, brightness=1.0, rng=16, shadows=False,
          face='Bottom', angle=90):
    if hasattr(part, '_cf'):
        cf, sz = part._cf, part._size
        fd = {'Bottom': (0, -1, 0), 'Top': (0, 1, 0), 'Front': (0, 0, -1), 'Back': (0, 0, 1), 'Left': (-1, 0, 0),
              'Right': (1, 0, 0)}[face]
        wd = [sum(cf.R[i][j] * fd[j] for j in range(3)) for i in range(3)]
        off = 0.6 if kind != 'PointLight' else 0
        PREVIEW_LIGHTS.append(([cf.p[i] + wd[i] * off for i in range(3)], kind, color, brightness, rng, shadows, wd))
    l = Inst(kind, kind, part)
    l.prop('float', 'Brightness', brightness)
    l.prop('Color3', 'Color', color)
    l.prop('float', 'Range', rng)
    l.prop('bool', 'Shadows', shadows)
    if kind in ('SpotLight', 'SurfaceLight'):
        l.prop('token', 'Face', FACE[face])
        l.prop('float', 'Angle', angle)
    return l


def gui_text(part, text, face='Front', bg=0x111111, fg=0xFFFFFF, bg_tr=0.0, glow=False,
             font=19, ppu=40, stroke=1.0, pad=0.06, rich=False):
    if text and hasattr(part, '_cf'):
        PREVIEW_TEXT.append((part._cf, part._size, face, text, bg, fg, bg_tr))
    g = Inst('SurfaceGui', 'SurfaceGui', part)
    g.prop('token', 'Face', FACE[face])
    g.prop('token', 'SizingMode', 1)
    g.prop('float', 'PixelsPerStud', ppu)
    if glow:
        g.prop('float', 'LightInfluence', 0)
        g.prop('float', 'Brightness', 2)
    else:
        g.prop('float', 'LightInfluence', 1)
    if bg_tr < 1:
        fr = Inst('Frame', 'BG', g)
        fr.prop('UDim2', 'Size', (1, 0, 1, 0))
        fr.prop('Color3', 'BackgroundColor3', bg)
        fr.prop('float', 'BackgroundTransparency', bg_tr)
        fr.prop('int', 'BorderSizePixel', 0)
    t = Inst('TextLabel', 'Text', g)
    t.prop('UDim2', 'Size', (1 - 2 * pad, 0, 1 - 2 * pad, 0))
    t.prop('UDim2', 'Position', (pad, 0, pad, 0))
    t.prop('float', 'BackgroundTransparency', 1)
    t.prop('string', 'Text', text)
    t.prop('Color3', 'TextColor3', fg)
    t.prop('bool', 'TextScaled', True)
    t.prop('bool', 'TextWrapped', True)
    t.prop('token', 'Font', font)
    t.prop('float', 'TextStrokeTransparency', stroke)
    if rich:
        t.prop('bool', 'RichText', True)
    return g


def particles(part, kind='dust', rate=4):
    """Built-in textures only (rbxasset://), so no uploads needed."""
    pe = Inst('ParticleEmitter', 'Particles_' + kind, part)
    presets = {
        'dust': dict(tex='rbxasset://textures/particles/smoke_main.dds', col=[(0, 0xB8B0A0), (1, 0x8A8070)],
                     size=[(0, 1.5, 0), (1, 4, 0)], tr=[(0, 1, 0), (0.3, 0.8, 0), (1, 1, 0)],
                     life=(6, 10), speed=(0.2, 0.6), acc=(0, 0.05, 0), spread=(180, 180), le=0),
        'steam': dict(tex='rbxasset://textures/particles/smoke_main.dds', col=[(0, 0xFFFFFF), (1, 0xDDD6CC)],
                      size=[(0, 1, 0), (1, 5, 0)], tr=[(0, 1, 0), (0.2, 0.75, 0), (1, 1, 0)],
                      life=(3, 5), speed=(2, 4), acc=(0, 1, 0), spread=(15, 15), le=0),
        'sparks': dict(tex='rbxasset://textures/particles/sparkles_main.dds', col=[(0, 0xFFE08A), (1, 0xFF7A1A)],
                       size=[(0, 0.25, 0), (1, 0.05, 0)], tr=[(0, 0, 0), (1, 1, 0)],
                       life=(0.3, 0.8), speed=(6, 12), acc=(0, -40, 0), spread=(60, 60), le=1),
        'embers': dict(tex='rbxasset://textures/particles/sparkles_main.dds', col=[(0, 0xFFB040), (1, 0xFF3010)],
                       size=[(0, 0.6, 0), (1, 0.1, 0)], tr=[(0, 0, 0), (1, 1, 0)],
                       life=(4, 8), speed=(3, 8), acc=(0, 4, 0), spread=(40, 40), le=1),
        'fog': dict(tex='rbxasset://textures/particles/smoke_main.dds', col=[(0, 0x6A1018), (1, 0x2A0408)],
                    size=[(0, 6, 0), (1, 12, 0)], tr=[(0, 1, 0), (0.4, 0.85, 0), (1, 1, 0)],
                    life=(8, 12), speed=(0.5, 1), acc=(0, 0, 0), spread=(180, 180), le=0),
    }
    p = presets[kind]
    pe.prop('Content', 'Texture', p['tex'])
    pe.prop('ColorSequence', 'Color', p['col'])
    pe.prop('NumberSequence', 'Size', p['size'])
    pe.prop('NumberSequence', 'Transparency', p['tr'])
    pe.prop('NumberRange', 'Lifetime', p['life'])
    pe.prop('NumberRange', 'Speed', p['speed'])
    pe.prop('Vector3', 'Acceleration', p['acc'])
    pe.prop('Vector2', 'SpreadAngle', p['spread'])
    pe.prop('float', 'Rate', rate)
    pe.prop('float', 'LightEmission', p['le'])
    pe.prop('token', 'EmissionDirection', FACE['Top'])
    pe.prop('NumberRange', 'RotSpeed', (-20, 20))
    pe.prop('NumberRange', 'Rotation', (0, 360))
    return pe
