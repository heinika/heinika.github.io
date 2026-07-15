(() => {
  const root = document.documentElement;
  const button = document.querySelector(".themeToggle");
  const label = document.querySelector(".themeText");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const savedTheme = localStorage.getItem("portfolio-theme");

  function applyTheme(theme) {
    const night = theme === "night";
    root.dataset.theme = night ? "night" : "paper";
    button?.setAttribute("aria-pressed", String(night));
    button?.setAttribute("aria-label", night ? "切换到纸张模式" : "切换到夜色模式");
    if (label) label.textContent = night ? "见纸" : "入夜";
    themeMeta?.setAttribute("content", night ? "#071015" : "#f2eadb");
  }

  applyTheme(savedTheme === "night" ? "night" : "paper");

  button?.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "night" ? "paper" : "night";
    localStorage.setItem("portfolio-theme", nextTheme);
    applyTheme(nextTheme);
  });

  const filterButtons = document.querySelectorAll(".filterButton");
  const mapCards = document.querySelectorAll(".mapCard");
  const dialog = document.querySelector("#map-dialog");
  const dialogImage = dialog?.querySelector(".dialogImage");
  const dialogTitle = dialog?.querySelector("#map-dialog-title");
  const dialogClose = dialog?.querySelector(".dialogClose");

  filterButtons.forEach((filterButton) => {
    filterButton.addEventListener("click", () => {
      const filter = filterButton.dataset.filter;
      filterButtons.forEach((item) => {
        const active = item === filterButton;
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

  dialogClose?.addEventListener("click", () => dialog?.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
})();
