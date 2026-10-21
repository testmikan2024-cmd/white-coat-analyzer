'use strict';
(function(root){
  function centerCrop(width,height){
    if(!(width>0&&height>0))throw new Error('画像サイズを取得できません。');
    const side=Math.min(width,height);return {sx:(width-side)/2,sy:(height-side)/2,side};
  }
  function frameSize(sw,sh,vw,vh){return Math.min(vw,vh)*Math.min(sw/vw,sh/vh)}
  class Controller{
    constructor(ui){Object.assign(this,ui);this.stream=null;this.pending=false;this.busy=false;this.generation=0;
      this.start.onclick=()=>this.open();this.stop.onclick=()=>this.close();this.shoot.onclick=()=>this.capture();
      this.video.addEventListener('resize',()=>this.layout());
      this.video.addEventListener('loadedmetadata',()=>this.layout());
      this.video.addEventListener('playing',()=>{this.layout();this.buttons()});
      this.observer=new ResizeObserver(()=>this.layout());this.observer.observe(this.stage);
      document.addEventListener('visibilitychange',()=>{if(document.hidden)this.close()});
      window.addEventListener('pagehide',()=>this.close());
    }
    buttons(){this.start.disabled=this.pending||this.busy||!!this.stream;this.stop.disabled=!this.stream&&!this.pending;this.shoot.disabled=this.busy||!this.stream||this.video.readyState<2||!this.video.videoWidth}
    setBusy(value){this.busy=value;this.buttons()}
    layout(){if(!this.video.videoWidth)return;this.stage.style.setProperty('--frame-size',frameSize(this.stage.clientWidth,this.stage.clientHeight,this.video.videoWidth,this.video.videoHeight)+'px')}
    close(message='カメラを停止しました。再開するには「カメラを起動」を押してください。'){
      ++this.generation;this.pending=false;const stream=this.stream;this.stream=null;
      if(stream)stream.getTracks().forEach(t=>t.stop());this.video.srcObject=null;this.stage.hidden=true;document.body.classList.remove('camera-open');this.status.textContent=message;this.buttons();
    }
    async open(){
      if(this.pending||this.stream||this.busy)return;
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){this.status.textContent='ライブカメラにはHTTPS（またはlocalhost）が必要です。写真選択も使えます。';return}
      const generation=++this.generation;this.pending=true;this.status.textContent='カメラへのアクセスを許可してください。';this.buttons();
      try{
        let stream;
        try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}})}
        catch(e){if(e.name!=='OverconstrainedError')throw e;stream=await navigator.mediaDevices.getUserMedia({audio:false,video:true})}
        if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return}
        this.stream=stream;this.stage.hidden=false;document.body.classList.add('camera-open');this.video.srcObject=stream;
        stream.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{if(this.stream===stream)this.close('カメラが切断されました。再度開始してください。')}));
        await this.video.play();
        if(generation!==this.generation)return;
        this.layout();this.status.textContent='円の内側に果実を配置し、中央の十字に合わせて撮影してください。';
      }catch(e){if(generation!==this.generation)return;const messages={NotAllowedError:'カメラが許可されていません。ブラウザのサイト設定で許可してください。',NotFoundError:'カメラが見つかりません。',NotReadableError:'カメラを起動できません。他のアプリで使用中か確認してください。'};this.close(messages[e.name]||'カメラ起動エラー：'+e.message)}
      finally{if(generation===this.generation){this.pending=false;this.buttons()}}
    }
    async capture(){
      if(this.shoot.disabled)return;
      this.busy=true;this.buttons();
      try{const {sx,sy,side}=centerCrop(this.video.videoWidth,this.video.videoHeight),canvas=document.createElement('canvas');canvas.width=canvas.height=640;canvas.getContext('2d').drawImage(this.video,sx,sy,side,side,0,0,640,640);this.close('撮影しました。次の撮影は「カメラを起動」を押してください。');await this.onCapture(canvas)}
      catch(e){this.status.textContent='撮影エラー：'+e.message}
      finally{this.busy=false;this.buttons()}
    }
  }
  root.WhiteCoatCamera={centerCrop,frameSize,Controller};
  if(typeof module!=='undefined')module.exports=root.WhiteCoatCamera;
})(typeof window!=='undefined'?window:globalThis);
