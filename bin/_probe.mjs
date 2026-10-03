import fs from 'node:fs';
const t = fs.readFileSync('tests/samples/getty-memorialization-plan.html', 'utf8');
const wc = (re) => (t.match(re) || []).length;
console.log('.sent count:', wc(/class="sent"/g));
console.log('.sent-en count:', wc(/class="sent-en"/g));
console.log('.sent-zh count:', wc(/class="sent-zh"/g));
console.log('.clz count:', wc(/class="clz"/g));
console.log('.pron count:', wc(/class="pron"/g));
console.log('h2 count:', wc(/<h2>/g));
