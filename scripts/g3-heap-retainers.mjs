import {readFileSync,writeFileSync} from 'node:fs'
const report=[]
for(const file of process.argv.slice(2)){
 const s=JSON.parse(readFileSync(file,'utf8')),nf=s.snapshot.meta.node_fields,ef=s.snapshot.meta.edge_fields,N=nf.length,E=ef.length,n=s.nodes.length/N
 const ni=Object.fromEntries(nf.map((v,i)=>[v,i])),ei=Object.fromEntries(ef.map((v,i)=>[v,i])),types=s.snapshot.meta.edge_types[0],nodeTypes=s.snapshot.meta.node_types[0]
 const offsets=new Uint32Array(n+1),parents=new Int32Array(n).fill(-1),parentEdges=new Int32Array(n).fill(-1)
 for(let i=0;i<n;i++)offsets[i+1]=offsets[i]+s.nodes[i*N+ni.edge_count]*E
 const queue=new Uint32Array(n);queue[0]=0;parents[0]=0;let tail=1
 for(let q=0;q<tail;q++){const from=queue[q];for(let p=offsets[from];p<offsets[from+1];p+=E){if(types[s.edges[p+ei.type]]==='weak')continue;const to=s.edges[p+ei.to_node]/N;if(parents[to]!==-1)continue;parents[to]=from;parentEdges[to]=p;queue[tail++]=to}}
 const describe=i=>({id:s.nodes[i*N+ni.id],name:s.strings[s.nodes[i*N+ni.name]],type:nodeTypes[s.nodes[i*N+ni.type]],selfBytes:s.nodes[i*N+ni.self_size],detachedness:s.nodes[i*N+ni.detachedness]})
 const path=i=>{const nodes=[];for(let steps=0;steps<80;steps++){const node=describe(i),p=parentEdges[i];if(p>=0){const type=types[s.edges[p+ei.type]],raw=s.edges[p+ei.name_or_index];node.via=type+':'+(['element','hidden'].includes(type)?raw:s.strings[raw])}nodes.push(node);if(i===0||parents[i]<0)break;i=parents[i]}return nodes.reverse()}
 const renderers=[],canvases=[];let detachedNatives=0
 for(let i=0;i<n;i++){
  const d=describe(i);if(d.type==='native'&&d.detachedness===2)detachedNatives++
  if(/HTMLCanvasElement/.test(d.name)&&['native','object'].includes(d.type))canvases.push(i)
  if(d.type!=='object')continue
  for(let p=offsets[i];p<offsets[i+1];p+=E)if(types[s.edges[p+ei.type]]==='property'&&s.strings[s.edges[p+ei.name_or_index]]==='isWebGLRenderer'){renderers.push(i);break}
 }
 report.push({file,nodes:n,renderers:renderers.length,canvases:canvases.length,detachedNatives,rendererPaths:renderers.slice(0,4).map(path),canvasPaths:canvases.filter(i=>describe(i).detachedness===2).slice(0,4).map(path)})
}
writeFileSync(process.argv[2]+'.retainers.json',JSON.stringify(report,null,2))
console.log(JSON.stringify(report.map(({file,nodes,renderers,canvases,detachedNatives})=>({file,nodes,renderers,canvases,detachedNatives}))))
