(function(){"use strict";const TAG="sanchez-course-studio-v1";const mount=document.getElementById("viewerFrame"),hint=document.getElementById("viewerhint");CourseFrame.render(mount,null);
window.addEventListener("message",event=>{if(!window.opener||event.source!==window.opener||event.origin!==location.origin||event.data?.tag!==TAG||event.data.type!=="FRAME")return;CourseFrame.render(mount,event.data.visual,!!event.data.blackout);hint.hidden=true});
function signal(type){try{if(window.opener&&!window.opener.closed)window.opener.postMessage({tag:TAG,type},location.origin)}catch(_){}}
signal("HELLO");setInterval(()=>signal("ALIVE"),2500);
})();