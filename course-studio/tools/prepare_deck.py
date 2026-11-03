#!/usr/bin/env python3
"""Prepare an offline, private PDF/PPTX image deck for Course Studio v2."""
from __future__ import annotations
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

def prepare(source: Path, studio_root: Path, slug: str, width: int = 1920) -> dict:
    source = source.expanduser().resolve()
    studio_root = studio_root.resolve()
    if not source.is_file() or source.suffix.lower() not in {'.pdf', '.pptx'}:
        raise ValueError('Нужен существующий PDF или PPTX.')
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,55}', slug):
        raise ValueError('Название --slug: латинские буквы, цифры, _ и - (максимум 56).')
    if not 960 <= width <= 3840:
        raise ValueError('Ширина должна быть 960–3840 пикселей.')
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError('Нужен PyMuPDF. Установи: py -m pip install PyMuPDF') from exc
    with tempfile.TemporaryDirectory(prefix='course-studio-') as temp_dir:
        tmp = Path(temp_dir)
        pdf = source
        if source.suffix.lower() == '.pptx':
            soffice = shutil.which('soffice') or shutil.which('libreoffice')
            if not soffice and sys.platform.startswith('win'):
                for candidate in [
                    r'C:\Program Files\LibreOffice\program\soffice.exe',
                    r'C:\Program Files (x86)\LibreOffice\program\soffice.exe',
                ]:
                    if Path(candidate).exists():
                        soffice = candidate
                        break
            if not soffice:
                raise RuntimeError('Для прямого PPTX установи LibreOffice или экспортируй презентацию в PDF через PowerPoint.')
            copied = tmp / 'deck.pptx'
            shutil.copy2(source, copied)
            cmd = [str(soffice), '--headless', '--convert-to', 'pdf', '--outdir', str(tmp), str(copied)]
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            pdf = tmp / 'deck.pdf'
            if proc.returncode != 0 or not pdf.is_file():
                raise RuntimeError('PPTX не удалось преобразовать: ' + (proc.stderr or proc.stdout)[-500:])
        with fitz.open(pdf) as doc:
            if len(doc) < 1 or len(doc) > 200:
                raise ValueError('Допустимо 1–200 страниц.')
            staged = tmp / 'rendered'
            staged.mkdir()
            cues = []
            for i, page in enumerate(doc, 1):
                if page.rect.width <= 0 or page.rect.height <= 0:
                    raise ValueError('Некорректная геометрия страницы: ' + str(i))
                scale = width / page.rect.width
                pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                name = 'slide-{0:03d}.png'.format(i)
                pix.save(staged / name)
                cues.append({
                    'id': 'DECK-C{0:03d}'.format(i),
                    'at': '',
                    'title': 'Слайд {0:02d}'.format(i),
                    'visual': {
                        'kind': 'image', 'mode': 'image',
                        'src': 'private-decks/{0}/{1}'.format(slug, name),
                        'fit': 'contain', 'background': '#ffffff'
                    },
                    'speech': ['[ДОПОЛНИТЬ ДОСЛОВНЫЙ ТЕКСТ ВЕДУЩЕГО]'],
                    'action': 'Показать слайд и объяснить его смысл.',
                    'production': 'OBS: SLIDES. Показывать исходный слайд без перерисовки.',
                    'check': 'Проверить переход к следующему слайду.',
                })
        out_dir = studio_root / 'private-decks' / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        for old in out_dir.glob('slide-[0-9][0-9][0-9].png'):
            old.unlink()
        for rendered in staged.glob('slide-*.png'):
            shutil.move(str(rendered), str(out_dir / rendered.name))
        manifest = {
            'schemaVersion': 2,
            'course': source.stem,
            'lessons': [{
                'id': 'DECK-01', 'title': source.stem, 'durationMin': 0,
                'status': 'outline', 'cues': cues
            }]
        }
        manifest_path = out_dir / 'deck.json'
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
        return {'slides': len(cues), 'path': str(out_dir), 'manifest': str(manifest_path)}

def main() -> int:
    parser = argparse.ArgumentParser(description='PDF/PPTX → PNG + JSON Course Studio')
    parser.add_argument('source', type=Path)
    parser.add_argument('--slug', default='my-deck')
    parser.add_argument('--width', type=int, default=1920)
    args = parser.parse_args()
    try:
        result = prepare(args.source, Path(__file__).resolve().parents[1], args.slug, args.width)
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
        print('Ошибка:', exc, file=sys.stderr)
        return 1
    print('Готово: {slides} слайдов\nПапка: {path}\nJSON: {manifest}'.format(**result))
    print('Загрузи deck.json в студию; private-decks в публичный GitHub не коммить.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
