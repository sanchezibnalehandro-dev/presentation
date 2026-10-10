// Audience-only view. No dependencies, no fetch, no localStorage, no server.
// The presenter creates this window, and two windows communicate directly.
const MSG_TAG = "digital-neanderthals-stage-v1";
const QNA_URL = "https://qna.sanchez-ai.ru/ask.html?room=sanchez-live";
const MATERIALS_URL = "https://drive.google.com/file/d/1OBWoRAMf7aH895DywvCFe5D0TKyRBD2c/view";
const introScene = document.getElementById("introScene");
const finalMaterials = document.getElementById("finalMaterials");
function makeQr(id, url, size) {
  if (typeof QRCode !== "function") return;
  new QRCode(document.getElementById(id), {text:url,width:size,height:size,colorDark:"#07111e",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
}

const slide = document.getElementById("slide");
const error = document.getElementById("viewerError");
let current = null;
const targetOrigin = location.protocol === "file:" ? "*" : location.origin;
function show(id) {
  if (!/^(00|0[1-9]|1[0-9]|2[0-5])$/.test(String(id)) || current === id) return;
  current = id;
  const isIntro = id === "00";
  slide.hidden = isIntro;
  introScene.hidden = !isIntro;
  finalMaterials.hidden = true;
  if (!isIntro) slide.src = "assets/slides/" + id + ".png";
  slide.alt = "Слайд " + id;
  if (location.hash !== "#s=" + id) history.replaceState(null, "", "#s=" + id);
}
slide.addEventListener("error", () => { error.hidden = false; });
slide.addEventListener("load", () => { error.hidden = true; });
window.addEventListener("message", (event) => {
  if (!window.opener || event.source !== window.opener) return;
  const data = event.data || {};
  if (data.channel !== MSG_TAG) return;
  if (data.type === "STATE") show(data.id);
  if (data.type === "FINAL_QR") finalMaterials.hidden = !(data.visible && current === "25");
});
function signal(type) {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ channel: MSG_TAG, type, from: "audience" }, targetOrigin);
    }
  } catch (_) {}
}
const initial = location.hash.match(/^#s=(00|0[1-9]|1[0-9]|2[0-5])$/);
makeQr("audienceIntroQr", QNA_URL, 260);
makeQr("audienceFinalQr", MATERIALS_URL, 260);
show(initial?.[1] || "00");
signal("HELLO");
setInterval(() => signal("VIEWER_ALIVE"), 2500);
