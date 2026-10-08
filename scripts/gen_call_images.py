"""Vẽ ảnh minh họa cuộc gọi Chrono. Chạy: python scripts/gen_call_images.py"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "artifacts" / "cu-chi"
W, H = 960, 640
BG = (20, 24, 36)
EARTH = (92, 64, 40)
EARTH_DARK = (58, 38, 24)
SOIL = (168, 124, 72)
LEAF = (47, 122, 64)
LEAF_DARK = (24, 78, 40)
WOOD = (146, 96, 48)
SMOKE = (210, 214, 220)
FIRE = (254, 149, 28)
AMBER = (253, 180, 56)
CREAM = (244, 236, 220)
INK = (18, 20, 28)
WATER = (56, 140, 196)


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    if path.is_file():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


TITLE = font(34, True)
LABEL = font(22, True)


def new_board(title: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 22, W - 28, 78), 18, fill=(27, 30, 44))
    draw.text((48, 32), title, font=TITLE, fill=AMBER)
    return image, draw


def ground(draw: ImageDraw.ImageDraw, top: int = 250) -> None:
    draw.rectangle((0, top, W, H), fill=EARTH)
    draw.rectangle((0, top, W, top + 18), fill=LEAF_DARK)
    draw.polygon([(0, top + 18), (180, top - 28), (420, top + 10), (700, top - 16), (W, top + 18)], fill=LEAF)


def save(image: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    image.save(OUT / name, "PNG")


def scene_stove() -> Image.Image:
    image, draw = new_board("Bếp Hoàng Cầm")
    ground(draw, 300)
    draw.rounded_rectangle((330, 250, 630, 430), 20, fill=EARTH_DARK, outline=SOIL, width=6)
    draw.ellipse((390, 210, 570, 300), fill=(90, 90, 96), outline=CREAM, width=4)
    draw.pieslice((400, 300, 560, 390), 200, 340, fill=FIRE)
    draw.ellipse((470, 250, 530, 310), fill=SMOKE)
    draw.ellipse((500, 200, 560, 260), fill=(230, 232, 236))
    return image


def scene_trench() -> Image.Image:
    image, draw = new_board("Rãnh khói")
    ground(draw, 220)
    draw.polygon([(80, 360), (880, 470), (880, 530), (80, 430)], fill=EARTH_DARK, outline=SOIL)
    for x in (180, 340, 520, 700):
        draw.ellipse((x, 300, x + 70, 370), fill=SMOKE)
    draw.text((80, 560), "Khói đi theo rãnh rồi mới thoát lên", font=LABEL, fill=CREAM)
    return image


def scene_smoke_room() -> Image.Image:
    image, draw = new_board("Hầm khói")
    ground(draw, 180)
    draw.rounded_rectangle((180, 240, 780, 520), 40, fill=EARTH_DARK, outline=SOIL, width=6)
    draw.ellipse((300, 300, 460, 430), fill=SMOKE)
    draw.ellipse((480, 280, 660, 420), fill=(226, 228, 232))
    draw.rectangle((430, 470, 530, 540), fill=WOOD)
    return image


def scene_vents() -> Image.Image:
    image, draw = new_board("Tia tản khói")
    ground(draw, 340)
    for x, h in ((160, 90), (300, 140), (460, 70), (620, 160), (760, 100)):
        draw.line((x + 20, 360, x + 20, 360 - h), fill=SMOKE, width=8)
        draw.ellipse((x, 360 - h - 48, x + 48, 360 - h), fill=SMOKE)
    return image


def scene_ditch() -> Image.Image:
    image, draw = new_board("Rãnh trong lòng đất")
    ground(draw, 200)
    draw.arc((80, 280, 880, 560), 200, 340, fill=SOIL, width=28)
    draw.arc((120, 310, 840, 540), 200, 340, fill=SMOKE, width=10)
    return image


def scene_kitchen() -> Image.Image:
    image, draw = new_board("Bếp trong địa đạo")
    ground(draw, 170)
    draw.rounded_rectangle((120, 230, 840, 540), 36, fill=(36, 28, 22), outline=SOIL, width=5)
    draw.rounded_rectangle((180, 340, 360, 470), 16, fill=EARTH_DARK)
    draw.ellipse((210, 300, 330, 380), fill=(110, 110, 116))
    draw.pieslice((220, 360, 320, 430), 200, 340, fill=FIRE)
    draw.rectangle((520, 360, 760, 470), fill=WOOD)
    draw.ellipse((560, 330, 640, 390), fill=CREAM)
    draw.ellipse((660, 330, 740, 390), fill=CREAM)
    return image


def scene_leaves() -> Image.Image:
    image, draw = new_board("Miệng hầm phủ lá")
    ground(draw, 280)
    draw.ellipse((360, 300, 600, 430), fill=EARTH_DARK, outline=SOIL, width=5)
    for box in ((340, 250, 430, 320), (430, 230, 540, 310), (500, 260, 620, 340), (390, 300, 500, 380)):
        draw.ellipse(box, fill=LEAF)
    return image


def scene_lid() -> Image.Image:
    image, draw = new_board("Nắp hầm")
    ground(draw, 260)
    draw.rounded_rectangle((300, 300, 660, 470), 28, fill=WOOD, outline=(90, 58, 28), width=6)
    draw.ellipse((450, 360, 510, 420), fill=EARTH_DARK)
    draw.arc((250, 250, 710, 420), 200, 340, fill=SOIL, width=8)
    return image


def scene_soil() -> Image.Image:
    image, draw = new_board("Đất phủ lên cửa")
    ground(draw, 300)
    draw.polygon([(250, 430), (480, 250), (710, 430)], fill=SOIL)
    draw.ellipse((400, 360, 560, 450), fill=EARTH_DARK)
    draw.ellipse((430, 300, 500, 350), fill=LEAF)
    return image


def scene_mouth() -> Image.Image:
    image, draw = new_board("Cửa miệng hầm")
    ground(draw, 200)
    draw.ellipse((330, 250, 630, 520), fill=INK, outline=SOIL, width=10)
    draw.polygon([(420, 470), (480, 360), (540, 470)], fill=CREAM)
    return image


def scene_lid_closed() -> Image.Image:
    image, draw = new_board("Nắp đậy kín")
    ground(draw, 240)
    draw.ellipse((300, 280, 660, 500), fill=WOOD, outline=EARTH_DARK, width=8)
    draw.line((340, 390, 620, 390), fill=EARTH_DARK, width=6)
    draw.line((480, 310, 480, 470), fill=EARTH_DARK, width=6)
    return image


def scene_door() -> Image.Image:
    image, draw = new_board("Cửa hầm")
    ground(draw, 180)
    draw.rounded_rectangle((340, 210, 620, 540), 18, fill=WOOD, outline=EARTH_DARK, width=8)
    draw.rectangle((470, 350, 500, 390), fill=AMBER)
    draw.polygon([(300, 210), (480, 140), (660, 210)], fill=EARTH_DARK)
    return image


def levels(draw: ImageDraw.ImageDraw, highlight: int) -> None:
    ground(draw, 150)
    colors = {1: AMBER, 2: (80, 160, 120), 3: (90, 140, 190)}
    for index, y in enumerate((230, 350, 470), start=1):
        fill = colors[index] if index == highlight else EARTH_DARK
        draw.rounded_rectangle((180, y, 780, y + 70), 20, fill=fill, outline=SOIL, width=4)
        draw.text((210, y + 18), f"Tầng {index}", font=LABEL, fill=INK if index == highlight else CREAM)


def scene_level(level: int) -> Image.Image:
    image, draw = new_board(f"Tầng {level} trong địa đạo")
    levels(draw, level)
    return image


def scene_stairs() -> Image.Image:
    image, draw = new_board("Lối lên xuống giữa các tầng")
    ground(draw, 150)
    draw.line((220, 250, 740, 530), fill=SOIL, width=16)
    for step in range(8):
        x = 240 + step * 60
        y = 250 + step * 34
        draw.rectangle((x, y, x + 46, y + 16), fill=WOOD)
    return image


def scene_model() -> Image.Image:
    image, draw = new_board("Sa bàn địa đạo")
    draw.rounded_rectangle((140, 160, 820, 540), 24, fill=(70, 52, 36), outline=SOIL, width=6)
    draw.ellipse((220, 230, 420, 390), outline=AMBER, width=6)
    draw.arc((400, 250, 700, 470), 20, 200, fill=CREAM, width=6)
    draw.ellipse((560, 300, 640, 380), fill=LEAF)
    draw.text((180, 480), "Sơ đồ lối đi, không phải ảnh phim", font=LABEL, fill=CREAM)
    return image


def scene_section() -> Image.Image:
    image, draw = new_board("Mặt cắt lòng đất")
    levels(draw, 0)
    draw.line((470, 200, 470, 540), fill=SMOKE, width=6)
    return image


def scene_well_mouth() -> Image.Image:
    image, draw = new_board("Miệng giếng")
    ground(draw, 250)
    draw.ellipse((340, 280, 620, 470), fill=WATER, outline=SOIL, width=14)
    draw.ellipse((400, 320, 560, 420), fill=(20, 70, 110))
    return image


def scene_well_shaft() -> Image.Image:
    image, draw = new_board("Thân giếng")
    ground(draw, 140)
    draw.rounded_rectangle((390, 180, 570, 580), 20, fill=(24, 60, 90), outline=SOIL, width=8)
    draw.ellipse((400, 160, 560, 230), fill=WATER)
    for y in (260, 340, 420, 500):
        draw.arc((400, y, 560, y + 40), 20, 160, fill=SOIL, width=4)
    return image


def scene_dig() -> Image.Image:
    image, draw = new_board("Hướng đào")
    ground(draw, 220)
    draw.polygon([(160, 400), (700, 340), (700, 420), (160, 480)], fill=EARTH_DARK)
    draw.polygon([(700, 330), (820, 380), (700, 430)], fill=FIRE)
    draw.text((180, 540), "Đào men theo hướng mũi tên", font=LABEL, fill=CREAM)
    return image


def scene_bamboo_well() -> Image.Image:
    image, draw = new_board("Giếng và ống tre")
    ground(draw, 200)
    draw.ellipse((250, 280, 470, 460), fill=WATER, outline=SOIL, width=8)
    draw.line((470, 250, 760, 180), fill=LEAF, width=14)
    draw.ellipse((730, 150, 790, 210), fill=SMOKE)
    return image


def scene_quiet() -> Image.Image:
    image, draw = new_board("Chỗ gác — giữ im lặng")
    ground(draw, 180)
    draw.rounded_rectangle((200, 240, 760, 520), 30, fill=(32, 28, 26), outline=SOIL, width=5)
    draw.ellipse((430, 320, 530, 430), outline=AMBER, width=8)
    draw.line((480, 300, 480, 450), fill=AMBER, width=4)
    draw.text((250, 450), "Không đốt lửa, không gây tiếng", font=LABEL, fill=CREAM)
    return image


def scene_well_link() -> Image.Image:
    image, draw = new_board("Giếng nối với hầm")
    ground(draw, 160)
    draw.rounded_rectangle((180, 220, 340, 560), 16, fill=(24, 60, 90), outline=SOIL, width=6)
    draw.rounded_rectangle((300, 400, 800, 480), 16, fill=EARTH_DARK, outline=SOIL, width=5)
    draw.ellipse((190, 190, 330, 250), fill=WATER)
    return image


SCENES = {
    "cc-01.png": scene_stove,
    "cc-02.png": scene_trench,
    "cc-03.png": scene_smoke_room,
    "cc-04.png": scene_vents,
    "cc-05.png": scene_ditch,
    "cc-06.png": scene_kitchen,
    "cc-07.png": scene_leaves,
    "cc-08.png": scene_lid,
    "cc-09.png": scene_soil,
    "cc-10.png": scene_mouth,
    "cc-11.png": scene_lid_closed,
    "cc-12.png": scene_door,
    "cc-13.png": lambda: scene_level(1),
    "cc-14.png": lambda: scene_level(2),
    "cc-15.png": lambda: scene_level(3),
    "cc-16.png": scene_stairs,
    "cc-17.png": scene_model,
    "cc-18.png": scene_section,
    "cc-19.png": scene_well_mouth,
    "cc-20.png": scene_well_shaft,
    "cc-21.png": scene_dig,
    "cc-22.png": scene_bamboo_well,
    "cc-23.png": scene_quiet,
    "cc-24.png": scene_well_link,
}


def main() -> None:
    for name, build in SCENES.items():
        save(build(), name)
    print(f"wrote {len(SCENES)} images to {OUT}")


if __name__ == "__main__":
    main()
