#!/usr/bin/env node
// Read-only local preflight for a private Course Studio JSON + referenced PNGs.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const input = process.argv[2];
if (!input) {console.error("Usage: node course-studio/tools/check-deck.mjs <private JSON path>"); process.exit(2);}
const file = path.resolve(input), root = path.resolve(import.meta.dirname, "..");
const errors=[], warnings=[];
let data;
try {data=JSON.parse(fs.readFileSync(file,"utf8"))}catch(e){console.error("JSON error: "+e.message);process.exit(1)}
if (!Array.isArray(data.lessons)||data.lessons.length===0) errors.push("Нет lessons");
let count=0,images=0,live=0;
for(const lesson of data.lessons||[]){
 if(!Array.isArray(lesson.cues)||lesson.cues.length===0){errors.push("Нет кадров в "+lesson.id);continue}
 for(const cue of lesson.cues){
   count++;
   if(!Array.isArray(cue.speech))errors.push("Нет speech[] у "+cue.id);
   const v=cue.visual||cue.view||{},kind=v.mode||v.kind;
   if(kind==="live"){live++;continue}
   if(kind!=="image") continue;
   images++;
   if(typeof v.src!=="string"||!v.src||v.src.startsWith("/")||v.src.includes("\\")||v.src.split("/").includes("..")){
     errors.push("Небезопасный путь для "+cue.id);continue;
   }
   if(v.src.startsWith("@upload/")){warnings.push("Временный импорт: "+cue.id);continue}
   const src=path.resolve(root,v.src);
   if(!src.startsWith(root+path.sep)){errors.push("Путь вне студии: "+v.src);continue}
   if(!fs.existsSync(src)){errors.push("Нет изображения: "+v.src);continue}
   const buf=fs.readFileSync(src);
   if(buf.length<24||buf.subarray(0,8).toString("hex")!=="89504e470d0a1a0a"){warnings.push("Не PNG, проверь: "+v.src);continue}
   const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);
   if(w<1280||h<600)warnings.push("Недостаточное разрешение "+w+"x"+h+": "+v.src);
   if(Math.abs(w/h-16/9)>0.12)warnings.push("Не 16:9 "+w+"x"+h+": "+v.src);
 }
}
console.log("Lessons:",data.lessons?.length,"Cues:",count,"Images:",images,"Live:",live);
for(const s of warnings)console.warn("WARN:",s);
for(const s of errors)console.error("ERROR:",s);
process.exit(errors.length?1:0);
