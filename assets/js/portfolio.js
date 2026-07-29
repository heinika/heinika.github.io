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
      dialogImage.src = card.dataset.src || "";
      dialogImage.alt = `${card.dataset.title || ""}复古立体手绘地理图`;
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
    let previewTimer = 0;
    let resetTimer = 0;

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

    fetch(chinaMapMount.dataset.mapSrc)
      .then((response) => {
        if (!response.ok) throw new Error(`Map request failed: ${response.status}`);
        return response.text();
      })
      .then((markup) => {
        chinaMapMount.innerHTML = markup;
        const svg = chinaMapMount.querySelector(".chinaMapSvg");
        if (!svg) throw new Error("Map SVG is missing");

        const defaultViewBox = parseViewBox(svg.dataset.defaultViewbox || svg.getAttribute("viewBox"));
        const provincePaths = Array.from(svg.querySelectorAll(".chinaProvince"));
        const zoomSvg = svg.cloneNode(true);
        const zoomPaths = Array.from(zoomSvg.querySelectorAll(".chinaProvince"));
        zoomSvg.classList.add("chinaMapZoomLayer");
        zoomSvg.setAttribute("aria-hidden", "true");
        zoomSvg.removeAttribute("aria-label");
        zoomSvg.removeAttribute("role");
        zoomPaths.forEach((path) => {
          path.removeAttribute("tabindex");
          path.removeAttribute("role");
          path.removeAttribute("aria-label");
        });
        chinaMapMount.append(zoomSvg);

        let activeProvince = null;

        const zoomPathFor = (path) => zoomPaths.find(
          (candidate) => candidate.dataset.code === path.dataset.code
        );

        const activatePreview = (path) => {
          if (path !== activeProvince) return;
          const previewPath = zoomPathFor(path);
          if (!previewPath) return;
          zoomPaths.forEach((candidate) => candidate.classList.remove("isActive"));
          previewPath.classList.add("isActive");
          zoomSvg.classList.add("isZoomed", "isVisible");
          chinaMapMount.classList.add("isPreviewing");

          const bounds = path.getBBox();
          const padding = Math.max(18, Math.max(bounds.width, bounds.height) * .34);
          const width = Math.max(42, bounds.width + padding * 2);
          const height = Math.max(42, bounds.height + padding * 2);
          const side = Math.max(width, height);
          animateViewBox(zoomSvg, [
            bounds.x + bounds.width / 2 - side / 2,
            bounds.y + bounds.height / 2 - side / 2,
            side,
            side
          ]);
        };

        const showProvince = (path, immediate = false) => {
          if (!path || path === activeProvince) return;
          clearTimeout(previewTimer);
          clearTimeout(resetTimer);
          activeProvince?.classList.remove("isActive");
          activeProvince = path;
          path.classList.add("isActive");
          if (chinaMapLabel) chinaMapLabel.textContent = path.dataset.name || "选择省份";
          previewTimer = window.setTimeout(
            () => activatePreview(path),
            immediate || reducedMotion ? 0 : 110
          );
        };

        const resetProvince = () => {
          clearTimeout(previewTimer);
          activeProvince?.classList.remove("isActive");
          activeProvince = null;
          if (chinaMapLabel) chinaMapLabel.textContent = "选择省份";
          chinaMapMount.classList.remove("isPreviewing");
          zoomSvg.classList.remove("isVisible");
          animateViewBox(zoomSvg, defaultViewBox, 320);
          clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => {
            if (activeProvince) return;
            zoomSvg.classList.remove("isZoomed");
            zoomPaths.forEach((candidate) => candidate.classList.remove("isActive"));
            zoomSvg.setAttribute("viewBox", defaultViewBox.join(" "));
          }, reducedMotion ? 0 : 340);
        };

        const provinceFromEvent = (event) => event.target.closest?.(".chinaProvince");

        svg.addEventListener("pointerover", (event) => {
          const province = provinceFromEvent(event);
          if (province) showProvince(province);
          else if (event.target === svg) resetProvince();
        });
        svg.addEventListener("pointerleave", resetProvince);
        svg.addEventListener("focusin", (event) => {
          const province = provinceFromEvent(event);
          if (province) showProvince(province, true);
        });
        svg.addEventListener("focusout", () => {
          requestAnimationFrame(() => {
            if (!svg.contains(document.activeElement)) resetProvince();
          });
        });
        svg.addEventListener("click", (event) => {
          const province = provinceFromEvent(event);
          if (!province) return;
          const targetCard = Array.from(mapCards).find((card) => card.dataset.title === province.dataset.name);
          targetCard?.click();
        });
        svg.addEventListener("keydown", (event) => {
          const province = provinceFromEvent(event);
          if (!province || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          province.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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
