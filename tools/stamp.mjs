// トップページの右下に出す「更新の番号と時刻」を version.json に書く。
// コミットの直前に実行する： node tools/stamp.mjs
// 番号は「これから作るコミットが、通算で何個めか」。git log を新しい順に数えれば照らし合わせられる。
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const count = +execSync('git rev-list --count HEAD', { cwd: root, encoding: 'utf8' }).trim();
const v = { rev: count + 1, time: new Date().toISOString() };
writeFileSync(new URL('version.json', root), JSON.stringify(v) + '\n');
console.log(`version.json: #${v.rev} ${v.time}`);
