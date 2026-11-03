// Audience-safe visual renderer. Never accepts or renders the private speech/action fields.
(function () {
  "use strict";
  const el = (tag, className, value) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (value !== undefined) n.textContent = String(value);
    return n;
  };
  function safeImageSrc(source) {
    if (typeof source !== "string" || !source || source.length > 2048) return null;
    // Same-origin paths and browser-generated blob references only. No external calls or data URLs.
    if (/^(https?:|\/\/|data:|javascript:)/i.test(source)) return null;
    if (source.startsWith("blob:")) return source;
    if (source.startsWith("/") || source.includes("\\") || source.split("/").includes("..")) return null;
    return source;
  }
  function render(mount, scene, blackout = false) {
    mount.replaceChildren();
    const mode = scene?.mode || scene?.kind || "statement";
    if (blackout || mode === "blackout") {
      mount.classList.add("is-black");
      return;
    }
    mount.classList.remove("is-black");
    if (!scene) {
      mount.append(el("div", "empty", "Ожидаем кадр от пульта"));
      return;
    }
    if (mode === "image") {
      const src = safeImageSrc(scene.src);
      if (!src) {
        mount.append(el("div", "frame-error", "Изображение не задано или путь заблокирован."));
        return;
      }
      const wrap = el("div", "deck-image-wrap");
      const img = el("img", "deck-image");
      img.alt = typeof scene.alt === "string" ? scene.alt : "Слайд презентации";
      img.decoding = "async";
      img.src = src;
      img.style.objectFit = scene.fit === "cover" ? "cover" : "contain";
      if (/^#[0-9a-f]{3,8}$/i.test(scene.background || "")) wrap.style.background = scene.background;
      const warning = el("div", "frame-error", "Слайд не загрузился. Проверь путь или повторно импортируй изображения.");
      warning.hidden = true;
      img.addEventListener("error", () => { img.hidden = true; warning.hidden = false; });
      wrap.append(img, warning);
      mount.append(wrap);
      return;
    }
    const wrap = el("div", "canvas kind-" + mode);
    wrap.append(el("div", "bar"));
    const top = el("div", "frame-top");
    top.append(el("span", "frame-kicker", scene.kicker || "CHATGPT · ОТ А ДО Я"));
    top.append(el("span", "frame-day", scene.day || ""));
    wrap.append(top);
    const main = el("main", "frame-main");
    if (scene.label) main.append(el("div", "frame-label", scene.label));
    if (scene.headline) main.append(el("h2", "frame-headline", scene.headline));
    if (scene.subline) main.append(el("p", "frame-subline", scene.subline));
    if (mode === "compare" && Array.isArray(scene.columns)) {
      const grid = el("div", "frame-compare");
      for (const col of scene.columns.slice(0, 2)) {
        const card = el("div", "compare-card");
        card.append(el("b", "compare-head", col.title || ""));
        card.append(el("p", "compare-body", col.body || ""));
        grid.append(card);
      }
      main.append(grid);
    }
    if (Array.isArray(scene.bullets) && scene.bullets.length) {
      const list = el("div", "frame-bullets");
      for (const bullet of scene.bullets.slice(0, 4)) {
        const row = el("div", "frame-bullet");
        row.append(el("i", "bullet-dot"));
        row.append(el("span", "", bullet));
        list.append(row);
      }
      main.append(list);
    }
    if (mode === "live") {
      main.append(el("div", "live-tag", "LIVE · ПЕРЕКЛЮЧИТЬ OBS НА НАСТОЯЩИЙ CHATGPT"));
    }
    if (scene.footer) main.append(el("p", "frame-footer", scene.footer));
    wrap.append(main);
    const foot = el("div", "frame-bottom");
    foot.append(el("span", "", "SANCHEZ / AI"));
    foot.append(el("span", "", scene.topic || "ОБУЧЕНИЕ · 7 ДНЕЙ"));
    wrap.append(foot);
    mount.append(wrap);
  }
  window.CourseFrame = { render, safeImageSrc };
})();