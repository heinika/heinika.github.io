(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector(".themeToggle");
  const themeLabel = themeButton?.querySelector(".themeText");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function applyTheme(theme) {
    const paper = theme === "paper";
    root.dataset.theme = paper ? "paper" : "night";
    themeButton?.setAttribute("aria-pressed", String(paper));
    themeButton?.setAttribute("aria-label", paper ? "切换到深空模式" : "切换到明亮模式");
    if (themeLabel) themeLabel.textContent = paper ? "深空" : "明亮";
    themeMeta?.setAttribute("content", paper ? "#e9edf2" : "#050810");
  }

  applyTheme(root.dataset.theme === "paper" ? "paper" : "night");

  themeButton?.addEventListener("click", () => {
    const next = root.dataset.theme === "night" ? "paper" : "night";
    try {
      localStorage.setItem("portfolio-theme", next);
    } catch {}
    applyTheme(next);
  });

  const topbar = document.querySelector(".topbar");
  const navToggle = document.querySelector(".navToggle");
  const navLinks = Array.from(document.querySelectorAll(".nav a"));

  function setMenu(open) {
    if (!topbar || !navToggle) return;
    topbar.dataset.menuOpen = String(open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
  }

  navToggle?.addEventListener("click", () => {
    setMenu(topbar?.dataset.menuOpen !== "true");
  });
  navLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  const progress = document.querySelector(".readingProgress");
  let scrollFrame = 0;
  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, scrollY / scrollable)) : 0;
    progress?.style.setProperty("--progress", ratio);
    scrollFrame = 0;
  }
  window.addEventListener("scroll", () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress);
  }, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  const observedSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${visible.target.id}`;
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-22% 0px -62% 0px", threshold: [0, 0.25, 0.6] });
    observedSections.forEach((section) => sectionObserver.observe(section));
  }

  const filterButtons = document.querySelectorAll(".filterButton");
  const mapCards = document.querySelectorAll(".mapCard");
  const dialog = document.querySelector("#map-dialog");
  const dialogImage = dialog?.querySelector(".dialogImage");
  const dialogCanvas = dialog?.querySelector(".dialogCanvas");
  const dialogTitle = dialog?.querySelector("#map-dialog-title");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      const updateFilter = () => {
        filterButtons.forEach((item) => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        mapCards.forEach((card) => {
          card.hidden = filter !== "all" && card.dataset.region !== filter;
        });
      };
      if (document.startViewTransition && !reducedMotion) {
        document.startViewTransition(updateFilter);
      } else {
        updateFilter();
      }
    });
  });

  mapCards.forEach((card) => {
    const image = card.querySelector("img");
    if (image && !image.hasAttribute("decoding")) image.decoding = "async";
  });

  mapCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (!dialog || !dialogImage || !dialogTitle) return;
      const artwork = card.provinceArtwork;
      const generated = artwork && dialogCanvas && window.ProvinceArtwork?.render(
        dialogCanvas,
        { ...artwork, detailed: true }
      );
      if (dialogCanvas) dialogCanvas.hidden = !generated;
      dialogImage.hidden = Boolean(generated);
      if (!generated) {
        dialogImage.src = card.dataset.src || "";
        dialogImage.alt = `${card.dataset.title || ""}复古立体手绘地理图`;
      }
      dialogTitle.textContent = card.dataset.title || "";
      dialog.showModal();
    });
  });

  dialog?.querySelector(".dialogClose")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  const chinaMapMount = document.querySelector(".chinaMapMount");
  const chinaMapLabel = document.querySelector(".chinaMapLabel");

  if (chinaMapMount) {
    let mapViewFrame = 0;
    let resetTimer = 0;
    let previewOpen = false;

    const parseViewBox = (value) => value.trim().split(/\s+/).map(Number);

    const animateViewBox = (svg, target, duration = 460) => {
      cancelAnimationFrame(mapViewFrame);
      if (reducedMotion) {
        svg.setAttribute("viewBox", target.join(" "));
        return;
      }

      const current = svg.viewBox.baseVal;
      const start = [current.x, current.y, current.width, current.height];
      const startedAt = performance.now();

      const draw = (time) => {
        const progress = Math.min(1, (time - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const frame = start.map((value, index) => value + (target[index] - value) * eased);
        svg.setAttribute("viewBox", frame.join(" "));
        if (progress < 1) mapViewFrame = requestAnimationFrame(draw);
      };

      mapViewFrame = requestAnimationFrame(draw);
    };

    const mapRequest = fetch(chinaMapMount.dataset.mapSrc).then((response) => {
      if (!response.ok) throw new Error(`Map request failed: ${response.status}`);
      return response.text();
    });
    const cityRequest = fetch(chinaMapMount.dataset.citiesSrc)
      .then((response) => response.ok ? response.json() : { provinces: {} })
      .catch(() => ({ provinces: {} }));

    Promise.all([mapRequest, cityRequest])
      .then(([markup, cityData]) => {
        chinaMapMount.innerHTML = markup;
        const svg = chinaMapMount.querySelector(".chinaMapSvg");
        if (!svg) throw new Error("Map SVG is missing");

        const defaultViewBox = parseViewBox(svg.dataset.defaultViewbox || svg.getAttribute("viewBox"));
        const provincePaths = Array.from(svg.querySelectorAll(".chinaProvince"));
        const provinceByName = new Map(provincePaths.map((path) => [path.dataset.name, path]));

        const prepareCardArtwork = (card) => {
          if (card.provinceArtwork) return card.provinceArtwork;
          const path = provinceByName.get(card.dataset.title);
          if (!path) return null;
          const artwork = {
            name: path.dataset.name || "",
            code: path.dataset.code || "",
            pathData: path.getAttribute("d") || "",
            bounds: path.getBBox(),
            cities: cityData.provinces?.[path.dataset.code] || []
          };
          card.provinceArtwork = artwork;
          card.dataset.code = artwork.code;
          return artwork;
        };

        const renderCardArtwork = (card) => {
          if (card.dataset.artworkReady === "true") return;
          const frame = card.querySelector(".mapFrame");
          const artwork = prepareCardArtwork(card);
          if (!artwork || !frame || !window.ProvinceArtwork) return;
          let canvas = frame.querySelector(".provinceCanvas");
          if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.className = "provinceCanvas";
            canvas.setAttribute("aria-hidden", "true");
            frame.prepend(canvas);
          }
          try {
            if (!window.ProvinceArtwork.render(canvas, artwork)) return;
            card.provinceArtwork = artwork;
            card.dataset.code = artwork.code;
            card.dataset.artworkReady = "true";
            frame.classList.add("hasGenerated");
          } catch (error) {
            console.warn(`Artwork fallback used for ${artwork.name}`, error);
          }
        };

        mapCards.forEach(prepareCardArtwork);
        if ("IntersectionObserver" in window) {
          const artworkObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              renderCardArtwork(entry.target);
              artworkObserver.unobserve(entry.target);
            });
          }, { rootMargin: "420px 0px" });
          mapCards.forEach((card) => artworkObserver.observe(card));
        } else {
          mapCards.forEach(renderCardArtwork);
        }

        const zoomSvg = svg.cloneNode(true);
        const zoomPaths = Array.from(zoomSvg.querySelectorAll(".chinaProvince"));
        zoomSvg.classList.add("chinaMapZoomLayer");
        zoomSvg.setAttribute("aria-label", "省份城市交互地图");
        zoomSvg.setAttribute("role", "group");
        zoomPaths.forEach((path) => {
          path.removeAttribute("tabindex");
          path.removeAttribute("role");
          path.removeAttribute("aria-label");
        });
        const cityLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        cityLayer.classList.add("chinaCityLayer");
        zoomSvg.append(cityLayer);
        const zoomViewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
        zoomViewport.classList.add("chinaMapZoomViewport");
        Array.from(zoomSvg.children).forEach((child) => zoomViewport.append(child));
        zoomSvg.append(zoomViewport);

        const previewPanel = document.createElement("dialog");
        const previewHeader = document.createElement("div");
        const previewMeta = document.createElement("div");
        const previewKicker = document.createElement("span");
        const previewTitle = document.createElement("strong");
        const previewControls = document.createElement("div");
        const zoomOutButton = document.createElement("button");
        const zoomResetButton = document.createElement("button");
        const zoomInButton = document.createElement("button");
        const atlasButton = document.createElement("button");
        const closeButton = document.createElement("button");
        const previewHelp = document.createElement("p");
        const attractionPanel = document.createElement("aside");
        const attractionHeader = document.createElement("div");
        const attractionHeading = document.createElement("div");
        const attractionKicker = document.createElement("span");
        const attractionTitle = document.createElement("strong");
        const attractionClose = document.createElement("button");
        const attractionStatus = document.createElement("p");
        const attractionList = document.createElement("div");
        const attractionSource = document.createElement("p");
        previewPanel.className = "chinaMapPreview";
        previewPanel.setAttribute("aria-labelledby", "city-map-title");
        previewHeader.className = "chinaMapPreviewHeader";
        previewMeta.className = "chinaMapPreviewMeta";
        previewControls.className = "chinaMapPreviewControls";
        previewTitle.id = "city-map-title";
        previewKicker.textContent = "CITY ATLAS / PROVINCE DETAIL";
        previewHelp.className = "chinaMapPreviewHelp";
        previewHelp.textContent = "点击城市查看附近景点 · 滚轮 / 双指缩放 · 拖动查看";
        zoomOutButton.type = "button";
        zoomOutButton.textContent = "−";
        zoomOutButton.setAttribute("aria-label", "缩小地图");
        zoomResetButton.type = "button";
        zoomResetButton.textContent = "1:1";
        zoomResetButton.setAttribute("aria-label", "恢复初始比例");
        zoomInButton.type = "button";
        zoomInButton.textContent = "+";
        zoomInButton.setAttribute("aria-label", "放大地图");
        atlasButton.type = "button";
        atlasButton.className = "cityAtlasAction";
        atlasButton.textContent = "查看手绘图鉴 ↗";
        closeButton.type = "button";
        closeButton.textContent = "×";
        closeButton.setAttribute("aria-label", "关闭城市地图");
        attractionPanel.className = "cityAttractionPanel";
        attractionPanel.setAttribute("aria-hidden", "true");
        attractionPanel.inert = true;
        attractionHeader.className = "cityAttractionHeader";
        attractionHeading.className = "cityAttractionHeading";
        attractionKicker.textContent = "CITY FIELD NOTES / NEARBY";
        attractionTitle.textContent = "城市景点";
        attractionClose.type = "button";
        attractionClose.textContent = "×";
        attractionClose.setAttribute("aria-label", "关闭城市景点");
        attractionStatus.className = "cityAttractionStatus";
        attractionStatus.setAttribute("aria-live", "polite");
        attractionList.className = "cityAttractionList";
        attractionSource.className = "cityAttractionSource";
        attractionSource.textContent = "实时资料与图像 · 中文维基百科 / Wikimedia";
        attractionHeading.append(attractionKicker, attractionTitle);
        attractionHeader.append(attractionHeading, attractionClose);
        attractionPanel.append(attractionHeader, attractionStatus, attractionList, attractionSource);
        previewMeta.append(previewKicker, previewTitle);
        previewControls.append(zoomOutButton, zoomResetButton, zoomInButton, atlasButton, closeButton);
        previewHeader.append(previewMeta, previewControls);
        previewPanel.append(previewHeader, zoomSvg, previewHelp, attractionPanel);
        document.body.append(previewPanel);

        let activeProvince = null;
        let cityBaseFont = 1;
        let cityBaseRadius = 1;
        let attractionRequest = 0;
        const attractionCache = new Map();

        const zoomPathFor = (path) => zoomPaths.find(
          (candidate) => candidate.dataset.code === path.dataset.code
        );

        const shortCityName = (name = "") => name.replace(
          /(哈尼族彝族自治州|布依族苗族自治州|苗族侗族自治州|壮族苗族自治州|蒙古族藏族自治州|藏族羌族自治州|傣族景颇族自治州|自治州|特别行政区|地区|市|盟)$/,
          ""
        );

        const distanceBetween = (latitudeA, longitudeA, latitudeB, longitudeB) => {
          const radians = (degrees) => degrees * Math.PI / 180;
          const latitudeDelta = radians(latitudeB - latitudeA);
          const longitudeDelta = radians(longitudeB - longitudeA);
          const a = Math.sin(latitudeDelta / 2) ** 2
            + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB))
            * Math.sin(longitudeDelta / 2) ** 2;
          return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const cityCoordinates = (city) => {
          const projection = cityData.projection || {};
          if (!projection.xScale || !projection.yScale) return null;
          return {
            latitude: (city.y - projection.yOffset) / projection.yScale,
            longitude: (city.x - projection.xOffset) / projection.xScale
          };
        };

        const sketchImage = (image, canvas) => {
          const width = 360;
          const height = 220;
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) return;
          const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
          const drawWidth = image.naturalWidth * scale;
          const drawHeight = image.naturalHeight * scale;
          context.drawImage(
            image,
            (width - drawWidth) / 2,
            (height - drawHeight) / 2,
            drawWidth,
            drawHeight
          );

          let pixels;
          try {
            pixels = context.getImageData(0, 0, width, height);
          } catch {
            return;
          }
          const source = new Uint8ClampedArray(pixels.data);
          const grayscale = new Float32Array(width * height);
          for (let index = 0; index < grayscale.length; index += 1) {
            const offset = index * 4;
            grayscale[index] = source[offset] * .299 + source[offset + 1] * .587 + source[offset + 2] * .114;
          }
          for (let y = 1; y < height - 1; y += 1) {
            for (let x = 1; x < width - 1; x += 1) {
              const index = y * width + x;
              const offset = index * 4;
              const edge = Math.abs(grayscale[index + 1] - grayscale[index - 1])
                + Math.abs(grayscale[index + width] - grayscale[index - width]);
              const ink = Math.min(1, edge / 38);
              const shade = (255 - grayscale[index]) / 255;
              const paperRed = 238 - shade * 35;
              const paperGreen = 247 - shade * 28;
              const paperBlue = 248 - shade * 20;
              pixels.data[offset] = paperRed * (1 - ink) + 18 * ink;
              pixels.data[offset + 1] = paperGreen * (1 - ink) + 112 * ink;
              pixels.data[offset + 2] = paperBlue * (1 - ink) + 137 * ink;
              pixels.data[offset + 3] = 255;
            }
          }
          context.putImageData(pixels, 0, 0);
          canvas.classList.add("isReady");
        };

        const fetchAttractions = async (city) => {
          if (attractionCache.has(city.name)) return attractionCache.get(city.name);
          const coordinates = cityCoordinates(city);
          const cityName = shortCityName(city.name);
          const parameters = new URLSearchParams({
            action: "query",
            format: "json",
            origin: "*",
            generator: "search",
            gsrsearch: `${cityName} (公园 OR 博物馆 OR 景区 OR 风景区 OR 古城 OR 遗址 OR 寺 OR 山 OR 湖 OR 塔 OR 宫 OR 陵)`,
            gsrnamespace: "0",
            gsrlimit: "28",
            prop: "coordinates|pageimages|extracts|info",
            pithumbsize: "720",
            piprop: "thumbnail",
            exintro: "1",
            explaintext: "1",
            inprop: "url"
          });
          let response = await fetch(`/api/attractions?city=${encodeURIComponent(cityName)}`);
          if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
            response = await fetch(`https://zh.wikipedia.org/w/api.php?${parameters}`);
          }
          if (!response.ok) throw new Error(`Attraction request failed: ${response.status}`);
          const payload = await response.json();
          const scenicPattern = /(公园|博物馆|景区|风景区|古城|遗址|寺|庙|山|湖|塔|宫|陵|峡谷|洞|岛|湿地|长城|纪念馆|城墙|园林|故居|古镇|草原)/;
          const excludedPattern = /(地铁|铁路|道路|学校|大学|政府|医院|公司|行政区|机场|车站|高速公路|旅游景点$)/;
          const pages = Object.values(payload.query?.pages || {})
            .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
            .filter((page) => {
              if (!page.thumbnail?.source || excludedPattern.test(page.title)) return false;
              const text = `${page.title} ${page.extract || ""}`;
              if (!scenicPattern.test(text)) return false;
              const point = page.coordinates?.[0];
              if (coordinates && point) {
                return distanceBetween(
                  coordinates.latitude,
                  coordinates.longitude,
                  point.lat,
                  point.lon
                ) < 160000;
              }
              return text.includes(cityName);
            })
            .slice(0, 6);
          attractionCache.set(city.name, pages);
          return pages;
        };

        const closeAttractions = () => {
          attractionRequest += 1;
          attractionPanel.classList.remove("isVisible");
          attractionPanel.setAttribute("aria-hidden", "true");
          attractionPanel.inert = true;
          previewPanel.classList.remove("hasAttractions");
          cityLayer.querySelectorAll(".chinaCityPoint.isActive").forEach(
            (group) => group.classList.remove("isActive")
          );
        };

        const renderAttractions = (city, places) => {
          attractionList.replaceChildren();
          if (!places.length) {
            const empty = document.createElement("a");
            empty.className = "cityAttractionEmpty";
            empty.href = `https://map.baidu.com/search/${encodeURIComponent(`${shortCityName(city.name)} 景点`)}/`;
            empty.target = "_blank";
            empty.rel = "noopener";
            empty.textContent = "暂未找到带图资料，前往地图继续查找附近景点 ↗";
            attractionList.append(empty);
            return;
          }
          places.forEach((place, index) => {
            const card = document.createElement("a");
            const media = document.createElement("span");
            const image = document.createElement("img");
            const sketch = document.createElement("canvas");
            const number = document.createElement("span");
            const title = document.createElement("strong");
            const description = document.createElement("span");
            card.className = "cityAttractionCard";
            card.href = place.fullurl || `https://zh.wikipedia.org/wiki/${encodeURIComponent(place.title)}`;
            card.target = "_blank";
            card.rel = "noopener";
            media.className = "cityAttractionMedia";
            image.crossOrigin = "anonymous";
            image.loading = "lazy";
            image.alt = `${place.title}景点图`;
            const originalImage = place.thumbnail.source;
            const proxyImage = `/api/attraction-image?src=${encodeURIComponent(originalImage)}`;
            image.src = proxyImage;
            image.addEventListener("error", () => {
              if (image.src === originalImage) return;
              image.src = originalImage;
            }, { once: true });
            sketch.setAttribute("aria-hidden", "true");
            image.addEventListener("load", () => sketchImage(image, sketch), { once: true });
            number.textContent = String(index + 1).padStart(2, "0");
            title.textContent = place.title;
            description.textContent = (place.extract || "打开条目查看景点资料。").replace(/\s+/g, " ").slice(0, 72);
            media.append(image, sketch, number);
            card.append(media, title, description);
            attractionList.append(card);
          });
        };

        const openAttractions = async (city, group) => {
          const request = ++attractionRequest;
          cityLayer.querySelectorAll(".chinaCityPoint.isActive").forEach(
            (candidate) => candidate.classList.remove("isActive")
          );
          group.classList.add("isActive");
          attractionTitle.textContent = `${city.name} · 景点`;
          attractionStatus.textContent = "正在检索附近景点与图像…";
          attractionList.replaceChildren();
          attractionPanel.classList.add("isVisible");
          attractionPanel.setAttribute("aria-hidden", "false");
          attractionPanel.inert = false;
          previewPanel.classList.add("hasAttractions");
          try {
            const places = await fetchAttractions(city);
            if (request !== attractionRequest) return;
            attractionStatus.textContent = places.length
              ? `找到 ${places.length} 处带图景点 · 点击卡片查看资料`
              : "附近暂时没有可用的带图条目";
            renderAttractions(city, places);
          } catch {
            if (request !== attractionRequest) return;
            attractionStatus.textContent = "景点资料暂时无法载入";
            renderAttractions(city, []);
          }
        };

        const renderCities = (path, side) => {
          cityLayer.replaceChildren();
          const cities = cityData.provinces?.[path.dataset.code] || [];
          const bounds = path.getBBox();
          const centerX = bounds.x + bounds.width / 2;
          const fontSize = side / 48;
          const labelGap = side / 90;
          const pointRadius = side / 190;
          cityBaseFont = fontSize;
          cityBaseRadius = Math.max(.16, pointRadius);
          cityLayer.style.setProperty("--city-font", `${cityBaseFont}px`);

          cities.forEach((city, index) => {
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            const placeLeft = city.x > centerX;
            const verticalOffset = ((index % 3) - 1) * fontSize * .42;
            const horizontalOffset = placeLeft ? -labelGap : labelGap;

            group.classList.add("chinaCityPoint");
            group.setAttribute("tabindex", "0");
            group.setAttribute("role", "button");
            group.setAttribute("aria-label", `查看${city.name}景点`);
            group.cityData = city;
            hitArea.classList.add("chinaCityHit");
            hitArea.setAttribute("cx", city.x);
            hitArea.setAttribute("cy", city.y);
            hitArea.setAttribute("r", cityBaseRadius * 5);
            hitArea.dataset.baseRadius = cityBaseRadius * 5;
            point.classList.add("chinaCityDot");
            point.setAttribute("cx", city.x);
            point.setAttribute("cy", city.y);
            point.setAttribute("r", cityBaseRadius);
            point.dataset.baseRadius = cityBaseRadius;
            label.setAttribute("x", city.x + horizontalOffset);
            label.setAttribute("y", city.y + verticalOffset);
            label.setAttribute("text-anchor", placeLeft ? "end" : "start");
            label.setAttribute("dominant-baseline", "middle");
            label.dataset.cityX = city.x;
            label.dataset.cityY = city.y;
            label.dataset.offsetX = horizontalOffset;
            label.dataset.offsetY = verticalOffset;
            label.textContent = shortCityName(city.name);
            group.append(hitArea, point, label);
            cityLayer.append(group);
          });

          return cities.length;
        };

        const d3 = window.d3;
        const zoomSelection = d3?.select(zoomSvg);
        const updateSemanticScale = (scale = 1) => {
          cityLayer.style.setProperty("--city-font", `${cityBaseFont / scale}px`);
          cityLayer.querySelectorAll("circle").forEach((point) => {
            point.setAttribute("r", Number(point.dataset.baseRadius || cityBaseRadius) / scale);
          });
          cityLayer.querySelectorAll("text").forEach((label) => {
            label.setAttribute("x", Number(label.dataset.cityX) + Number(label.dataset.offsetX) / scale);
            label.setAttribute("y", Number(label.dataset.cityY) + Number(label.dataset.offsetY) / scale);
          });
        };
        const zoomBehavior = d3?.zoom()
          .scaleExtent([1, 8])
          .on("zoom", (event) => {
            zoomViewport.setAttribute("transform", event.transform);
            updateSemanticScale(event.transform.k);
          });
        if (zoomSelection && zoomBehavior) zoomSelection.call(zoomBehavior);

        const changeZoom = (factor) => {
          if (!zoomSelection || !zoomBehavior) return;
          const selection = reducedMotion ? zoomSelection : zoomSelection.transition().duration(240);
          selection.call(zoomBehavior.scaleBy, factor);
        };
        const resetZoom = () => {
          if (!zoomSelection || !zoomBehavior) return;
          const selection = reducedMotion ? zoomSelection : zoomSelection.transition().duration(280);
          selection.call(zoomBehavior.transform, d3.zoomIdentity);
        };

        const activatePreview = (path) => {
          if (path !== activeProvince) return;
          closeAttractions();
          const previewPath = zoomPathFor(path);
          if (!previewPath) return;
          zoomPaths.forEach((candidate) => candidate.classList.remove("isActive"));
          previewPath.classList.add("isActive");
          zoomSvg.classList.add("isZoomed", "isVisible");
          chinaMapMount.classList.add("isPreviewing");

          const bounds = path.getBBox();
          const padding = Math.max(4, Math.max(bounds.width, bounds.height) * .1);
          const width = Math.max(26, bounds.width + padding * 2);
          const height = Math.max(26, bounds.height + padding * 2);
          const side = Math.max(width, height);
          const cityCount = renderCities(path, side);
          previewTitle.textContent = cityCount > 1
            ? `${path.dataset.name} · ${cityCount} 城市`
            : path.dataset.name || "";
          if (chinaMapLabel) {
            chinaMapLabel.textContent = cityCount > 1
              ? `${path.dataset.name} · ${cityCount} 城市`
              : path.dataset.name || "选择省份";
          }
          if (!previewPanel.open) previewPanel.showModal();
          previewOpen = true;
          zoomSelection?.call(zoomBehavior.transform, d3.zoomIdentity);
          requestAnimationFrame(() => {
            previewPanel.classList.add("isVisible");
            closeButton.focus({ preventScroll: true });
          });
          animateViewBox(zoomSvg, [
            bounds.x + bounds.width / 2 - side / 2,
            bounds.y + bounds.height / 2 - side / 2,
            side,
            side
          ]);
        };

        const showProvince = (path) => {
          if (!path || path === activeProvince) return;
          clearTimeout(resetTimer);
          activeProvince?.classList.remove("isActive");
          activeProvince = path;
          path.classList.add("isActive");
          if (chinaMapLabel) chinaMapLabel.textContent = path.dataset.name || "选择省份";
        };

        const resetProvince = (force = false) => {
          if (previewOpen && !force) return;
          closeAttractions();
          activeProvince?.classList.remove("isActive");
          activeProvince = null;
          if (chinaMapLabel) chinaMapLabel.textContent = "选择省份";
          chinaMapMount.classList.remove("isPreviewing");
          previewPanel.classList.remove("isVisible");
          zoomSvg.classList.remove("isVisible");
          animateViewBox(zoomSvg, defaultViewBox, 320);
          clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => {
            if (activeProvince) return;
            zoomSvg.classList.remove("isZoomed");
            zoomPaths.forEach((candidate) => candidate.classList.remove("isActive"));
            cityLayer.replaceChildren();
            zoomSvg.setAttribute("viewBox", defaultViewBox.join(" "));
          }, reducedMotion ? 0 : 340);
        };

        const provinceFromEvent = (event) => event.target.closest?.(".chinaProvince");

        svg.addEventListener("pointerover", (event) => {
          const province = provinceFromEvent(event);
          if (province) showProvince(province);
          else if (event.target === svg) resetProvince();
        });
        svg.addEventListener("pointerleave", () => resetProvince());
        svg.addEventListener("focusin", (event) => {
          const province = provinceFromEvent(event);
          if (province) showProvince(province);
        });
        svg.addEventListener("focusout", () => {
          requestAnimationFrame(() => {
            if (!svg.contains(document.activeElement)) resetProvince();
          });
        });
        svg.addEventListener("click", (event) => {
          const province = provinceFromEvent(event);
          if (!province) return;
          event.preventDefault();
          showProvince(province);
          activatePreview(province);
        });
        svg.addEventListener("keydown", (event) => {
          const province = provinceFromEvent(event);
          if (!province || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          province.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        cityLayer.addEventListener("click", (event) => {
          const group = event.target.closest?.(".chinaCityPoint");
          if (!group?.cityData) return;
          event.preventDefault();
          event.stopPropagation();
          openAttractions(group.cityData, group);
        });
        cityLayer.addEventListener("keydown", (event) => {
          const group = event.target.closest?.(".chinaCityPoint");
          if (!group?.cityData || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          openAttractions(group.cityData, group);
        });

        zoomOutButton.addEventListener("click", () => changeZoom(1 / 1.5));
        zoomResetButton.addEventListener("click", resetZoom);
        zoomInButton.addEventListener("click", () => changeZoom(1.5));
        closeButton.addEventListener("click", () => previewPanel.close());
        attractionClose.addEventListener("click", closeAttractions);
        atlasButton.addEventListener("click", () => {
          const provinceName = activeProvince?.dataset.name;
          const targetCard = Array.from(mapCards).find((card) => card.dataset.title === provinceName);
          previewPanel.close();
          targetCard?.click();
        });
        previewPanel.addEventListener("click", (event) => {
          if (event.target === previewPanel) previewPanel.close();
        });
        previewPanel.addEventListener("close", () => {
          previewOpen = false;
          closeAttractions();
          resetProvince(true);
          resetZoom();
        });

        if (provincePaths.length !== mapCards.length) {
          console.warn(`Map/card count mismatch: ${provincePaths.length}/${mapCards.length}`);
        }
      })
      .catch((error) => {
        chinaMapMount.innerHTML = '<span class="chinaMapLoading">地图载入失败</span>';
        console.error(error);
      });
  }

  const revealTargets = document.querySelectorAll(".sectionHeader, .projectCard, .atlasHeader, .mapCard, .aboutIntro, .method, .contact > *");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("isVisible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach((target) => {
      target.classList.add("reveal");
      observer.observe(target);
    });
  }

  if (!reducedMotion && matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll(".projectCard, [data-tilt]").forEach((card) => {
      const strength = Number(card.dataset.tiltStrength || 3.5);
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty("--glow-x", `${x * 100}%`);
        card.style.setProperty("--glow-y", `${y * 100}%`);
        card.style.transform = `rotateX(${(0.5 - y) * strength}deg) rotateY(${(x - 0.5) * strength}deg)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  const canvas = document.querySelector("#ambient-canvas");
  if (!canvas || reducedMotion) return;
  const context = canvas.getContext("2d");
  const points = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    points.length = 0;
    const count = Math.min(150, Math.floor(width * height / 11000));
    for (let index = 0; index < count; index += 1) {
      points.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 900 + 80,
        size: Math.random() * 1.2 + 0.2
      });
    }
  }

  function render() {
    context.clearRect(0, 0, width, height);
    const night = root.dataset.theme === "night";
    const centerX = width * 0.5 + pointerX * 28;
    const centerY = height * 0.46 + pointerY * 22;
    const speed = 0.55;

    points.forEach((point) => {
      point.z -= speed;
      if (point.z < 50) point.z = 980;
      const scale = 360 / point.z;
      const x = centerX + point.x * scale;
      const y = centerY + point.y * scale;
      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return;
      const alpha = Math.min(0.45, (1 - point.z / 1000) * 0.5);
      context.beginPath();
      context.fillStyle = night ? `rgba(128,180,225,${alpha})` : `rgba(38,68,92,${alpha * 0.75})`;
      context.arc(x, y, Math.max(0.35, point.size * scale), 0, Math.PI * 2);
      context.fill();
    });
    frame = requestAnimationFrame(render);
  }

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX / width - 0.5;
    pointerY = event.clientY / height - 0.5;
  }, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else render();
  });
  resize();
  render();
})();
