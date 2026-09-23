// Each row is a readable action. Adjacent rows form a short, learnable phrase.
// h: jump, a: slide, b: sidestep, g: jump across a gap, _: open lane.
export const TYPES = {h:'hurdle',a:'arch',b:'block',g:'gap'};
export const COURSES = [
  {id:'stride',minZone:0,rows:[['hhh',1],['aaa',1],['bb_',2],['hhh',2]],spacing:26},
  {id:'weave',minZone:0,rows:[['_bb',0],['b_b',1],['bb_',2],['aaa',2]],spacing:26},
  {id:'temptation',minZone:0,risk:true,rows:[['h__',0],['a__',0],['g__',0]],spacing:27},
  {id:'choice',minZone:1,rows:[['hab',0],['ahb',0],['b_b',1],['hhh',1]],spacing:25},
  {id:'flight',minZone:1,rows:[['ggg',1],['aaa',1],['_bb',0],['hhh',0]],spacing:26},
  {id:'crossfire',minZone:2,rows:[['bb_',2],['bhb',1],['_bb',0],['aba',0],['hhh',1]],spacing:25}
];
export function phraseRows(course,start,mirror=false){return course.rows.map(([layout,route],i)=>({z:start+i*course.spacing,layout:mirror?[...layout].reverse().join(''):layout,route:mirror?2-route:route}));}
