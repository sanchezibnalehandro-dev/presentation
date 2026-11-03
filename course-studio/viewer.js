(function () {
  "use strict";
  const TAG = "sanchez-course-studio-v1";
  const mount = document.getElementById("viewerFrame");
  const hint = document.getElementById("viewerhint");
  let lastObjectUrl = null;
  window.CourseFrame.render(mount, null);
  window.addEventListener("message", (event) => {
    if (!window.opener || event.source !== window.opener || event.origin !== location.origin ||
        event.data?.tag !== TAG || event.data.type !== "FRAME") return;
    const msg = event.data;
    // The file is sent from the presenter as a structured-cloned File, never via a public URL.
    const visual = Object.assign({}, msg.visual || {});
    if (lastObjectUrl) { URL.revokeObjectURL(lastObjectUrl); lastObjectUrl = null; }
    if (msg.file instanceof Blob) {
      lastObjectUrl = URL.createObjectURL(msg.file);
      visual.src = lastObjectUrl;
    }
    window.CourseFrame.render(mount, visual, !!msg.blackout);
    hint.hidden = true;
  });
  function signal(type) {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ tag: TAG, type }, location.origin);
      }
    } catch (_) {}
  }
  signal("HELLO");
  setInterval(() => signal("ALIVE"), 2500);
  window.addEventListener("pagehide", () => {
    if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
  });
})();