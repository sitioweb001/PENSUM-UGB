// ═══════════════════════════════════════════════════════════
// EXTENSIÓN UGB — descarga un .zip con la extensión de Chrome/Edge que
// extrae las notas del Portal del Estudiante. Se arma en el navegador (ZIP
// sin compresión, sin librerías) con los logos UGB y Dirección de Integración
// y la dirección de ESTA app ya incrustada para enviar las notas de vuelta.
// ═══════════════════════════════════════════════════════════
const _CRC_T=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function _crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=_CRC_T[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function _zipStore(files){
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  const d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)),dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate());
  files.forEach(f=>{
    const nm=enc.encode(f.name),crc=_crc32(f.data),sz=f.data.length;
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);
    lh.setUint16(10,dt,true);lh.setUint16(12,dd,true);lh.setUint32(14,crc,true);lh.setUint32(18,sz,true);lh.setUint32(22,sz,true);lh.setUint16(26,nm.length,true);lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer),nm,f.data);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);
    ch.setUint16(12,dt,true);ch.setUint16(14,dd,true);ch.setUint32(16,crc,true);ch.setUint32(20,sz,true);ch.setUint32(24,sz,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
    cen.push(new Uint8Array(ch.buffer),nm);
    off+=30+nm.length+sz;
  });
  const cenLen=cen.reduce((s,a)=>s+a.length,0);
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cenLen,true);end.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(end.buffer)],{type:'application/zip'});
}
async function descargarExtensionUGB(){
  showToast('🧩 Preparando extensión…');
  try{
    const get=async u=>{const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(u+' ('+r.status+')');return new Uint8Array(await r.arrayBuffer());};
    const enc=new TextEncoder(),dec=new TextDecoder();
    const appUrl=location.href.split('#')[0];
    const popupJs=dec.decode(await get('extension-ugb/popup.js')).replace('__APP_URL__',appUrl.replace(/\\/g,'\\\\').replace(/'/g,"\\'"));
    const R='extension-ugb-pensum/';
    const files=[
      {name:R+'manifest.json',data:await get('extension-ugb/manifest.json')},
      {name:R+'popup.js',data:enc.encode(popupJs)},
      {name:R+'popup.html',data:await get('extension-ugb/popup.html')},
      {name:R+'LEEME.txt',data:await get('extension-ugb/LEEME.txt')},
      {name:R+'logos/ugb.png',data:await get('Logotipo-horizontal-azul.png')},
      {name:R+'logos/di.jpg',data:await get('logo2.jpg')},
      {name:R+'icons/icon.png',data:await get('icon-192.png')}
    ];
    const a=document.createElement('a');
    a.href=URL.createObjectURL(_zipStore(files));a.download='extension-ugb-pensum.zip';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4e4);
    showToast('✓ Extensión descargada — descomprímela y sigue el LEEME.txt','success');
  }catch(e){console.error('[Extensión]',e);showToast('No se pudo armar la extensión (¿sin conexión?): '+e.message,'error');}
}
