import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync(new URL('../src/features/ar/ar-catalog.json',import.meta.url),'utf8'));
if(catalog.length!==10 || catalog.some(x=>x.status!=='published'))throw new Error('Expected ten official cards');
const destination=new URL('../../BE/src/main/resources/ar/photo-cards.tsv',import.meta.url);
const text=catalog.map(x=>[x.id,x.name,x.targetPhoto].join('\t')).join('\n')+'\n';
if(process.argv.includes('--check')) {
  if(fs.readFileSync(destination,'utf8').replace(/\r\n/g,'\n')!==text)throw new Error('Backend email manifest differs from the AR catalog');
  console.log('Email manifest matches all ten official color cards.');
} else { fs.writeFileSync(destination,text);console.log('Updated backend AR email manifest.'); }
