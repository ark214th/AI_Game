export class Sound {
  constructor(enabled=true){this.enabled=enabled;this.ctx=null;this.playing=false;this.beat=0;this.next=0;this.lastCoin=0;}
  init(){
    if(this.ctx){this.ctx.resume().catch(()=>{});return;}
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    this.ctx=new Audio();const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=this.enabled?.48:0;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=5;this.master.connect(limiter);limiter.connect(c.destination);
    this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const d=this.noise.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){last=(last+(Math.random()*2-1)*.12)/1.08;d[i]=last;}
    this.next=c.currentTime+.1;
  }
  toggle(){this.enabled=!this.enabled;if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?.48:0,this.ctx.currentTime,.03);return this.enabled;}
  tone(freq,time,duration=.14,volume=.15,type='sine',end=null){
    if(!this.ctx||!this.enabled)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);if(end)o.frequency.exponentialRampToValueAtTime(end,time+duration);
    g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(this.master);o.start(time);o.stop(time+duration+.01);
  }
  hiss(time,duration,volume,freq=1500){
    if(!this.ctx||!this.enabled)return;const c=this.ctx,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=this.noise;f.type='highpass';f.frequency.value=freq;g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+duration);s.connect(f);f.connect(g);g.connect(this.master);s.start(time);s.stop(time+duration);
  }
  event(e){
    if(!this.ctx||!this.enabled)return;const now=this.ctx.currentTime;
    if(e.type==='coin'){
      if(now-this.lastCoin<.04)return;this.lastCoin=now;
      const notes=[659.25,783.99,880,987.77,1174.66,1318.51,1567.98,1760];const f=notes[(e.chain-1)%notes.length];this.tone(f,now,.11,.14);this.tone(f*2,now,.065,.035);
    }else if(e.type==='jump'){this.tone(190,now,.16,.13,'sine',600);this.hiss(now,.1,.11,1800);}
    else if(e.type==='move')this.hiss(now,.085,.22,1100);
    else if(e.type==='slide')this.hiss(now,.23,.38,900);
    else if(e.type==='land')this.tone(105,now,.08,.13,'sine',48);
    else if(e.type==='clean'||e.type==='lesson'){[660,880,1320].forEach((n,i)=>this.tone(n,now+i*.045,.16,.11));}
    else if(e.type==='rush'){[330,440,660,880,1320].forEach((n,i)=>this.tone(n,now+i*.07,.32,.17,'triangle'));this.hiss(now,.5,.4,800);}
    else if(e.type==='smash'){this.tone(115,now,.13,.2,'triangle',40);this.hiss(now,.2,.42,500);}
    else if(e.type==='hit'){this.tone(140,now,.24,.24,'sawtooth',50);this.hiss(now,.2,.3,700);}
    else if(e.type==='magnet'){[440,660,880,1320].forEach((n,i)=>this.tone(n,now+i*.05,.16,.14));}
    else if(e.type==='dead'){[330,294,220].forEach((n,i)=>this.tone(n,now+i*.14,.35,.15,'triangle'));}
  }
  update(running,rush){
    if(!this.ctx)return;const c=this.ctx;
    if(!running||!this.enabled){this.next=c.currentTime+.1;return;}
    if(this.next<c.currentTime-.2)this.next=c.currentTime+.025;
    const step=60/(rush?132:116)/2;
    while(this.next<c.currentTime+.12){
      const t=this.next,i=this.beat++%32;
      if(i%4===0)this.tone(130,t,.17,.19,'sine',42);
      if(i%4===2){this.hiss(t,.08,.17,1800);this.tone(160,t,.07,.04,'triangle');}
      if(i%2===1)this.hiss(t,.036,.16,5500);
      const bass=[130.81,110,87.31,98][Math.floor(i/8)];if(i%4===0||i%8===5)this.tone(bass,t,.21,.09,'triangle');
      const melody=[523.25,659.25,783.99,659.25,440,659.25,880,659.25,523.25,698.46,880,698.46,587.33,783.99,987.77,783.99];
      if(i%2===0)this.tone(melody[i/2],t,.14,.04,'sine');
      this.next+=step;
    }
  }
}
