export class Sound {
  constructor(enabled=true){this.enabled=enabled;this.ctx=null;this.nextMusic=0;this.phrase=0;this.lastStep=0;this.scrapeAt=0;}
  unlock(){if(!this.enabled)return;try{if(!this.ctx){const Audio=window.AudioContext||window.webkitAudioContext;this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=.32;this.master.connect(this.ctx.destination);this.music=this.ctx.createGain();this.music.gain.value=.15;this.music.connect(this.master);}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{this.enabled=false;}}
  setEnabled(enabled){this.enabled=enabled;if(enabled)this.unlock();if(this.master)this.master.gain.setTargetAtTime(enabled?.32:0,this.ctx.currentTime,.1);}
  tone(freq,duration=.2,type='sine',volume=.2,delay=0,end=null,bus=null){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(bus||this.master);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};}
  noise(duration,volume,frequency=900){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const c=this.ctx;if(!this.noiseBuffer){this.noiseBuffer=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=this.noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
    const src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();src.buffer=this.noiseBuffer;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.setValueAtTime(volume,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);src.connect(filter);filter.connect(gain);gain.connect(this.master);src.start();src.stop(c.currentTime+duration);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  }
  effect(type,combo=0,event={}){
    if(type==='coin')this.tone([784,880,1046,1175,1318][combo%5],.16,'sine',.12);
    if(type==='jump'){this.noise(.09,.10,1800);this.tone(160,.16,'sine',.13,0,410);}
    if(type==='move')this.noise(.075,.07,1600);
    if(type==='slide'){this.noise(.24,.22,2200);this.tone(155,.17,'triangle',.08,0,80);}
    if(type==='land'){this.noise(.11,event.clean?.28:.15,700);this.tone(75,.12,'sine',.22,0,45);if(event.clean)this.tone(660,.25,'sine',.10,.04,990);}
    if(type==='perfect'){this.tone([523,660,784,1046][Math.floor(combo/2)%4],.23,'sine',.13);if(event.obstacle==='arch')this.noise(.17,.19,2500);}
    if(type==='dodge'){this.noise(.18,.23,3400);this.tone(920,.14,'sine',.08);}
    if(type==='flame'){this.tone(660,.4,'sine',.16);this.tone(990,.5,'sine',.09,.1);}
    if(type==='hit'||type==='practice'){this.noise(.30,.55,1300);this.tone(110,.35,'triangle',.34,0,30);}
    if(type==='smash'){this.noise(.32,.40,2200);this.tone(90,.22,'triangle',.25,0,40);}
    if(type==='boost'||type==='relic'){this.noise(.65,.35,3500);this.tone(100,.65,'sine',.27,0,490);[392,523,784,1046].forEach((n,i)=>this.tone(n,.6,'sine',.12,i*.065));}
    if(type==='ready'||type==='gate')[392,523,784,1046].forEach((n,i)=>this.tone(n,.55,'sine',.10,i*.085));
    if(type==='end')this.tone(event.won?523:196,.9,'triangle',.15,0,event.won?784:98);
    if(type==='purchase'){this.tone(523,.2,'sine',.2);this.tone(784,.4,'sine',.18,.12);}
  }
  motion(run,active){
    if(!active||!run||!this.ctx)return;
    const step=Math.floor(run.distance/2.17);
    if(step!==this.lastStep){this.lastStep=step;if(run.y<.05&&run.slide===0&&run.boost<=0){this.noise(.047,.045,650);this.tone(step%2?92:78,.055,'sine',.04);}}
    const t=this.ctx.currentTime;if(t>this.scrapeAt&&(run.slide>0||run.boost>0)){this.scrapeAt=t+.13;this.noise(.17,run.boost>0?.08:.10,run.boost>0?3400:1900);}
  }
  update(active,boost){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;this.music.gain.setTargetAtTime(active?.2:.09,t,.8);if(t<this.nextMusic)return;this.nextMusic=t+3.7;const roots=[130.81,146.83,110,164.81];const root=roots[Math.floor(this.phrase/2)%4];[1,1.5,2].forEach((f,i)=>this.tone(root*f,4.1,'sine',.12,i*.15,null,this.music));if(active){const notes=[2,3,2.5,4];for(let i=0;i<4;i++)this.tone(root*notes[(i+this.phrase)%4],.8,'sine',boost?.19:.10,.5+i*.75,null,this.music);}this.phrase++;}
  suspend(){if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
}
