// Applies the stored theme before first paint to avoid a flash (see src/hooks/use-theme.ts).
(function () {
  try {
    var stored = localStorage.getItem("fittune.theme");
    var prefersLight = matchMedia("(prefers-color-scheme: light)").matches;
    var dark = stored === "dark" || (stored !== "light" && !prefersLight);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
