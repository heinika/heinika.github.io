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
})();
