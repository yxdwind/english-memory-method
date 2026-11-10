#!/usr/bin/env node
// english-memory-method · 模板构建器（v2.34.0+ 双模板）
// src/plan/* → assets/plan-template.html + skills/ 副本
// src/library/* → assets/library-template.html + skills/ 副本
//   library 产物额外注入 00-store.js（替换 EMM_STORE_V232 锚点字面量）为主脚本前置块；
//   全链路统一 LF（v2.34.1：产物不再保留历史 CRLF，与 .gitattributes eol=lf 对齐）
//
// 用法：
//   node bin/build-template.mjs            # 生成并双写全部副本
//   node bin/build-template.mjs --check    # 只校验：重建结果与已提交产物逐字节一致（CI 友好）
//
// 退出码：0=一致/已写入；1=漂移（改了 src 忘构建，或有人直改了产物）。
// 注意：换行/回车用 NL/CRLF 常量；各源码分片内保留原始行尾（library 为 CRLF，plan 为 LF）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NL = String.fromCharCode(10);
const S = (...p) => readFileSync(join(ROOT, 'src/plan', ...p), 'utf8');
const L = (...p) => readFileSync(join(ROOT, 'src/library', ...p), 'utf8');

const PLAN_SCRIPTS = ['00-store', '01b-fsrs', '01-main', '02-sr', '03-shadow', '04-fold', '05-onboard', '06-markers'];
// v2.34.0：store 单点 —— plan 产物带锚点（version-check 扫描），library 产物剥离锚点行后注入
const STORE_SRC = S('scripts', '00-store.js');
const LIB_STORE_SRC = STORE_SRC.split('EMM_STORE_V232').join('EMM_STORE');
const outPlan = S('00-head.html')
  + '<style>' + S('css/main.css') + '</style>'
  + S('01-body.html')
  + PLAN_SCRIPTS.map(n => '<script>' + S('scripts', n + '.js') + '</script>').join(NL + NL)
  + NL + NL + S('99-tail.html');

const outLib = L('00-head.html')
  + '<style>' + L('css/main.css') + '</style>'
  + L('01-body.html')
  + '<script>' + LIB_STORE_SRC + '</script>'
  + NL + NL
  + '<script>' + L('scripts/01-lib.js') + '</script>'
  + NL + NL + L('99-tail.html');

const TARGETS = [
  { out: outPlan, dests: ['assets/plan-template.html', 'skills/english-memory-method/assets/plan-template.html'], label: 'plan-template' },
  { out: outLib, dests: ['assets/library-template.html', 'skills/english-memory-method/assets/library-template.html'], label: 'library-template' },
];

const check = process.argv.includes('--check');
let drift = 0;
for (const tgt of TARGETS) {
  const committed = readFileSync(join(ROOT, tgt.dests[0]), 'utf8');
  if (check) {
    if (tgt.out !== committed) {
      drift++;
      console.error('X 漂移：src 重建结果与 ' + tgt.dests[0] + ' 不一致（' + tgt.label + '）');
    } else {
      console.log('OK ' + tgt.label + ' 重建与产物逐字节一致（' + Buffer.byteLength(tgt.out) + ' B）');
    }
  } else {
    for (const dest of tgt.dests) {
      writeFileSync(join(ROOT, dest), tgt.out);
      console.log('OK 已生成 ' + resolve(join(ROOT, dest)) + '（' + Buffer.byteLength(tgt.out) + ' B）');
    }
  }
}
if (check) {
  if (drift > 0) {
    console.error('  请运行 node bin/build-template.mjs 重新生成（勿直改产物）');
    process.exit(1);
  }
  process.exit(0);
}
