#!/usr/bin/env node
// Fast offline integrity check for the five-slide MVP; no dependencies.
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
const root = new URL("../", import.meta.url);
const file = (p) => new URL(p, root);
const errors = [];
const readText = async (p) => (await readFile(file(p))).toString("utf8");
let manifest, notebook;
try {
  manifest = JSON.parse(await readText("data/slides.json"));
  notebook = JSON.parse(await readText("content/notes.json"));
} catch (e) { console.error("Неверный манифест/заметки:", e.message); process.exit(1); }
const slides = manifest.slides.slice(0, 5);
if (slides.length !== 5) errors.push("Нет пяти записей в манифесте");
for (const slide of slides) {
  const id = slide.id;
  if (!notebook.notes.some((n) => n.id === id && n.sections?.length))
    errors.push(id + ": нет содержательных заметок");
  const path = "assets/slides/" + id + ".png";
  try {
    const img = await readFile(file(path));
    if (!img.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error("не PNG");
    const w = img.readUInt32BE(16), h = img.readUInt32BE(20);
    if (Math.abs(w / h - 16 / 9) > 0.035) throw Error("пропорции не 16:9");
    console.log(id + ": " + w + "×" + h + ", " + Math.round(img.length / 1024) + " КБ — OK");
  } catch (e) { errors.push(id + ": " + e.message); }
}
for (const path of ["index.html", "audience.html", "styles.css", "presenter.js", "audience.js"]) {
  try { await stat(file(path)); } catch { errors.push("Нет " + path); }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("MVP 01–05: все исходники, изображения и заметки на месте.");
