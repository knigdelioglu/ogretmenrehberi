#!/usr/bin/env python3
from pathlib import Path
import json,re,sys,unicodedata
ROOT=Path(__file__).resolve().parent
M=json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
errors=[]; warnings=[]; ids={}; pages=[]
for rel in M['page_files']:
 p=ROOT/rel
 if not p.is_file(): errors.append(f'missing page file: {rel}'); continue
 try: obj=json.loads(p.read_text(encoding='utf-8'))
 except Exception as e: errors.append(f'JSON parse: {rel}: {e}'); continue
 pages.append(obj)
 if obj.get('theme_id')!='theme-2': errors.append(f'wrong theme_id: {rel}')
 if not (84<=obj.get('printed_page',-1)<=159): errors.append(f'printed_page out of range: {rel}')
 if obj.get('pdf_page')!=obj.get('printed_page',0)+1: errors.append(f'page offset mismatch: {rel}')
 for b in obj.get('blocks',[]):
  bid=b.get('id')
  if not bid or not bid.startswith('G11-T2-'): errors.append(f'bad block id: {rel}: {bid}')
  if bid in ids: errors.append(f'duplicate id: {bid}')
  ids[bid]=(obj,b)
  if b.get('type')=='question' and not b.get('question_number'): errors.append(f'question without number: {bid}')
  if b.get('type')=='table':
   n=len(b.get('columns',[]))
   for ri,row in enumerate(b.get('rows',[]),1):
    if len(row)!=n: errors.append(f'table width: {bid} row {ri} has {len(row)}, expected {n}')
# All manifest references resolve; all numbered source items are either a question or instruction.
for obj in pages:
 blocks=obj.get('blocks',[]); rel=obj['printed_page']; raw=next((b.get('text','') for b in blocks if b.get('role')=='verbatim_page_transcription'),'')
 for b in blocks:
  for field in ('instruction_ids','question_ids','table_ids','visual_ids','related_text_ids','related_table_ids','related_media_ids','body_transcription_ids'):
   for ref in b.get(field,[]):
    if ref not in ids: errors.append(f'unresolved {field} reference {ref} from {b.get("id")}')
 pat=[]
 for line in raw.splitlines():
  m=re.match(r'^\s*(\d{1,2})\.\s+(.+?)\s*$',line)
  if not m: continue
  t=''.join(c for c in unicodedata.normalize('NFKD',m.group(2).strip().casefold()) if not unicodedata.combining(c))
  if t=='tema' or t.startswith(('tema ','metin tahlili','edebiyat atolyesi','tema sonu','okuma metni','1. tema','2. tema','3. tema','4. tema')): continue
  if t.startswith('yuzyılda '): continue
  if t.startswith(('dinleme / izleme','okuma','yazma','konusma')): continue
  pat.append(m.group(1))
 actual=[str(b.get('question_number') or b.get('item_number')) for b in blocks if b.get('question_number') or b.get('item_number')]
 if pat!=actual: errors.append(f'numbered prompt coverage mismatch printed {rel}: source={pat} blocks={actual}')
if len(pages)!=76: errors.append(f'page count {len(pages)} != 76')
if [p.get('printed_page') for p in pages]!=list(range(84,160)): errors.append('printed page sequence incomplete or unordered')
if len(M.get('page_files',[]))!=76: errors.append('manifest page_files count != 76')
for key,typ in [('blocks','all'),('questions','question'),('tables','table'),('activities','activity')]:
 actual=sum(len(p.get('blocks',[])) if typ=='all' else sum(b.get('type')==typ for b in p.get('blocks',[])) for p in pages)
 if actual!=M.get('statistics',{}).get(key): errors.append(f'manifest {key}={M.get("statistics",{}).get(key)} actual={actual}')
for p in pages:
 if p.get('theme_id')!='theme-2': errors.append(f'foreign theme content at printed {p.get("printed_page")}')
print(json.dumps({'pages':len(pages),'unique_ids':len(ids),'errors':errors,'warnings':warnings},ensure_ascii=False,indent=2))
sys.exit(1 if errors else 0)
