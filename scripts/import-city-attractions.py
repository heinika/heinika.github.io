import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data-source-temp" / "citydata"
CITY_DATA_PATH = ROOT / "assets" / "city-points.json"
OUTPUT_PATH = ROOT / "assets" / "city-attractions.json"

CURATED = {
    "阿拉善盟": ["额济纳胡杨林", "巴丹吉林沙漠", "腾格里沙漠"],
    "邯郸市": ["广府古城", "娲皇宫"],
    "乌海市": ["乌海湖", "金沙湾生态旅游区"],
    "锦州市": ["辽沈战役纪念馆", "锦州笔架山", "北普陀山"],
    "长春市": ["伪满皇宫博物院", "净月潭", "长影世纪城"],
    "泰州市": ["凤城河风景区", "溱湖国家湿地公园", "泰州老街"],
    "盐城市": ["中华麋鹿园", "盐城丹顶鹤湿地生态旅游区", "荷兰花海"],
    "镇江市": ["金山寺", "焦山", "北固山"],
    "池州市": ["九华山", "池州杏花村"],
    "南平市": ["武夷山", "下梅古民居"],
    "荆门市": ["明显陵", "漳河风景区"],
    "文昌市": ["铜鼓岭", "东郊椰林", "文昌航天科普中心"],
    "楚雄彝族自治州": ["元谋人遗址", "彝人古镇", "武定狮子山"],
    "昌都市": ["强巴林寺", "然乌湖", "来古冰川"],
    "平凉市": ["崆峒山", "云崖寺"],
    "临夏回族自治州": ["炳灵寺石窟", "八坊十三巷", "松鸣岩"],
    "甘南藏族自治州": ["拉卜楞寺", "扎尕那", "郎木寺"],
    "西宁市": ["塔尔寺", "青藏高原野生动物园", "东关清真大寺"],
    "海东市": ["互助土族故土园", "瞿昙寺", "孟达天池"],
    "海北藏族自治州": ["青海湖", "祁连山草原", "原子城纪念馆"],
    "黄南藏族自治州": ["隆务寺", "坎布拉国家森林公园", "吾屯下寺"],
    "海南藏族自治州": ["青海湖二郎剑景区", "贵德国家地质公园", "龙羊峡"],
    "果洛藏族自治州": ["阿尼玛卿雪山", "拉加寺"],
    "玉树藏族自治州": ["文成公主庙", "结古寺", "可可西里"],
    "海西蒙古族藏族自治州": ["茶卡盐湖", "大柴旦翡翠湖", "察尔汗盐湖"],
    "台北市": ["台北故宫博物院", "台北101", "中正纪念堂"],
    "新北市": ["野柳地质公园", "九份老街", "淡水老街"],
    "桃园市": ["大溪老街", "石门水库", "小人国主题乐园"],
    "台中市": ["台中国家歌剧院", "高美湿地", "彩虹眷村"],
    "台南市": ["赤崁楼", "安平古堡", "奇美博物馆"],
    "高雄市": ["驳二艺术特区", "佛光山", "西子湾"],
    "基隆市": ["和平岛地质公园", "正滨渔港", "基隆庙口"],
    "新竹市": ["新竹都城隍庙", "新竹市立动物园", "十八尖山"],
    "嘉义市": ["嘉义市立美术馆", "嘉义公园", "檜意森活村"],
    "香港特别行政区": ["太平山顶", "维多利亚港", "天坛大佛"],
    "澳门特别行政区": ["大三巴牌坊", "议事亭前地", "澳门旅游塔"],
    "昆玉市": ["沙海老兵红色旅游区", "昆玉河景区", "胡木旦湿地公园"],
    "胡杨河市": ["胡杨水韵景区", "胡杨河市文化馆", "戈壁母亲红色旅游基地"],
}


def compact(value):
    return re.sub(r"\s+", " ", value or "").strip()


def chinese_title(value):
    value = compact(value)
    return re.sub(r"(?<=[\u3400-\u9fff])([A-Za-z].*)$", "", value).strip()


def numeric_rating(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def curated_places(city_name, names):
    return [
        {
            "title": name,
            "extract": f"{name}是{city_name}具有代表性的城市景点，可打开地图查看位置、开放信息与出行路线。",
            "fullurl": f"https://map.baidu.com/search/{quote(name)}/",
            "address": city_name,
            "rating": None,
            "thumbnail": None,
            "curated": True,
        }
        for name in names
    ]


city_data = json.loads(CITY_DATA_PATH.read_text(encoding="utf-8"))
cities = [city for province in city_data["provinces"].values() for city in province]
source_files = {path.stem: path for path in SOURCE_DIR.glob("*.csv")}


def source_for_city(city_name):
    candidates = [stem for stem in source_files if city_name == stem or city_name.startswith(stem)]
    if not candidates:
        return None
    return source_files[max(candidates, key=len)]


def import_city(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    ranked = []
    for index, row in enumerate(rows):
        title = chinese_title(row.get("名字"))
        if not title:
            continue
        image = compact(row.get("图片链接"))
        introduction = compact(row.get("介绍"))
        address = compact(row.get("地址")).replace("地址:", "", 1).strip()
        rating = numeric_rating(row.get("评分"))
        score = max(0, 60 - index) + rating * 4 + bool(image) * 7 + bool(introduction) * 5
        ranked.append((score, {
            "title": title,
            "extract": (introduction or f"打开景点资料，查看{title}的地址、开放信息与游览建议。")[:180],
            "fullurl": compact(row.get("链接")),
            "address": address[:160],
            "rating": rating or None,
            "thumbnail": {"source": image} if image.startswith("http") else None,
            "curated": False,
        }))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [place for _, place in ranked[:6]]


output = {
    "generated": datetime.now(timezone.utc).isoformat(),
    "source": {
        "title": "China City Attraction Details",
        "url": "https://www.kaggle.com/datasets/audreyhengruizhang/china-city-attraction-details",
        "license": "Apache 2.0",
        "original": "https://travel.qunar.com/",
    },
    "cityCount": len(cities),
    "cities": {},
}

dataset_cities = 0
curated_cities = 0
guide_cities = 0
for city in cities:
    city_name = city["name"]
    source_path = source_for_city(city_name)
    places = import_city(source_path) if source_path else []
    if places:
        dataset_cities += 1
    elif city_name in CURATED:
        places = curated_places(city_name, CURATED[city_name])
        curated_cities += 1
    else:
        short_name = re.sub(r"(特别行政区|自治州|地区|林区|县|市|盟)$", "", city_name)
        places = [{
            "title": f"{city_name}城市景点导览",
            "extract": f"本地已收录{city_name}的城市坐标与景点检索入口，可继续查看公园、博物馆、历史遗址和自然景观。",
            "fullurl": f"https://map.baidu.com/search/{quote(short_name + ' 景点')}/",
            "address": city_name,
            "rating": None,
            "thumbnail": None,
            "localGuide": True,
        }]
        guide_cities += 1
    output["cities"][city_name] = places

OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
attraction_count = sum(len(places) for places in output["cities"].values())
print(json.dumps({
    "cities": len(output["cities"]),
    "datasetCities": dataset_cities,
    "curatedCities": curated_cities,
    "guideCities": guide_cities,
    "attractions": attraction_count,
}, ensure_ascii=False, indent=2))
