const CHANNEL = "digital-neanderthals-stage-v1";
const KEY_SLIDE = "dn-slide-v1";
const KEY_TIMER = "dn-timer-v1";
const KEY_SIZE = "dn-note-size-v1";
const TOTAL_MVP = 5;

const $ = (id) => document.getElementById(id);
// An audience popup retains an opener reference even from local file:// pages.
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k,v) { try { localStorage.setItem(k,v); } catch (_) {} }
};
const MSG_TAG = "digital-neanderthals-stage-v1";
const targetOrigin = location.protocol === "file:" ? "*" : location.origin;
function sendToAudience(payload) {
  if (!audienceWindow || audienceWindow.closed) return;
  audienceWindow.postMessage({ ...payload, channel: MSG_TAG }, targetOrigin);
}
function readSavedSlide() {
  const hash = location.hash.match(/^#s=(0[1-9]|1[0-9]|2[0-5])$/);
  return hash?.[1] || storage.get(KEY_SLIDE);
}

const formatId = (n) => String(n).padStart(2, "0");
const formatClock = (ms) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};

let slides = [];
let notes = new Map();
let index = 0;
let currentNoteSize = Number(storage.get(KEY_SIZE)) || 17;
let audienceWindow = null;
let viewerLastSeen = 0;
let timer = loadTimer();

function loadTimer() {
  try {
    const t = JSON.parse(storage.get(KEY_TIMER) || "null");
    if (t && Number.isFinite(t.accumulated) && (t.startedAt === null || Number.isFinite(t.startedAt)))
      return t;
  } catch (_) {}
  return { accumulated: 0, startedAt: null };
}
function saveTimer() { storage.set(KEY_TIMER, JSON.stringify(timer)); }
function elapsedMs() {
  return timer.accumulated + (timer.startedAt === null ? 0 : Date.now() - timer.startedAt);
}
function updateClock() {
  $("elapsed").textContent = formatClock(elapsedMs());
  $("wallTime").textContent = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  $("toggleTimer").textContent = timer.startedAt === null ? "▶ Таймер" : "Ⅱ Пауза";
  const connected = !!audienceWindow && !audienceWindow.closed && Date.now() - viewerLastSeen < 7500;
  $("connectionStatus").innerHTML = `<i class="dot${connected ? " on" : ""}"></i>${connected ? "Экран подключён" : "Экран не подключён"}`;
}
function showError(message) {
  $("alert").textContent = message;
  $("alert").hidden = false;
}
function timeline(note) {
  return note ? `${String(note.startMinute).padStart(2, "0")}–${String(note.endMinute).padStart(2, "0")} мин` : "Нет заметок";
}
function pushState() {
  if (!slides.length) return;
  const id = slides[index].id;
  storage.set(KEY_SLIDE, id);
  // Hash survives refresh even when browsers disable localStorage on file://.
  if (location.hash !== "#s=" + id) history.replaceState(null, "", "#s=" + id);
  sendToAudience({ type: "STATE", id });
}
function createSection(section) {
  const wrap = document.createElement("section");
  wrap.className = "note-section";
  const heading = document.createElement("h3");
  heading.className = "note-label";
  heading.textContent = section.label;
  const text = document.createElement("p");
  text.className = "note-copy";
  text.textContent = section.text;
  wrap.append(heading, text);
  return wrap;
}
function renderNotes(slide) {
  const panel = $("notesScroll");
  panel.replaceChildren();
  const note = notes.get(slide.id);
  panel.style.fontSize = currentNoteSize + "px";
  if (!note) {
    panel.textContent = "Для этого слайда заметки пока не импортированы.";
    return;
  }
  for (const section of note.sections) panel.append(createSection(section));
  panel.scrollTop = 0;
}
function render() {
  if (!slides.length) return;
  const slide = slides[index];
  const next = slides[index + 1] ?? null;
  $("currentImage").src = slide.localImagePath;
  $("currentImage").alt = slide.title;
  $("slideNumber").textContent = `${slide.id} / ${formatId(slides.length)}`;
  $("currentTitle").textContent = slide.title;
  $("timingLabel").textContent = timeline(notes.get(slide.id));
  $("nextImage").hidden = !next;
  if (next) {
    $("nextImage").src = next.localImagePath;
    $("nextImage").alt = next.title;
  }
  $("nextTitle").textContent = next?.title || "Конец пятислайдового MVP";
  $("nextTiming").textContent = next ? timeline(notes.get(next.id)) : "Остальные слайды подключим после проверки";
  $("prev").disabled = index === 0;
  $("next").disabled = index === slides.length - 1;
  $("jump").value = slide.id;
  renderNotes(slide);
  pushState();
}
function moveTo(n) {
  if (!slides.length) return;
  const bounded = Math.min(Math.max(0, n), slides.length - 1);
  if (bounded !== index) { index = bounded; render(); }
}
function keyHandler(ev) {
  const t = ev.target;
  if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if (t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName))) return;
  if (ev.key === "ArrowRight" || ev.key === "PageDown" || ev.key === " ") {
    ev.preventDefault(); moveTo(index + 1);
  } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
    ev.preventDefault(); moveTo(index - 1);
  } else if (ev.key === "Home") {
    ev.preventDefault(); moveTo(0);
  } else if (ev.key === "End") {
    ev.preventDefault(); moveTo(slides.length - 1);
  }
}
function showAudience() {
  const url = new URL("audience.html", window.location.href);
  url.hash = "s=" + (slides[index]?.id || "01");
  audienceWindow = window.open(url.toString(), "dn_audience", "width=1280,height=720");
  if (!audienceWindow) {
    showError("Браузер заблокировал окно. Разреши всплывающие окна для этой страницы и нажми ещё раз.");
    return;
  }
  // Browser restrictions prevent sending another monitor fullscreen programmatically.
  audienceWindow.focus();
  // Reloaded or newly created audience window asks for fresh state.
  pushState();
}
function boot() {
  try {
    const manifest = window.__DECK_MANIFEST__;
    const notebook = window.__NOTES_DATA__;
    if (!manifest?.slides || !notebook?.notes) throw Error("Не загружены data/slides-data.js или content/notes-data.js");
    slides = manifest.slides.slice(0, TOTAL_MVP);
    notes = new Map(notebook.notes.map((note) => [note.id, note]));
    if (slides.length !== TOTAL_MVP) throw Error("Для MVP не хватает первых пяти записей в манифесте");
    for (const s of slides) {
      if (!notes.has(s.id)) throw Error("Отсутствуют заметки для слайда " + s.id);
    }
    const saved = readSavedSlide();
    index = Math.max(0, slides.findIndex((s) => s.id === saved));
    for (const slide of slides) {
      const option = document.createElement("option");
      option.value = slide.id;
      option.textContent = `${slide.id} · ${slide.title}`;
      $("jump").append(option);
    }
    $("currentImage").addEventListener("error", () => showError("Не найдена картинка " + slides[index].localImagePath + ". Проверь локальные файлы."));
    render();
// Audience connects by HELLO through window.opener.postMessage.
  } catch (e) {
    showError("Не удалось запустить презентацию: " + e.message);
  }
}
$("prev").addEventListener("click", () => moveTo(index - 1));
$("next").addEventListener("click", () => moveTo(index + 1));
$("jump").addEventListener("change", (e) => moveTo(slides.findIndex((s) => s.id === e.target.value)));
$("openAudience").addEventListener("click", showAudience);
$("toggleTimer").addEventListener("click", () => {
  if (timer.startedAt === null) timer.startedAt = Date.now();
  else { timer.accumulated += Date.now() - timer.startedAt; timer.startedAt = null; }
  saveTimer(); updateClock();
});
$("resetTimer").addEventListener("click", () => {
  timer = { accumulated: 0, startedAt: null };
  saveTimer(); updateClock();
});
$("largerText").addEventListener("click", () => {
  currentNoteSize = Math.min(28, currentNoteSize + 1);
  storage.set(KEY_SIZE, String(currentNoteSize));
  $("notesScroll").style.fontSize = currentNoteSize + "px";
});
$("smallerText").addEventListener("click", () => {
  currentNoteSize = Math.max(13, currentNoteSize - 1);
  storage.set(KEY_SIZE, String(currentNoteSize));
  $("notesScroll").style.fontSize = currentNoteSize + "px";
});
document.addEventListener("keydown", keyHandler);
window.addEventListener("message", (event) => {
  // Reject messages from anything except our exact audience popup.
  if (event.source !== audienceWindow || !audienceWindow) return;
  const data = event.data || {};
  if (data.channel !== MSG_TAG) return;
  if (data.type === "HELLO" && data.from === "audience") {
    viewerLastSeen = Date.now();
    pushState();
  }
  if (data.type === "VIEWER_ALIVE") viewerLastSeen = Date.now();
});
setInterval(updateClock, 1000);
updateClock();
boot();
