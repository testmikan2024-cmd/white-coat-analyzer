'use strict';
// U2Netp input normalization follows rembg's model contract. Resize uses Canvas.
(function(root){
  const SIZE=320,MEAN=[.485,.456,.406],STD=[.229,.224,.225];
  function inputTensor(rgba){
    if(rgba.length!==SIZE*SIZE*4)throw new Error('モデル入力の画像サイズが不正です。');
    let max=1;for(let i=0;i<rgba.length;i+=4)for(let c=0;c<3;c++)max=Math.max(max,rgba[i+c]);
    const n=SIZE*SIZE,out=new Float32Array(n*3);
    for(let p=0;p<n;p++)for(let c=0;c<3;c++)out[c*n+p]=(rgba[p*4+c]/max-MEAN[c])/STD[c];
    return out;
  }
  function normalize(data){
    if(data.length!==SIZE*SIZE)throw new Error('モデル出力の画像サイズが不正です。');
    let min=Infinity,max=-Infinity;for(const x of data){if(!Number.isFinite(x))throw new Error('モデルが不正な値を返しました。');min=Math.min(min,x);max=Math.max(max,x)}
    if(max-min<1e-6)throw new Error('前景を検出できませんでした。背景や照明を変えてください。');
    const out=new Float32Array(data.length);for(let i=0;i<data.length;i++)out[i]=(data[i]-min)/(max-min);return out;
  }
  function maskFromPrediction(pred,n=640){
    const raw=new Uint8Array(n*n);
    // Bilinear upsampling followed by a fixed 0.5 foreground threshold.
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const fx=Math.max(0,Math.min(SIZE-1,(x+.5)*SIZE/n-.5)),fy=Math.max(0,Math.min(SIZE-1,(y+.5)*SIZE/n-.5));
      const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(x0+1,SIZE-1),y1=Math.min(y0+1,SIZE-1),dx=fx-x0,dy=fy-y0;
      const v=(1-dy)*((1-dx)*pred[y0*SIZE+x0]+dx*pred[y0*SIZE+x1])+dy*((1-dx)*pred[y1*SIZE+x0]+dx*pred[y1*SIZE+x1]);
      raw[y*n+x]=v>=.5?1:0;
    }
    // Keep the most substantial central component. Connected hand pixels remain.
    const seen=new Uint8Array(n*n),queue=new Int32Array(n*n);let best=[],score=-1;
    for(let p=0;p<raw.length;p++){
      if(!raw[p]||seen[p])continue;let head=0,tail=1,sx=0,sy=0;queue[0]=p;seen[p]=1;
      while(head<tail){const q=queue[head++],x=q%n,y=(q/n)|0;sx+=x;sy+=y;
        for(const nb of [x>0?q-1:-1,x<n-1?q+1:-1,y>0?q-n:-1,y<n-1?q+n:-1])if(nb>=0&&raw[nb]&&!seen[nb]){seen[nb]=1;queue[tail++]=nb}
      }
      if(tail<350)continue;
      const distance=Math.hypot(sx/tail-n/2,sy/tail-n/2)/n,s=tail*Math.max(.1,1-distance);
      if(s>score){score=s;best=Array.from(queue.subarray(0,tail))}
    }
    if(!best.length)throw new Error('前景候補が見つかりません。果実を中央に大きく写してください。');
    const mask=new Uint8Array(n*n);for(const p of best)mask[p]=1;
    // Solid fruit should have no enclosed background holes (e.g. white coat).
    const outside=new Uint8Array(n*n);let head=0,tail=0;
    function edge(p){if(!mask[p]&&!outside[p]){outside[p]=1;queue[tail++]=p}}
    for(let i=0;i<n;i++){edge(i);edge((n-1)*n+i);edge(i*n);edge(i*n+n-1)}
    while(head<tail){const p=queue[head++],x=p%n,y=(p/n)|0;for(const nb of [x>0?p-1:-1,x<n-1?p+1:-1,y>0?p-n:-1,y<n-1?p+n:-1])if(nb>=0)edge(nb)}
    for(let p=0;p<mask.length;p++)if(!outside[p])mask[p]=1;
    return mask;
  }
  root.WhiteCoatSegmentation={SIZE,inputTensor,normalize,maskFromPrediction};
  if(typeof module!=='undefined')module.exports=root.WhiteCoatSegmentation;
})(typeof self!=='undefined'?self:globalThis);
