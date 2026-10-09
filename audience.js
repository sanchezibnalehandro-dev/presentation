const channel = "BroadcastChannel" in window ? new BroadcastChannel("digital-neanderthals-stage-v1") : null;
const KEY_SLIDE = "dn-slide-v1";
const slide = document.getElementById("slide");
const error = document.getElementById("viewerError");
let current = null;

function show(id) {
  if (!/^0[1-5]$/.test(String(id)) || current === id) return;
  current = id;
  slide.src = "assets/slides/" + id + ".png";
  slide.alt = "Слайд " + id;
}

slide.addEventListener("error", () => { error.hidden = false; });
slide.addEventListener("load", () => { error.hidden = true; });
channel?.addEventListener("message", (event) => {
  if (event.data?.type === "STATE") show(event.data.id);
});
window.addEventListener("storage", (event) => {
  if (event.key === KEY_SLIDE && event.newValue) show(event.newValue);
});
show(localStorage.getItem(KEY_SLIDE) || "01");
channel?.postMessage({ type: "HELLO", from: "audience" });
function heartbeat() { channel?.postMessage({ type: "VIEWER_ALIVE" }); }
setInterval(heartbeat, 2500);
heartbeat();
