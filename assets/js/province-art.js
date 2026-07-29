(() => {
  const TAU = Math.PI * 2;

  const hashString = (value = "") => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  const seededRandom = (seed) => {
    let state = seed || 1;
    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  };

  const shortCityName = (name = "") => name.replace(
    /(哈尼族彝族自治州|布依族苗族自治州|苗族侗族自治州|壮族苗族自治州|蒙古族藏族自治州|藏族羌族自治州|傣族景颇族自治州|自治州|特别行政区|地区|市|盟)$/,
    ""
  );

  const line = (context, x1, y1, x2, y2) => {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  };

  const drawCorner = (context, x, y, dx, dy, size) => {
    context.beginPath();
    context.moveTo(x + dx * size, y);
    context.lineTo(x, y);
    context.lineTo(x, y + dy * size);
    context.stroke();
  };

  const drawBackground = (context, width, height, random) => {
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#030713");
    background.addColorStop(0.52, "#071322");
    background.addColorStop(1, "#090619");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const bloom = context.createRadialGradient(
      width * 0.58, height * 0.44, 0,
      width * 0.58, height * 0.44, width * 0.72
    );
    bloom.addColorStop(0, "rgba(0,235,255,.115)");
    bloom.addColorStop(0.42, "rgba(112,43,255,.055)");
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = bloom;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalAlpha = 0.38;
    for (let index = 0; index < 190; index += 1) {
      const radius = random() > 0.92 ? 1.5 : 0.65;
      context.fillStyle = random() > 0.76 ? "#c4ff48" : "#65e8ff";
      context.fillRect(random() * width, random() * height, radius, radius);
    }
    context.restore();

    context.save();
    context.strokeStyle = "rgba(87,231,255,.075)";
    context.lineWidth = 1;
    const horizon = height * 0.7;
    for (let index = 0; index <= 11; index += 1) {
      const x = (index / 11) * width;
      line(context, width / 2, horizon, x, height);
    }
    for (let index = 0; index < 8; index += 1) {
      const progress = index / 8;
      const y = horizon + Math.pow(progress, 1.7) * (height - horizon);
      line(context, 0, y, width, y);
    }
    context.restore();

    context.save();
    context.strokeStyle = "rgba(115,235,255,.34)";
    context.lineWidth = 1;
    const inset = Math.max(24, width * 0.045);
    const size = Math.max(18, width * 0.035);
    drawCorner(context, inset, inset, 1, 1, size);
    drawCorner(context, width - inset, inset, -1, 1, size);
    drawCorner(context, inset, height - inset, 1, -1, size);
    drawCorner(context, width - inset, height - inset, -1, -1, size);
    context.restore();
  };

  const createLayout = (width, height, bounds) => {
    const plot = {
      x: width * 0.08,
      y: height * 0.14,
      width: width * 0.84,
      height: height * 0.69
    };
    const scale = Math.min(plot.width / bounds.width, plot.height / bounds.height);
    return {
      scale,
      x: plot.x + (plot.width - bounds.width * scale) / 2 - bounds.x * scale,
      y: plot.y + (plot.height - bounds.height * scale) / 2 - bounds.y * scale,
      plot
    };
  };

  const drawProvince = (context, path, layout, width, height, random) => {
    const { scale, x, y, plot } = layout;

    context.save();
    context.setTransform(scale, 0, 0, scale, x, y);
    context.fillStyle = "rgba(8,39,61,.91)";
    context.fill(path, "evenodd");
    context.restore();

    context.save();
    context.setTransform(scale, 0, 0, scale, x, y);
    context.clip(path, "evenodd");
    context.setTransform(1, 0, 0, 1, 0, 0);
    for (let py = plot.y; py < plot.y + plot.height; py += Math.max(8, height / 92)) {
      context.strokeStyle = `rgba(80,236,255,${0.055 + random() * 0.055})`;
      context.lineWidth = random() > 0.86 ? 1.5 : 0.7;
      line(context, plot.x - 24, py + random() * 3, plot.x + plot.width + 24, py);
    }
    for (let index = 0; index < 14; index += 1) {
      const px = plot.x + random() * plot.width;
      context.strokeStyle = random() > 0.72
        ? "rgba(191,255,69,.08)"
        : "rgba(149,72,255,.1)";
      context.lineWidth = 1;
      line(context, px, plot.y - 20, px + (random() - 0.5) * width * 0.2, plot.y + plot.height + 20);
    }
    context.restore();

    [
      ["rgba(152,64,255,.5)", 4.8, -2.1, 1.8, 18],
      ["rgba(190,255,62,.42)", 2.4, 1.8, -1.2, 10],
      ["rgba(66,232,255,.96)", 1.45, 0, 0, 14],
      ["rgba(218,251,255,.72)", 0.55, 0.8, 0.4, 3]
    ].forEach(([color, lineWidth, offsetX, offsetY, blur]) => {
      context.save();
      context.setTransform(scale, 0, 0, scale, x + offsetX, y + offsetY);
      context.strokeStyle = color;
      context.lineWidth = lineWidth / scale;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.shadowColor = color;
      context.shadowBlur = blur;
      context.stroke(path);
      context.restore();
    });
  };

  const drawCityNetwork = (context, cities, layout, width, detailed) => {
    if (!cities.length) return;
    const points = cities.map((city) => ({
      ...city,
      px: city.x * layout.scale + layout.x,
      py: city.y * layout.scale + layout.y
    }));
    const edges = new Set();
    points.forEach((point, index) => {
      points
        .map((candidate, candidateIndex) => ({
          candidateIndex,
          distance: Math.hypot(candidate.px - point.px, candidate.py - point.py)
        }))
        .filter(({ candidateIndex }) => candidateIndex !== index)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, detailed ? 2 : 1)
        .forEach(({ candidateIndex }) => {
          edges.add([index, candidateIndex].sort((a, b) => a - b).join("-"));
        });
    });

    context.save();
    context.globalCompositeOperation = "screen";
    context.strokeStyle = "rgba(99,220,255,.22)";
    context.lineWidth = Math.max(0.7, width / 950);
    edges.forEach((edge) => {
      const [from, to] = edge.split("-").map(Number);
      line(context, points[from].px, points[from].py, points[to].px, points[to].py);
    });
    context.restore();

    const pointRadius = Math.max(1.8, width / 260);
    points.forEach((point, index) => {
      context.save();
      context.translate(point.px, point.py);
      context.strokeStyle = index === 0 ? "#c8ff43" : "rgba(79,232,255,.88)";
      context.fillStyle = index === 0 ? "#d8ff73" : "#89efff";
      context.shadowColor = context.fillStyle;
      context.shadowBlur = pointRadius * 4.5;
      context.lineWidth = Math.max(0.8, width / 800);
      context.beginPath();
      context.arc(0, 0, pointRadius * (index === 0 ? 1.15 : 0.78), 0, TAU);
      context.fill();
      if (index < (detailed ? 10 : 5)) {
        context.beginPath();
        context.arc(0, 0, pointRadius * 2.25, 0, TAU);
        context.stroke();
      }
      context.restore();
    });

    const labelLimit = detailed ? points.length : Math.min(points.length, 7);
    const labelFont = Math.max(9, width / (detailed ? 82 : 52));
    context.font = `500 ${labelFont}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
    context.textBaseline = "middle";
    for (let index = 0; index < labelLimit; index += 1) {
      const point = points[index];
      const placeLeft = point.px > width * 0.58;
      const x = point.px + (placeLeft ? -1 : 1) * pointRadius * 2.5;
      const y = point.py + ((index % 3) - 1) * labelFont * 0.72;
      context.textAlign = placeLeft ? "right" : "left";
      context.lineWidth = Math.max(2.5, labelFont * 0.34);
      context.strokeStyle = "rgba(3,8,18,.92)";
      context.strokeText(shortCityName(point.name), x, y);
      context.fillStyle = index === 0 ? "#d7ff69" : "rgba(218,249,255,.94)";
      context.fillText(shortCityName(point.name), x, y);
    }
  };

  const drawHud = (context, width, height, name, code, cityCount, detailed, random) => {
    const margin = width * 0.075;
    const titleSize = Math.max(28, width / (detailed ? 21 : 16));
    const monoSize = Math.max(9, width / 58);

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = "#e9fbff";
    context.font = `600 ${titleSize}px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
    context.fillText(name, margin, height * 0.087);

    context.fillStyle = "rgba(103,231,255,.88)";
    context.font = `500 ${monoSize}px ui-monospace, "SFMono-Regular", Consolas, monospace`;
    context.fillText(`GENERATIVE TERRAIN / CN-${code || "000000"}`, margin, height * 0.116);

    context.textAlign = "right";
    context.fillStyle = "#c8ff43";
    context.fillText(`${String(cityCount).padStart(2, "0")} CITY NODES`, width - margin, height * 0.116);

    const baseline = height * 0.895;
    context.textAlign = "left";
    context.fillStyle = "rgba(218,247,255,.68)";
    context.fillText("REAL BORDER / PROJECTED GEO DATA", margin, baseline);
    context.fillStyle = "rgba(128,236,255,.38)";
    context.fillText(
      `GRID ${Math.floor(random() * 80 + 10)}.${Math.floor(random() * 90 + 10)} // LIVE`,
      margin,
      baseline + monoSize * 1.9
    );
    context.textAlign = "right";
    context.fillStyle = "rgba(200,255,67,.74)";
    context.fillText("FUTURE HAND-DRAWN ATLAS", width - margin, baseline + monoSize * 1.9);
  };

  const render = (canvas, {
    name = "",
    code = "",
    pathData = "",
    bounds,
    cities = [],
    detailed = false
  } = {}) => {
    if (!canvas || !pathData || !bounds || typeof Path2D === "undefined") return false;
    const width = detailed ? 1200 : 480;
    const height = detailed ? 1420 : 568;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return false;

    const random = seededRandom(hashString(`${code}:${name}`));
    const path = new Path2D(pathData);
    const layout = createLayout(width, height, bounds);
    context.clearRect(0, 0, width, height);
    drawBackground(context, width, height, random);
    drawProvince(context, path, layout, width, height, random);
    drawCityNetwork(context, cities, layout, width, detailed);
    drawHud(context, width, height, name, code, cities.length, detailed, random);
    return true;
  };

  window.ProvinceArtwork = { render };
})();
