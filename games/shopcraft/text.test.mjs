// 画面に 出る 字に、小学3年生までに 習う 漢字だけを 使っているか しらべる。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {ICONS} from './icons.mjs';
import {ITEMS} from './blocks.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const G1 = '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六';
const G2 = '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話';
const G3 = '悪安暗医委意育員院飲運泳駅央横屋温化荷界開階感漢館岸起期客究急級宮球去橋業曲局銀区苦具君係軽血決研県庫湖向幸港号根祭皿仕死使始指歯詩次事持式実写者主守取酒受州拾終習集住重宿所暑助昭消商章勝乗植申身神真深進世整昔全相送想息速族他打対待代第題炭短談着注柱丁帳調追定庭笛鉄転都度投豆島湯登等動童農波配倍箱畑発反坂板皮悲美鼻筆氷表秒病品負部服福物平返勉放味命面問役薬由油有遊予羊洋葉陽様落流旅両緑礼列練路和';
const ALLOWED = new Set([...G1, ...G2, ...G3]);
const KANJI = /[㐀-鿿豈-﫿々]/g;

// JS の 文字列リテラルだけを とりだす（コメントは のぞく）
export function stringLiterals(src) {
  const out = [];
  let i = 0, buf = '', lastSig = '';
  const stack = []; // テンプレートの ${ } の ふかさ
  const startsRegex = () => !lastSig || '(,=:[!&|?{};+-*%<>~^'.includes(lastSig);
  const readString = q => {
    let s = '';
    i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') { s += src[i + 1]; i += 2; continue; }
      s += src[i++];
    }
    i++;
    return s;
  };
  const template = () => {
    // i は ` の つぎ か } の つぎ
    let s = '';
    while (i < src.length) {
      const ch = src[i];
      if (ch === '\\') { s += src[i + 1]; i += 2; continue; }
      if (ch === '`') { i++; out.push(s); return false; }
      if (ch === '$' && src[i + 1] === '{') { i += 2; out.push(s); stack.push(0); return true; }
      s += ch; i++;
    }
    out.push(s);
    return false;
  };
  while (i < src.length) {
    const ch = src[i], nx = src[i + 1];
    if (ch === '/' && nx === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '/' && nx === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? src.length : i + 2; continue; }
    if (ch === '"' || ch === "'") { out.push(readString(ch)); lastSig = 'a'; continue; }
    if (ch === '`') { i++; template(); lastSig = 'a'; continue; }
    if (ch === '/' && startsRegex()) {
      i++;
      let inClass = false;
      while (i < src.length) {
        const c = src[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) break;
        i++;
      }
      i++;
      lastSig = 'a';
      continue;
    }
    if (stack.length) {
      if (ch === '{') stack[stack.length - 1]++;
      if (ch === '}') {
        if (stack[stack.length - 1] === 0) { stack.pop(); i++; template(); lastSig = 'a'; continue; }
        stack[stack.length - 1]--;
      }
    }
    if (!/\s/.test(ch)) lastSig = /[A-Za-z0-9_$)\]]/.test(ch) ? 'a' : ch;
    i++;
  }
  void buf;
  return out;
}

function htmlText(src) {
  return src.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

test('the string scanner skips comments and regexes but keeps every string', () => {
  const s = stringLiterals("// 描画\nconst a = '店'; /* 漢字 */ const r = /[\"']/g; const t = `町${x ? `星` : '空'}道`;");
  assert.deepEqual(s, ['店', '町', '星', '空', '道']);
});

test('screen text uses only kanji taught up to grade 3', () => {
  const bad = [];
  for (const f of readdirSync(here)) {
    if (f.endsWith('.test.mjs')) continue;
    let texts;
    if (f.endsWith('.mjs')) texts = stringLiterals(readFileSync(join(here, f), 'utf8'));
    else if (f.endsWith('.html')) texts = [htmlText(readFileSync(join(here, f), 'utf8'))];
    else continue;
    for (const t of texts) for (const k of t.match(KANJI) || []) if (!ALLOWED.has(k)) bad.push(`${f}: ${k} (${t.trim().slice(0, 30)})`);
  }
  assert.deepEqual(bad, []);
});

test('item pixel art is 16x16 and every color letter has a color', () => {
  for (const [name, ic] of Object.entries(ICONS)) {
    assert.equal(ic.map.length, 16, name);
    ic.map.forEach((row, y) => assert.equal(row.length, 16, `${name} row ${y}`));
  }
  for (const it of ITEMS) {
    const ic = ICONS[it.icon];
    assert.ok(ic, it.key);
    const pal = {...ic.pal, ...(it.pal || {})};
    for (const ch of new Set(ic.map.join(''))) if (ch !== '.') assert.ok(pal[ch], `${it.key}: ${ch}`);
  }
});
