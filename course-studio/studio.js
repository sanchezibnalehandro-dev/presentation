(function(){
"use strict";
const TAG="sanchez-course-studio-v1";
const KEY="course-studio-session-v1";
const $=id=>document.getElementById(id);
const demo={course:"ChatGPT от А до Я за 7 дней",lessons:[{id:"DEMO",title:"Демонстрация студии (заменить файлом курса)",durationMin:2,status:"sample",cues:[
{id:"S01",at:"00:00",title:"Титульный кадр",visual:{kind:"title",kicker:"COURSE STUDIO · ДЕМО",headline:"Два экрана. Один сценарий.",subline:"Зритель видит картинку. Ведущий читает текст.",day:"ПРОВЕРКА / 01"},speech:["Этот текст виден только в пульте. На экране зрителя его нет.","Загрузи отдельный JSON с реальными сценариями, чтобы начать запись курса."],action:"На втором мониторе должна быть только титульная карточка.",production:"Проверить звук, режим «Расширить» и полноэкранный F11.",check:"Нажать «Дальше»."},
{id:"S02",at:"00:25",title:"Визуальная схема",visual:{kind:"compare",headline:"Одна сцена. Две роли.",columns:[{title:"ЗРИТЕЛЬ",body:"Крупная мысль + наглядный кадр"},{title:"ВЕДУЩИЙ",body:"Суфлёр + действия + таймер"}],day:"ПРОВЕРКА / 02"},speech:["Слева показана идея для аудитории, а у меня отдельный подробный текст и подсказки."],action:"Проверить синхронность стрелок и обновления.",production:"Прокрутить заметки и убедиться, что изображение не меняется.",check:"Перейти к живой демонстрации."},
{id:"S03",at:"01:00",title:"Переход к демонстрации",visual:{kind:"live",headline:"Демонстрация на экране",subline:"Переключи OBS или захват окна на настоящий ChatGPT.",day:"ПРОВЕРКА / 03"},speech:["Эта плашка служит переходом, а не поддельным интерфейсом сервиса."],action:"Переключить источник записи в OBS на настоящее окно ChatGPT.",production:"Презентация не встраивает ChatGPT и не подделывает его интерфейс.",check:"После демо вернуть источник и завершить."}
]}]};
let data=demo,li=0,ci=0,blackout=false,popup=null,lastSeen=0,elapsed=0,started=null,size=19;
const localFiles = new Map(); // File values stay in the presenter tab, never in GitHub.
const localUrls = new Map(); // URLs for previews; viewer gets cloned File via postMessage.
let importedImages = false;
try{const saved=sessionStorage.getItem(KEY);if(saved){const v=JSON.parse(saved);if(validate(v))data=v;}}catch(_){}
function validate(v){return v&&typeof v==="object"&&Array.isArray(v.lessons)&&v.lessons.length>0&&v.lessons.length<=100&&v.lessons.every(l=>typeof l.id==="string"&&typeof l.title==="string"&&Array.isArray(l.cues)&&l.cues.length>0&&l.cues.length<=100&&l.cues.every(c=>typeof c.title==="string"&&c.visual&&typeof c.visual==="object"&&Array.isArray(c.speech)&&c.speech.every(x=>typeof x==="string")))}
function current(){return data.lessons[li].cues[ci]}
function viewPayload(c){const v=c?.visual||c?.view||{};return {kind:v.kind||v.mode,mode:v.mode||v.kind,src:v.src,fit:v.fit,background:v.background,alt:c?.title,kicker:v.kicker,label:v.label,headline:v.headline,subline:v.subline,columns:v.columns,bullets:v.bullets,footer:v.footer,day:v.day,topic:v.topic}}
function previewPayload(c){const payload=viewPayload(c);if(c && localUrls.has(c.id))payload.src=localUrls.get(c.id);return payload;}
function send(){if(!popup||popup.closed)return;const cue=current();const file=localFiles.get(cue.id)||null;popup.postMessage({tag:TAG,type:"FRAME",visual:viewPayload(cue),file,blackout},location.origin)}
function alertMessage(msg){$("alert").textContent=msg;$("alert").hidden=false;setTimeout(()=>{$("alert").hidden=true},5500)}
function drawLessons(){const select=$("lesson");select.replaceChildren();data.lessons.forEach((l,i)=>{let opt=document.createElement("option");opt.value=String(i);opt.textContent=(l.id+" · "+l.title)+(l.status==="outline"?" [ПЛАН]":"");select.append(opt)});select.value=String(li)}
function redraw(){
 const l=data.lessons[li],c=current(),total=l.cues.length;
 $("source").textContent=importedImages?"Слайды загружены локально":data===demo?"Демо-данные":"Сценарий загружен локально";
 $("counter").textContent=String(ci+1).padStart(2,"0")+" / "+String(total).padStart(2,"0");
 $("cueTitle").textContent=c.title;$("cueTime").textContent=c.at||"";
 $("noteCue").textContent=l.id+" · "+l.title+" / "+c.title;
 CourseFrame.render($("preview"),previewPayload(c),blackout);
 const next=l.cues[ci+1] || data.lessons[li+1]?.cues[0] || null;$("nextTitle").textContent=next?.title||"Конец урока";$("nextType").textContent=next?.at||"Переход к следующему уроку";
 CourseFrame.render($("nextPreview"),previewPayload(next));
 $("speech").replaceChildren();c.speech.forEach(p=>{let n=document.createElement("p");n.textContent=p;$("speech").append(n)});
 $("action").textContent=c.action||"—";$("production").textContent=c.production||"—";$("check").textContent=c.check||"—";
 $("prev").disabled=li===0&&ci===0;$("next").disabled=li===data.lessons.length-1&&ci===total-1;
 $("blackout").setAttribute("aria-pressed",String(blackout));$("blackout").textContent=blackout?"□ Вернуть кадр":"■ Чёрный экран";
 $("notesbody").scrollTop=0;
 const pills=$("cuePills");pills.replaceChildren();l.cues.forEach((x,i)=>{const b=document.createElement("button");b.className="pill"+(i===ci?" active":"");b.title=x.title;b.textContent=String(i+1).padStart(2,"0");b.addEventListener("click",()=>{ci=i;redraw()});pills.append(b)});
 $("lesson").value=String(li);history.replaceState(null,"","#"+encodeURIComponent(l.id)+"-"+String(ci+1));send();
}
function move(d){const l=data.lessons[li];if(ci+d>=0&&ci+d<l.cues.length){ci+=d}else if(d>0&&li<data.lessons.length-1){li++;ci=0}else if(d<0&&li>0){li--;ci=data.lessons[li].cues.length-1}else return;redraw()}
function timeText(ms){const n=Math.floor(ms/1000);return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
function tick(){$("clock").textContent=timeText(elapsed+(started?Date.now()-started:0));$("timer").textContent=started?"Ⅱ Пауза":"▶ Таймер";$("connection").textContent=(popup&&!popup.closed&&Date.now()-lastSeen<7000)?"Экран подключён":"Экран не подключён";$("connection").classList.toggle("warn",!(popup&&!popup.closed&&Date.now()-lastSeen<7000))}
function openViewer(){popup=window.open(new URL("viewer.html",location.href).href,"sanchez_course_recording","width=1280,height=720");if(!popup){alertMessage("Разреши всплывающие окна для localhost.");return}popup.focus();send()}
$("prev").addEventListener("click",()=>move(-1));$("next").addEventListener("click",()=>move(1));$("lesson").addEventListener("change",e=>{li=Number(e.target.value);ci=0;redraw()});$("open").addEventListener("click",openViewer);
$("blackout").addEventListener("click",()=>{blackout=!blackout;redraw()});
$("timer").addEventListener("click",()=>{if(started){elapsed+=Date.now()-started;started=null}else started=Date.now();tick()});
$("reset").addEventListener("click",()=>{elapsed=0;started=null;tick()});
$("smaller").addEventListener("click",()=>{size=Math.max(14,size-1);$("notesbody").style.fontSize=size+"px"});
$("larger").addEventListener("click",()=>{size=Math.min(31,size+1);$("notesbody").style.fontSize=size+"px"});
$("jsonfile").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>1e6)throw Error("Файл больше 1 МБ");const v=JSON.parse(await f.text());if(!validate(v))throw Error("Формат не соответствует схеме. Проверь README.");clearLocalImages();data=v;li=0;ci=0;blackout=false;sessionStorage.setItem(KEY,JSON.stringify(v));drawLessons();redraw();alertMessage("Сценарий загружен локально. Для приватных изображений нужен путь private-decks или повторный импорт PNG.");}catch(error){alertMessage("Ошибка сценария: "+error.message)}e.target.value=""});

function clearLocalImages() {
  for (const src of localUrls.values()) URL.revokeObjectURL(src);
  localUrls.clear();
  localFiles.clear();
  importedImages=false;
}
function naturalFileOrder(a,b) {
  return a.name.localeCompare(b.name,"ru",{numeric:true,sensitivity:"base"});
}
function attachFile(cue,file) {
  // Only local, in-memory image objects. Never copied to sessionStorage or to GitHub.
  const url=URL.createObjectURL(file);
  cue.visual=Object.assign({},cue.visual||{}, {kind:"image",mode:"image",src:"@upload/"+file.name,fit:"contain"});
  localFiles.set(cue.id,file);
  localUrls.set(cue.id,url);
}
function importImages(files) {
  const accepted=["image/png","image/jpeg","image/webp"];
  const selected=Array.from(files).filter(f=>accepted.includes(f.type)||/\.(png|jpe?g|webp)$/i.test(f.name))
    .sort(naturalFileOrder);
  if(!selected.length)throw Error("Выбери PNG, JPG или WebP. PDF/PPTX предварительно конвертируй скриптом из README.");
  if(selected.length>200)throw Error("Максимум 200 изображений за импорт.");
  const maxSize=25*1024*1024;
  if(selected.some(f=>f.size>maxSize))throw Error("Одно из изображений больше 25 МБ.");
  const allCues=data.lessons.flatMap(l=>l.cues);
  const imageCues=allCues.filter(c=>(c.visual?.mode||c.visual?.kind||c.view?.mode)==="image");
  let targets;
  if(imageCues.length===selected.length) {
    targets=imageCues;
  } else if(data===demo) {
    // No script loaded: build a new editable 1-slide-per-cue deck from the images.
    const cues=selected.map((f,i)=>({
      id:"IMPORT-"+String(i+1).padStart(3,"0"),title:f.name,at:"",
      visual:{kind:"image",mode:"image",src:"@upload/"+f.name,fit:"contain"},
      speech:["Сценарий ещё не добавлен. Загрузите JSON с заметками, чтобы читать суфлёр."],
      action:"Объяснить слайд и перейти дальше.",
      production:"OBS: SLIDES. Изображение импортировано локально.",
      check:"Зритель увидел содержание слайда."
    }));
    data={course:"Локально импортированная презентация",lessons:[{id:"IMPORTED",title:"Импортированные изображения",durationMin:0,status:"outline",cues}]};
    targets=cues;
    li=0;ci=0;
  } else {
    throw Error("В сценарии "+imageCues.length+" кадров с изображениями, выбрано "+selected.length+
      ". Для привязки нужно ровно столько файлов, сколько image-кадров, либо открыть демо-режим.");
  }
  clearLocalImages();
  for(let i=0;i<selected.length;i++)attachFile(targets[i],selected[i]);
  importedImages=true;
  drawLessons();redraw();
  alertMessage("Импортировано "+selected.length+" изображений в текущий браузер. После обновления страницы файлы нужно выбрать снова.");
}
$("imagefiles").addEventListener("change", e=>{
  try {importImages(e.target.files||[])} catch(error){alertMessage("Импорт не выполнен: "+error.message)}
  e.target.value="";
});
window.addEventListener("pagehide",clearLocalImages);

document.addEventListener("keydown",e=>{const t=e.target;if(e.altKey||e.ctrlKey||e.metaKey||t instanceof HTMLElement&&(t.isContentEditable||["INPUT","TEXTAREA","SELECT","BUTTON"].includes(t.tagName)))return;if(["ArrowRight","PageDown"," "].includes(e.key)){e.preventDefault();move(1)}if(["ArrowLeft","PageUp"].includes(e.key)){e.preventDefault();move(-1)}if(e.key==="Home"){ci=0;redraw()}if(e.key==="End"){ci=data.lessons[li].cues.length-1;redraw()}});
window.addEventListener("message",e=>{if(!popup||e.source!==popup||e.origin!==location.origin||e.data?.tag!==TAG)return;if(e.data.type==="HELLO"||e.data.type==="ALIVE"){lastSeen=Date.now();if(e.data.type==="HELLO")send()}});
drawLessons();redraw();tick();setInterval(tick,1000);
})();