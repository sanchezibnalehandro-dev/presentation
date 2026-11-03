// Shared visual renderer. The audience receives ONLY a visual payload, never spoken scripts.
(function () {
  "use strict";
  const el=(tag,cl,txt)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=String(txt);return n};
  function render(mount,scene,blackout=false){
    mount.replaceChildren();
    if(blackout){mount.classList.add("is-black");return}
    mount.classList.remove("is-black");
    if(!scene){const n=el("div","empty","Ожидаем кадр от пульта");mount.append(n);return}
    const wrap=el("div","canvas kind-"+(scene.kind||"statement"));
    const accent=el("div","bar");wrap.append(accent);
    const top=el("div","frame-top");
    top.append(el("span","frame-kicker",scene.kicker||"CHATGPT · ОТ А ДО Я"));
    top.append(el("span","frame-day",scene.day||""));
    wrap.append(top);
    const main=el("main","frame-main");
    if(scene.label)main.append(el("div","frame-label",scene.label));
    if(scene.headline)main.append(el("h2","frame-headline",scene.headline));
    if(scene.subline)main.append(el("p","frame-subline",scene.subline));
    if(scene.kind==="compare" && Array.isArray(scene.columns)){
      const grid=el("div","frame-compare");
      for(const col of scene.columns.slice(0,2)){const card=el("div","compare-card");card.append(el("b","compare-head",col.title||""));card.append(el("p","compare-body",col.body||""));grid.append(card)}
      main.append(grid);
    }
    if(Array.isArray(scene.bullets) && scene.bullets.length){
      const list=el("div","frame-bullets");for(const bullet of scene.bullets.slice(0,4)){const row=el("div","frame-bullet");row.append(el("i","bullet-dot",""));row.append(el("span","",bullet));list.append(row)}main.append(list)
    }
    if(scene.kind==="live"){main.append(el("div","live-tag","LIVE · ПЕРЕКЛЮЧЕНИЕ НА РЕАЛЬНЫЙ CHATGPT"))}
    if(scene.footer)main.append(el("p","frame-footer",scene.footer));
    wrap.append(main);
    const foot=el("div","frame-bottom");foot.append(el("span","","SANCHEZ / AI"));foot.append(el("span","",scene.topic||"ОБУЧЕНИЕ · 7 ДНЕЙ"));wrap.append(foot);
    mount.append(wrap);
  }
  window.CourseFrame={render};
})();