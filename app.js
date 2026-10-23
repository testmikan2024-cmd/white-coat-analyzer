
'use strict';
const N=640, orig=document.querySelector('#original'),fruit=document.querySelector('#fruit'),white=document.querySelector('#white');
const octx=orig.getContext('2d',{willReadFrequently:true}),fctx=fruit.getContext('2d'),wctx=white.getContext('2d');
const $=id=>document.getElementById(id);let lastName='',busy=false,lastResultRatio=null;
function setStatus(s){$('status').textContent=s;if($('resultPreview').open)$('previewStatus').textContent=s}
function rgbHsv(r,g,b){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*30+180)%180}return [h,mx?Math.round(d/mx*255):0,mx]}
function imageFromFile(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(url);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('画像を開けません'))};im.src=url})}
async function processImage(im){
const {sx,sy,side}=WhiteCoatCamera.centerCrop(im.naturalWidth||im.width,im.naturalHeight||im.height);
octx.clearRect(0,0,N,N);octx.drawImage(im,sx,sy,side,side,0,0,N,N);
const mask=await U2Netp.predict(orig),data=octx.getImageData(0,0,N,N).data;
let fruitPixels=0,whitePixels=0;const outF=fctx.createImageData(N,N),outW=wctx.createImageData(N,N);
for(let p=0;p<N*N;p++){if(!mask[p])continue;const k=p*4;fruitPixels++;
for(let c=0;c<3;c++){outF.data[k+c]=data[k+c];outW.data[k+c]=data[k+c]}outF.data[k+3]=outW.data[k+3]=255;
const [,s,v]=rgbHsv(data[k],data[k+1],data[k+2]);if(s<Number($('s').value)&&v>Number($('v').value)){whitePixels++;outW.data[k]=outW.data[k+1]=outW.data[k+2]=0}}
if(!fruitPixels)throw new Error('前景を検出できませんでした。');
fctx.putImageData(outF,0,0);wctx.putImageData(outW,0,0);return {fruitPixels,whitePixels,ratio:100*whitePixels/fruitPixels};
}
function simpleName(){const now=new Date(),pad=n=>String(n).padStart(2,'0');return now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate())+'_'+pad(now.getHours())+pad(now.getMinutes())+pad(now.getSeconds())}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('white-coat-history',1);r.onupgradeneeded=()=>r.result.createObjectStore('results',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function allRows(){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('results','readonly'),r=t.objectStore('results').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);t.oncomplete=()=>db.close()})}
async function addRow(row){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('results','readwrite');t.objectStore('results').add(row);t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)})}
async function clearRows(){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('results','readwrite');t.objectStore('results').clear();t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)})}
const selectedHistory=new Set(),historyChecks=new Map();let historyRows=[],historyBusy=false;
async function deleteRows(ids){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('results','readwrite'),store=t.objectStore('results');for(const id of ids)store.delete(id);t.oncomplete=()=>{db.close();resolve()};t.onabort=()=>{db.close();reject(t.error||new Error('削除を完了できませんでした。'))}})}
function updateHistoryControls(){
 const locked=busy||historyBusy,n=selectedHistory.size,total=historyRows.length;
 $('selectedCount').textContent=n+'件選択';$('deleteSelected').disabled=locked||!n;$('clear').disabled=locked||!total;
 $('selectAll').checked=total>0&&n===total;$('selectAll').indeterminate=n>0&&n<total;$('selectAll').disabled=locked||!total;
 for(const [id,checkbox] of historyChecks){checkbox.checked=selectedHistory.has(id);checkbox.disabled=locked}
}
async function renderRows(){const rows=await allRows();historyRows=rows;const valid=new Set(rows.map(r=>r.id));for(const id of selectedHistory)if(!valid.has(id))selectedHistory.delete(id);
 $('count').textContent=rows.length+'件';$('rows').replaceChildren();historyChecks.clear();
 for(let i=0;i<rows.length;i++){const r=rows[i],tr=document.createElement('tr'),td=document.createElement('td'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.ariaLabel=(i+1)+'番 '+r.name+' を選択';checkbox.onchange=()=>{if(checkbox.checked)selectedHistory.add(r.id);else selectedHistory.delete(r.id);updateHistoryControls()};historyChecks.set(r.id,checkbox);const label=document.createElement('label'),caption=document.createElement('span');label.className='history-select';caption.textContent='選択';label.appendChild(checkbox);label.appendChild(caption);td.appendChild(label);tr.appendChild(td);
 for(const val of [i+1,r.name,r.date,r.fruitPixels,r.whitePixels,r.ratio.toFixed(2)+'%',r.method||'legacy-ellipse (試験)']){const cell=document.createElement('td');cell.textContent=val;tr.appendChild(cell)}$('rows').appendChild(tr)}updateHistoryControls()}
 $('selectAll').onchange=()=>{for(const r of historyRows){if($('selectAll').checked)selectedHistory.add(r.id);else selectedHistory.delete(r.id)}updateHistoryControls()};
 $('deleteSelected').onclick=async()=>{if(busy||historyBusy||!selectedHistory.size)return;const ids=[...selectedHistory];if(!confirm(ids.length+'件の選択した履歴を削除しますか？ この操作は取り消せません。'))return;historyBusy=true;updateHistoryControls();try{await deleteRows(ids);for(const id of ids)selectedHistory.delete(id);await renderRows();setStatus(ids.length+'件の履歴を削除しました。')}catch(e){setStatus('履歴削除エラー: '+e.message)}finally{historyBusy=false;updateHistoryControls()}};
function lockInputs(locked){for(const id of ['gallery','choosePhoto','s','v','clear','startCamera','saveImage','saveOriginal'])$(id).disabled=locked||(['saveImage','saveOriginal'].includes(id)&&!lastName);cameraController?.setBusy(locked);updateHistoryControls()}
function validateSettings(){for(const id of ['s','v']){const input=$(id),value=input.valueAsNumber;if(!input.value.trim()||!Number.isFinite(value)||value<0||value>255)throw new Error('White S / V は0〜255で指定してください。')}}
function resetResult(){closeResultPreview();lastName='';lastResultRatio=null;$('ratio').textContent='—';fctx.clearRect(0,0,N,N);wctx.clearRect(0,0,N,N);$('saveImage').disabled=true;$('saveOriginal').disabled=true}
async function analyze(im,name){resetResult();validateSettings();const result=await processImage(im),now=new Date();lastName=simpleName();lastResultRatio=result.ratio;$('ratio').textContent=result.ratio.toFixed(2)+'%';try{await addRow({name,date:now.toLocaleString('ja-JP'),fruitPixels:result.fruitPixels,whitePixels:result.whitePixels,ratio:result.ratio,whiteS:Number($('s').value),whiteV:Number($('v').value),method:'u2netp (foreground-0.5)' });await renderRows();return name+'：解析完了。'}catch(e){return name+'：解析完了。ただし履歴保存に失敗：'+e.message}}
async function handle(files){if(busy||!files.length)return;busy=true;lockInputs(true);let ok=0,errors=[];try{for(const f of files){try{setStatus('解析中: '+f.name);const im=await imageFromFile(f);setStatus(await analyze(im,f.name));ok++}catch(e){resetResult();errors.push(f.name+'：'+e.message)}}if(files.length>1||errors.length)setStatus('成功 '+ok+'件 / 失敗 '+errors.length+'件。'+errors.join(' ／ '))}finally{busy=false;lockInputs(false);if(Number.isFinite(lastResultRatio))openResultPreview()}}
const cameraController=new WhiteCoatCamera.Controller({video:$('live'),stage:$('cameraStage'),start:$('startCamera'),stop:$('stopCamera'),shoot:$('shoot'),status:$('cameraStatus'),onCapture:async canvas=>{if(busy)return;busy=true;lockInputs(true);try{setStatus(await analyze(canvas,simpleName()+'.png'))}catch(e){resetResult();setStatus(e.message)}finally{busy=false;lockInputs(false);if(Number.isFinite(lastResultRatio))openResultPreview()}}});
$('choosePhoto').onclick=()=>{$('gallery').click()};
$('gallery').addEventListener('change',e=>{handle([...e.target.files]);e.target.value=''})
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
$('csv').onclick=async()=>{try{const rows=await allRows();if(!rows.length){setStatus('保存する履歴がありません。');return}const header=['画像名','撮影日時','果実画素数','白色画素数','白色率(%)','White S','White V','抽出方式'];const q=v=>'"'+String(typeof v==='string'&&/^[=+\-@\t\r]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';const lines=[header,...rows.map(r=>[r.name,r.date,r.fruitPixels,r.whitePixels,r.ratio.toFixed(4),r.whiteS,r.whiteV,r.method||'legacy-ellipse (試験)'])];download(new Blob(['\ufeff'+lines.map(a=>a.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'履歴.csv');setStatus(rows.length+'件のCSVを一括保存しました。')}catch(e){setStatus('CSV保存エラー: '+e.message)}};
$('clear').onclick=async()=>{if(busy||historyBusy)return;if(!confirm('解析履歴をすべて削除しますか？ この操作は取り消せません。'))return;historyBusy=true;updateHistoryControls();try{await clearRows();selectedHistory.clear();await renderRows();setStatus('履歴をすべて削除しました。')}catch(e){setStatus('履歴削除エラー: '+e.message)}finally{historyBusy=false;updateHistoryControls()}};
function createResultImage(){
 if(!Number.isFinite(lastResultRatio))throw new Error('保存する解析結果がありません。');
 const c=document.createElement('canvas');c.width=N*2;c.height=N+160;const ctx=c.getContext('2d');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#edf5ef';ctx.fillRect(0,0,c.width,112);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#205c45';ctx.font='bold 44px system-ui, -apple-system, sans-serif';ctx.fillText('白色率 '+lastResultRatio.toFixed(2)+'%',N,56);
 ctx.fillStyle='#20332a';ctx.font='bold 26px system-ui, -apple-system, sans-serif';ctx.fillText('果実抽出',N/2,136);ctx.fillText('白色判定（黒）',N*1.5,136);
 ctx.drawImage(fruit,0,160);ctx.drawImage(white,N,160);return c;
}
let imageSaveBusy=false;
function imageFile(canvas,name){
 // Prepare synchronously so the native picker/share call retains the button gesture.
 const encoded=canvas.toDataURL('image/png').split(',')[1];if(!encoded)throw new Error('画像を作成できませんでした。');
 const binary=atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new File([bytes],name,{type:'image/png'});
}
async function saveCanvas(canvas,name){
 if(imageSaveBusy)return;
 imageSaveBusy=true;for(const id of ['saveImage','saveOriginal','previewSave'])$(id).disabled=true;
 try{
  const file=imageFile(canvas,name);
  if(typeof window.showSaveFilePicker==='function'){
   setStatus('保存先を選んでください。');
   const handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'PNG画像',accept:{'image/png':['.png']}}]});
   const writable=await handle.createWritable();try{await writable.write(file);await writable.close()}catch(e){try{await writable.abort()}catch{}throw e}
   setStatus('画像を保存しました。');
  }else{
   let canShare=false;try{canShare=typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]})}catch{}
   if(canShare){
    setStatus('表示された画面で画像の保存を選んでください。');
    await navigator.share({files:[file]});
    setStatus('保存画面を閉じました。');
   }else{download(file,name);setStatus('画像のダウンロードを開始しました。')}
  }
 }catch(e){if(e.name==='AbortError')setStatus('保存をキャンセルしました。');else setStatus('画像保存エラー: '+e.message)}
 finally{imageSaveBusy=false;for(const id of ['saveImage','saveOriginal','previewSave'])$(id).disabled=busy||!Number.isFinite(lastResultRatio)}
}
$('saveImage').onclick=()=>{try{return saveCanvas(createResultImage(),'結果_'+(lastName||simpleName())+'.png')}catch(e){setStatus('画像保存エラー: '+e.message)}};
renderRows().catch(e=>setStatus('履歴の読み込みに失敗しました: '+e.message));

$('saveOriginal').onclick=()=>saveCanvas(orig,'写真_'+(lastName||simpleName())+'.png');

function openResultPreview(){
 if(busy||!Number.isFinite(lastResultRatio))return;
 for(const [id,source] of [['resultFruit',fruit],['resultWhite',white]]){const ctx=$(id).getContext('2d');ctx.clearRect(0,0,N,N);ctx.drawImage(source,0,0)}
 $('previewRatio').textContent='白色率 '+lastResultRatio.toFixed(2)+'%';$('previewStatus').textContent=$('status').textContent;
 if(!$('resultPreview').open)$('resultPreview').showModal();document.body.classList.add('result-open');
}
function closeResultPreview(){if($('resultPreview').open)$('resultPreview').close();document.body.classList.remove('result-open')}
$('previewSave').onclick=()=>$('saveImage').onclick();
$('previewCamera').onclick=async()=>{if(busy)return;closeResultPreview();await cameraController.open()};
$('previewClose').onclick=()=>closeResultPreview();
$('resultPreview').addEventListener('close',()=>document.body.classList.remove('result-open'));
$('resultPreview').addEventListener('cancel',()=>document.body.classList.remove('result-open'));
