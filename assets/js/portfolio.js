(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector(".themeToggle");
  const themeLabel = themeButton?.querySelector(".themeText");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const savedTheme = localStorage.getItem("portfolio-theme");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function applyTheme(theme) {
    const paper = theme === "paper";
    root.dataset.theme = paper ? "paper" : "night";
    themeButton?.setAttribute("aria-pressed", String(paper));
    themeButton?.setAttribute("aria-label", paper ? "切换到深空模式" : "切换到明亮模式");
    if (themeLabel) themeLabel.textContent = paper ? "深空" : "明亮";
    themeMeta?.setAttribute("content", paper ? "#e9edf2" : "#050810");
  }

  applyTheme(savedTheme === "paper" ? "paper" : "night");

  themeButton?.addEventListener("click", () => {
    const next = root.dataset.theme === "night" ? "paper" : "night";
    localStorage.setItem("portfolio-theme", next);
    applyTheme(next);
  });

  const filterButtons = document.querySelectorAll(".filterButton");
  const mapCards = document.querySelectorAll(".mapCard");
  const dialog = document.querySelector("#map-dialog");
  const dialogImage = dialog?.querySelector(".dialogImage");
  const dialogTitle = dialog?.querySelector("#map-dialog-title");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      mapCards.forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.region !== filter;
      });
    });
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
