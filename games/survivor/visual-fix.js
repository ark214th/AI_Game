(() => {
  'use strict';

  const proto = CanvasRenderingContext2D.prototype;
  const native = {
    arc: proto.arc, fill: proto.fill, stroke: proto.stroke, fillText: proto.fillText,
    beginPath: proto.beginPath, moveTo: proto.moveTo, lineTo: proto.lineTo,
    quadraticCurveTo: proto.quadraticCurveTo, closePath: proto.closePath,
    save: proto.save, restore: proto.restore
  };

  let hiddenCircle = null;

  proto.arc = function(x, y, r, start, end, ccw) {
    const canvas = this.canvas;
    const isEnemy = x === 0 && y === 0 && r >= 12 && r <= 85;
    const isPlayer = canvas && Math.abs(x - canvas.clientWidth / 2) < 4 && Math.abs(y - canvas.clientHeight / 2) < 4 && r >= 17 && r <= 20;
    hiddenCircle = (isEnemy || isPlayer) ? { kind:isPlayer?'player':'enemy', r, color:this.fillStyle } : null;
    return native.arc.call(this, x, y, r, start, end, ccw);
  };

  proto.fill = function(...args) {
    if (hiddenCircle) return;
    return native.fill.apply(this, args);
  };

  proto.stroke = function(...args) {
    if (hiddenCircle) {
      if (hiddenCircle.kind === 'player') drawHero(this);
      return;
    }
    return native.stroke.apply(this, args);
  };

  proto.fillText = function(text, x, y, maxWidth) {
    if (hiddenCircle && hiddenCircle.kind === 'enemy' && x === 0 && y === 1 && ['🦇','💀','👹','👾','•'].includes(text)) {
      drawEnemy(this, text, hiddenCircle.r, hiddenCircle.color);
      hiddenCircle = null;
      return;
    }
    return maxWidth === undefined ? native.fillText.call(this,text,x,y) : native.fillText.call(this,text,x,y,maxWidth);
  };

  function drawEnemy(ctx, icon, r, color) {
    native.save.call(ctx);
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(10,8,30,.85)';
    ctx.lineWidth = 3;
    native.beginPath.call(ctx);
    if (icon === '🦇') {
      native.moveTo.call(ctx,0,-7);native.lineTo.call(ctx,-10,-13);native.lineTo.call(ctx,-r-8,0);native.lineTo.call(ctx,-10,8);native.lineTo.call(ctx,0,12);native.lineTo.call(ctx,10,8);native.lineTo.call(ctx,r+8,0);native.lineTo.call(ctx,10,-13);native.closePath.call(ctx);
    } else if (icon === '💀') {
      native.arc.call(ctx,0,-4,r*.76,0,Math.PI*2);native.fill.call(ctx);native.stroke.call(ctx);ctx.fillRect(-8,8,16,11);native.restore.call(ctx);return;
    } else if (icon === '👹') {
      native.arc.call(ctx,0,0,r,0,Math.PI*2);
    } else if (icon === '👾') {
      native.arc.call(ctx,0,0,r,0,Math.PI*2);
    } else {
      native.moveTo.call(ctx,-r,r*.55);native.quadraticCurveTo.call(ctx,-r*1.05,-r*.65,0,-r);native.quadraticCurveTo.call(ctx,r*1.05,-r*.65,r,r*.55);native.quadraticCurveTo.call(ctx,0,r*1.18,-r,r*.55);
    }
    native.fill.call(ctx);native.stroke.call(ctx);native.restore.call(ctx);
  }

  function drawHero(ctx) {
    hiddenCircle = null;
    const canvas = ctx.canvas, x = canvas.clientWidth/2, y = canvas.clientHeight/2;
    native.save.call(ctx);ctx.translate(x,y);
    ctx.shadowColor='#8aa1ff';ctx.shadowBlur=22;ctx.fillStyle='#e9e8ff';ctx.strokeStyle='#25234b';ctx.lineWidth=3;
    native.beginPath.call(ctx);native.arc.call(ctx,0,0,18,0,Math.PI*2);native.fill.call(ctx);native.stroke.call(ctx);ctx.shadowBlur=0;
    ctx.fillStyle='#5f54be';native.beginPath.call(ctx);native.moveTo.call(ctx,-15,12);native.quadraticCurveTo.call(ctx,0,29,15,12);native.lineTo.call(ctx,10,-2);native.lineTo.call(ctx,-10,-2);native.closePath.call(ctx);native.fill.call(ctx);
    ctx.fillStyle='#24233b';native.beginPath.call(ctx);native.arc.call(ctx,-6,-3,2.5,0,Math.PI*2);native.arc.call(ctx,6,-3,2.5,0,Math.PI*2);native.fill.call(ctx);
    ctx.fillStyle='#ffd769';native.beginPath.call(ctx);native.moveTo.call(ctx,0,-29);native.lineTo.call(ctx,5,-19);native.lineTo.call(ctx,15,-17);native.lineTo.call(ctx,7,-10);native.lineTo.call(ctx,9,0);native.lineTo.call(ctx,0,-5);native.lineTo.call(ctx,-9,0);native.lineTo.call(ctx,-7,-10);native.lineTo.call(ctx,-15,-17);native.lineTo.call(ctx,-5,-19);native.closePath.call(ctx);native.fill.call(ctx);
    native.restore.call(ctx);
  }
})();