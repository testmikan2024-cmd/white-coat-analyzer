'use strict';
importScripts('ort.wasm.min.js','segment-core.js');
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
ort.env.wasm.wasmPaths=new URL('./',self.location.href).href;
let sessionPromise;
async function session(){
  if(!sessionPromise)sessionPromise=(async()=>{
    postMessage({type:'status',text:'u2netpを読み込み中…（初回は時間がかかります）'});
    const response=await fetch(new URL('u2netp.onnx',self.location.href));
    if(!response.ok)throw new Error('モデルを読み込めません（HTTP '+response.status+'）。u2netp.onnxを確認してください。');
    return ort.InferenceSession.create(await response.arrayBuffer(),{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  })().catch(e=>{sessionPromise=null;throw e});
  return sessionPromise;
}
self.onmessage=async e=>{
  const {id,rgba}=e.data;let input,outputs;
  try{
    const s=await session();postMessage({type:'status',text:'u2netpで前景を抽出中…'});
    input=new ort.Tensor('float32',WhiteCoatSegmentation.inputTensor(new Uint8ClampedArray(rgba)),[1,3,320,320]);
    outputs=await s.run({[s.inputNames[0]]:input});
    const first=outputs[s.outputNames[0]];
    if(first.dims.join(',')!=='1,1,320,320')throw new Error('モデル出力の形状が対応していません。');
    const prediction=WhiteCoatSegmentation.normalize(first.data);
    postMessage({type:'result',id,prediction:prediction.buffer},[prediction.buffer]);
  }catch(e){postMessage({type:'error',id,message:e.message||String(e)})}
  finally{input?.dispose();if(outputs)for(const output of Object.values(outputs))output.dispose()}
};
