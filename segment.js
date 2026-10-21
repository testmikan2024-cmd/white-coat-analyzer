'use strict';
const U2Netp=(()=>{
  let worker=null,pending=null,sequence=0;
  function shutdown(message){
    worker?.terminate();worker=null;
    if(pending){clearTimeout(pending.timer);pending.reject(new Error(message));pending=null}
  }
  function start(){
    if(worker)return;
    worker=new Worker(new URL('u2net-worker.js',document.baseURI));
    worker.onmessage=({data})=>{
      if(data.type==='status'){document.getElementById('modelStatus').textContent=data.text;return}
      if(!pending||data.id!==pending.id)return;
      const request=pending;pending=null;clearTimeout(request.timer);
      if(data.type==='error'){document.getElementById('modelStatus').textContent='u2netpの処理に失敗しました。';request.reject(new Error(data.message));return}
      document.getElementById('modelStatus').textContent='抽出：u2netp（端末内で処理）';
      request.resolve(new Float32Array(data.prediction));
    };
    worker.onerror=()=>{document.getElementById('modelStatus').textContent='u2netpを起動できませんでした。';shutdown('u2netpの起動に失敗しました。HTTPSで開き、モデルとライブラリのファイルを確認してください。')};
  }
  async function predict(canvas){
    if(pending)throw new Error('解析が終わるまでお待ちください。');
    start();const small=document.createElement('canvas');small.width=small.height=320;
    const c=small.getContext('2d',{willReadFrequently:true});c.drawImage(canvas,0,0,320,320);
    const rgba=c.getImageData(0,0,320,320).data,id=++sequence;
    const prediction=await new Promise((resolve,reject)=>{
      pending={id,resolve,reject,timer:setTimeout(()=>shutdown('解析がタイムアウトしました。写真を小さくするか、ブラウザを再読み込みしてください。'),120000)};
      try{worker.postMessage({id,rgba:rgba.buffer},[rgba.buffer])}catch(e){shutdown(e.message)}
    });
    return WhiteCoatSegmentation.maskFromPrediction(prediction,640);
  }
  window.addEventListener('pagehide',()=>shutdown('ページを閉じたため解析を中止しました。'));
  return {predict};
})();
