// Tema 2'ye özel pedagojik bütünlük denetimi — başka temaların verilerine dokunmaz.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const base='data/grade-11/';
const flow=n=>load(base+'presentation/theme-2/'+n+'-flow.json');
const bank=n=>load(base+'source/teacher-book/theme-2/answer-bank/part-'+n+'.json');
const entry=(part,id)=>{const v=bank(part).entries.find(x=>x.question_id===id); assert.ok(v,id+' missing');return v;};
const step=(f,id)=>{const v=f.steps.find(x=>x.id===id); assert.ok(v,id+' missing');return v;};
const lessonNames=['tema-girisi','ogulla-bulusma','eski-istanbul','orhun-abideleri','divanu-lugatit-turk','konusma','asik-atismasi','yazma','degerlendirme'];
const lessons=lessonNames.map(flow);
assert.equal(lessons.reduce((n,f)=>n+f.steps.length,0),203,'Theme 2 step count');
const g=entry('03-pages-100-104','T2-P102-GRAM01');
const values=Object.values(g.answer_sections).flat();
assert.equal(values.filter(x=>x.includes('düşündürtmez')).length,2);
assert.ok(!values.some(x=>x.includes('düşündürmez')));
const source=JSON.stringify(load('data/book/grade-11/themes/theme-2/pages/p102.json'));
assert.ok(source.includes('düşündürtmez, söyletirdi'),'P102 book spelling');
assert.ok(!entry('03-pages-100-104','T2-P104-GRAM03').answer_sections.oldurgan.join('').includes("'püskürmek' geçişsizdir"));
const og=flow('ogulla-bulusma');
assert.ok(!step(og,'s90-95-reading').content.items.slice(0,3).some(x=>/Çordon|Nazifkan|istasyon|vedalaş|oğul özlemi/i.test(x)));
for(const id of ['s102-103-gram1','s103-gram2','s104-gram3'])assert.ok(step(og,id).thinking.includes('kaynak cümlede'));
const dq=step(flow('degerlendirme'),'s157-q3');
assert.ok(!/sözlü kültürden yazılı kültüre geçiş/i.test(dq.content.lead));
const aq=step(flow('asik-atismasi'),'s142-q1');
assert.match(aq.prompt,/görselden/);assert.match(aq.prompt,/tahmin/);
const card=entry('04-pages-105-112','T2-P111-PERF01');
assert.match(card.guidance,/metinde geçmiyor = yanlış/);
const matrix=entry('08-pages-129-135','T2-P132-PERF01');
assert.ok(matrix.answer_sections['Öğretmen için tek kaynaklı karşılaştırma örneği — dil']);
assert.match(JSON.stringify(matrix.answer_sections),/president.az/);
const museum=entry('11-pages-148-154','T2-P149-PERF01');
assert.ok(museum.answer_sections.some(x=>x.includes('sanalmuze.gov.tr')));
assert.match(entry('10-pages-142-147','T2-P143-Q04').answer_sections['Âşık Şiirinin Dilinden Gözlenebilenler'],/KAYNAK BEKLENİYOR/);
for(const [f,id] of [[flow('konusma'),'s135-reference'],[flow('yazma'),'s153-rubric']]){
  const x=step(f,id);
  const criteria=x.content.sections.filter(z=>/· 20 puan$/.test(z.title));
  assert.equal(criteria.length,5);
  for(const c of criteria){for(const n of ['1–5','6–10','11–15','16–20'])assert.ok(c.body.includes(n),c.title+' lacks '+n);}
  assert.ok(x.content.sources?.length>0,'rubric original DOCX links removed');
}
console.log('Tema 2 pedagojik kontrolleri geçti: 203 adım, fiil, yönergeler, kaynak sınırları ve 2×5 rubrik ölçütü.');
