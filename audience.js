// Audience-only view. No dependencies, no fetch, no localStorage, no server.
// The presenter creates this window, and two windows communicate directly.
const MSG_TAG = "digital-neanderthals-stage-v1";
const slide = document.getElementById("slide");
const error = document.getElementById("viewerError");
let current = null;
const targetOrigin = location.protocol === "file:" ? "*" : location.origin;
function show(id) {
  if (!/^(0[1-9]|1[0-9]|2[0-5])$/.test(String(id)) || current === id) return;
  current = id;
  slide.src = "assets/slides/" + id + ".png";
  slide.alt = "Слайд " + id;
  if (location.hash !== "#s=" + id) history.replaceState(null, "", "#s=" + id);
}
slide.addEventListener("error", () => { error.hidden = false; });
slide.addEventListener("load", () => { error.hidden = true; });
window.addEventListener("message", (event) => {
  if (!window.opener || event.source !== window.opener) return;
  const data = event.data || {};
  if (data.channel === MSG_TAG && data.type === "STATE") show(data.id);
});
function signal(type) {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ channel: MSG_TAG, type, from: "audience" }, targetOrigin);
    }
  } catch (_) {}
}
const initial = location.hash.match(/^#s=(0[1-9]|1[0-9]|2[0-5])$/);
show(initial?.[1] || "01");
signal("HELLO");
setInterval(() => signal("VIEWER_ALIVE"), 2500);
