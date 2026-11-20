#!/usr/bin/env python3
"""경비원 공유 유니폼: Roblox 셔츠·바지 템플릿(585x559 PNG)을 그린다.

Roblox Studio에서 이미지 업로드는 무료다(Asset Manager → Import).
업로드한 이미지 ID를 src/ReplicatedStorage/Config.lua 의 SHIRT_IMAGE_ID / PANTS_IMAGE_ID 에 넣으면
게임 안에서 모든 플레이어가 이 옷을 입는다. (마켓에 '판매용 옷'으로 올릴 때만 로벅스가 든다.)

사용법: python3 make_clothes.py <한글 폰트 경로(.woff/.ttf/.otf)>
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'clothes')
KFONT = sys.argv[1] if len(sys.argv) > 1 else None

W, H = 585, 559
# (x, y, w, h)
TORSO = dict(U=(231, 8, 128, 64), L=(165, 74, 64, 128), F=(231, 74, 128, 128), R=(361, 74, 64, 128),
             B=(427, 74, 128, 128), D=(231, 204, 128, 64))
RARM = dict(U=(217, 289, 64, 64), L=(19, 355, 64, 128), B=(85, 355, 64, 128), R=(151, 355, 64, 128),
            F=(217, 355, 64, 128), D=(217, 485, 64, 64))
LARM = dict(U=(308, 289, 64, 64), F=(308, 355, 64, 128), L=(374, 355, 64, 128), B=(440, 355, 64, 128),
            R=(506, 355, 64, 128), D=(308, 485, 64, 64))

NAVY = (36, 46, 74, 255)
NAVY_D = (26, 33, 54, 255)
NAVY_L = (52, 64, 98, 255)
GOLD = (222, 184, 74, 255)
SHIRT = (196, 210, 226, 255)
BLACK = (20, 20, 22, 255)
SILVER = (200, 204, 210, 255)


def font(size, korean=False):
    path = KFONT if (korean and KFONT) else '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def rect(d, r, fill):
    x, y, w, h = r
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=fill)


def noise(img, r, amount=6):
    # 천 느낌 줄무늬
    x, y, w, h = r
    px = img.load()
    for j in range(y, y + h):
        for i in range(x, x + w):
            c = px[i, j]
            k = ((i * 7 + j * 13) % 5 - 2) * amount // 2
            px[i, j] = (max(0, min(255, c[0] + k)), max(0, min(255, c[1] + k)), max(0, min(255, c[2] + k)), c[3])


def center_text(d, box, text, f, fill):
    x, y, w, h = box
    tb = d.textbbox((0, 0), text, font=f)
    d.text((x + (w - (tb[2] - tb[0])) / 2 - tb[0], y + (h - (tb[3] - tb[1])) / 2 - tb[1]), text, font=f, fill=fill)


def shirt():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for part in (TORSO, RARM, LARM):
        for r in part.values():
            rect(d, r, NAVY)
            noise(img, r)
    # 앞판: 안에 받쳐 입은 하늘색 셔츠 + 넥타이 + 지퍼 + 주머니 + 명찰
    fx, fy, fw, fh = TORSO['F']
    d.polygon([(fx + 44, fy), (fx + 84, fy), (fx + 64, fy + 34)], fill=SHIRT)
    d.polygon([(fx + 59, fy + 6), (fx + 69, fy + 6), (fx + 72, fy + 40), (fx + 64, fy + 50), (fx + 56, fy + 40)], fill=NAVY_D)
    d.polygon([(fx + 30, fy), (fx + 46, fy), (fx + 64, fy + 36), (fx + 52, fy + 40)], fill=NAVY_L)  # 깃
    d.polygon([(fx + 98, fy), (fx + 82, fy), (fx + 64, fy + 36), (fx + 76, fy + 40)], fill=NAVY_L)
    d.line([(fx + 64, fy + 40), (fx + 64, fy + fh)], fill=NAVY_D, width=3)
    for k in range(4):
        d.ellipse([fx + 69, fy + 50 + k * 20, fx + 75, fy + 56 + k * 20], fill=GOLD)
    # 주머니
    for px_ in (fx + 12, fx + 80):
        d.rectangle([px_, fy + 46, px_ + 34, fy + 80], outline=NAVY_D, width=2)
        d.rectangle([px_, fy + 46, px_ + 34, fy + 54], fill=NAVY_L)
    # 경비 마크 (왼쪽 가슴 = 그림 기준 오른쪽)
    d.rectangle([fx + 82, fy + 22, fx + 112, fy + 40], fill=GOLD)
    center_text(d, (fx + 82, fy + 22, 30, 18), '경비', font(13, True), NAVY_D)
    # 명찰
    d.rectangle([fx + 14, fy + 28, fx + 46, fy + 40], fill=(240, 240, 236, 255))
    center_text(d, (fx + 14, fy + 28, 32, 12), '공 유', font(10, True), BLACK)
    # 허리 밴드
    d.rectangle([fx, fy + fh - 12, fx + fw, fy + fh], fill=NAVY_D)
    # 뒷판: SECURITY / 경비
    bx, by, bw, bh = TORSO['B']
    d.rectangle([bx, by + 18, bx + bw, by + 46], fill=GOLD)
    center_text(d, (bx, by + 18, bw, 28), 'SECURITY', font(20), NAVY_D)
    center_text(d, (bx, by + 54, bw, 40), '경 비', font(30, True), GOLD)
    d.rectangle([bx, by + bh - 12, bx + bw, by + bh], fill=NAVY_D)
    # 옆판 허리
    for k in ('L', 'R'):
        x, y, w, h = TORSO[k]
        d.rectangle([x, y + h - 12, x + w, y + h], fill=NAVY_D)
    # 어깨 견장
    ux, uy, uw, uh = TORSO['U']
    d.rectangle([ux, uy + 4, ux + 28, uy + 60], fill=NAVY_D)
    d.rectangle([ux + uw - 28, uy + 4, ux + uw, uy + 60], fill=NAVY_D)
    d.rectangle([ux + 44, uy + 40, ux + 84, uy + 64], fill=SHIRT)
    # 팔: 소매 끝 금색 줄, 팔뚝 패치
    for arm in (RARM, LARM):
        for k in ('L', 'B', 'R', 'F'):
            x, y, w, h = arm[k]
            d.rectangle([x, y + h - 18, x + w, y + h - 14], fill=GOLD)
            d.rectangle([x, y + h - 10, x + w, y + h], fill=(232, 196, 160, 255))  # 손목 피부
        d.rectangle(list(arm['D'][:2]) + [arm['D'][0] + 63, arm['D'][1] + 63], fill=(232, 196, 160, 255))
    # 오른팔 바깥쪽 패치
    x, y, w, h = RARM['R']
    d.ellipse([x + 10, y + 14, x + 54, y + 52], fill=GOLD)
    center_text(d, (x + 10, y + 14, 44, 38), '송천', font(14, True), NAVY_D)
    x, y, w, h = LARM['L']
    d.ellipse([x + 10, y + 14, x + 54, y + 52], fill=GOLD)
    center_text(d, (x + 10, y + 14, 44, 38), 'PSY', font(13), NAVY_D)
    return img


def pants():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    PN = (30, 36, 52, 255)
    for part in (TORSO, RARM, LARM):
        for r in part.values():
            rect(d, r, PN)
            noise(img, r, 4)
    # 허리띠 + 버클
    for k in ('F', 'L', 'R', 'B'):
        x, y, w, h = TORSO[k]
        d.rectangle([x, y, x + w, y + 14], fill=BLACK)
        for lx in range(x + 8, x + w, 28):
            d.rectangle([lx, y, lx + 4, y + 16], fill=PN)
    fx, fy, fw, fh = TORSO['F']
    d.rectangle([fx + 54, fy + 1, fx + 74, fy + 13], fill=SILVER)
    d.line([(fx + 64, fy + 14), (fx + 64, fy + 60)], fill=(20, 24, 36, 255), width=2)
    # 다리: 바깥쪽 줄, 구두
    for arm, outer in ((RARM, 'R'), (LARM, 'L')):
        for k in ('L', 'B', 'R', 'F'):
            x, y, w, h = arm[k]
            d.rectangle([x, y + h - 22, x + w, y + h], fill=BLACK)
            d.rectangle([x, y + h - 24, x + w, y + h - 22], fill=(60, 60, 64, 255))
        x, y, w, h = arm[outer]
        d.rectangle([x + 28, y, x + 36, y + h - 24], fill=GOLD)
        rect(d, arm['D'], BLACK)
    return img


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    shirt().save(os.path.join(OUT, 'guard_shirt.png'))
    pants().save(os.path.join(OUT, 'guard_pants.png'))
    print('saved', OUT)
