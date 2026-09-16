/* Guided driving practice. Uses the same car physics and first meadow jump. */
(function(root){
'use strict';
const H=typeof module!=='undefined'?require('./core.js'):root.Hillhop;
class DrivingLesson{
 constructor(guided=true){
  this.guided=guided;this.run=new H.Run(0,H.freshSave());this.run.practice=true;
  this.challenge=this.run.track.challenges[0];const c=this.challenge;
  this.run.track.challenges=[c];this.run.track.gaps=[];this.run.track.length=c.landB+1000;
  this.run.track.items=this.run.track.items.filter(i=>i.skill&&i.challengeId===c.id||i.type==='coin'&&Math.abs(i.x-c.fuelX)<180);
  this.stage='drive';this.poseMatched=false;this.brakeTime=0;this.matchTime=0;this.celebration=0;this.checkpoint=null;
  this.run.x=c.a+200;this.run.y=this.run.track.height(this.run.x)+23;
 }
 get targetAngle(){return this.run.track.slope((this.challenge.landA+this.challenge.landB)/2);}
 get frozen(){return ['jump','release','pose','failed','done'].includes(this.stage);}
 continue(){
  if(this.stage==='release'){this.run.omega=0;this.stage='pose';return true;}
  if(this.stage==='pose'&&this.poseMatched){this.run.omega=0;this.stage='land';return true;}return false;
 }
 retry(){
  if(!this.checkpoint)return false;
  Object.assign(this.run,this.checkpoint);Object.assign(this.challenge,{attempted:false,cleared:false,missed:false});
  for(const item of this.run.track.items)item.taken=false;
  this.run.events=[];this.run.result=null;this.stage='jump';this.poseMatched=false;this.brakeTime=this.matchTime=this.celebration=0;return true;
 }
 update(dt,input){
  const r=this.run,c=this.challenge;r.fuel=r.maxFuel;
  if(this.stage==='failed'||this.stage==='done')return;
  if(this.stage==='release')return;
  if(this.stage==='pose'){
   if(this.poseMatched)return;
   r.updatePose(dt,!!input.gas,!!input.brake);
   if(input.brake)this.brakeTime+=dt;
   this.matchTime=Math.abs(H.angleDiff(r.angle,this.targetAngle))<.16?this.matchTime+dt:0;
   if(this.brakeTime>=.12&&this.matchTime>=.08)this.poseMatched=true;
   return;
  }
  if(this.stage==='jump'){
   if(!input.jump)return;
   this.stage=this.guided?'rise':'land';
  }
  const before=this.stage;
  const controls=this.stage==='drive'&&this.guided?{gas:input.gas}:input;
  r.update(dt*(this.guided&&this.stage==='land'?.4:1),controls);
  if(this.stage==='drive'&&this.guided&&r.x>=c.launchA+(c.launchB-c.launchA)*.8){
   if(r.vx<470){this.stage='failed';this.failure='助走が少し足りませんでした。アクセルを押し続けて、速度をつけましょう。';return;}
   // Save only the car state; course/items remain shared with the live lesson.
   this.checkpoint=Object.fromEntries(Object.entries(r).filter(([key,value])=>!['events','track','challenge','result'].includes(key)&&(value===null||typeof value!=='object')));
   this.checkpoint.challenge=null;this.stage='jump';
  }
  if(this.stage==='rise'&&r.airAge>=.22)this.stage='release';
  const landing=r.events.find(e=>e.type==='land');
  if(landing&&before!=='celebrate'){
   if(landing.nice){this.stage='celebrate';this.celebration=0;}
   else{this.stage='failed';this.failure=r.x<c.landA?'少し手前に着地しました。ジャンプをもう少し長く押してみましょう。':r.x>c.landB?'青緑の帯を越えました。ジャンプを少し短くしてみましょう。':'着地の角度がずれました。空中はアクセルを離し、必要なときだけブレーキを短く押しましょう。';}
  }
  if(this.stage==='celebrate'){this.celebration+=dt;if(this.celebration>.85)this.stage='done';}
  if(!['celebrate','done','failed'].includes(this.stage)&&(r.result||r.x>c.landB+150)){this.stage='failed';this.failure='青緑の下りが着地点です。もう一度、黄色の帯から跳んでみましょう。';}
 }
}
root.DrivingLesson=DrivingLesson;if(typeof module!=='undefined')module.exports=DrivingLesson;
})(typeof window!=='undefined'?window:globalThis);
