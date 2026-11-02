#!/usr/bin/env node
// english-memory-method · plan-template 构建器（v2.31.0+）
// src/plan/* 按序拼装为单文件零依赖产物，双写 assets/ 与 skills/ 副本。
//
// 用法：
//   node bin/build-template.mjs            # 生成并双写两份副本
//   node bin/build-template.mjs --check    # 只校验：重建结果与已提交产物逐字节一致（CI 友好）
//
// 退出码：0=一致/已写入；1=漂移（改了 src 忘构建，或有人直改了产物）。
// 注意：换行用 NL 常量构造，避免转义在传输层被改写。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NL = String.fromCharCode(10);
const S = (...p) => readFileSync(join(ROOT, 'src/plan', ...p), 'utf8');
const SCRIPTS = ['01-main', '02-sr', '03-shadow', '04-fold', '05-onboard', '06-markers'];
const DESTS = ['assets/plan-template.html', 'skills/english-memory-method/assets/plan-template.html'];

const out = S('00-head.html')
  + '<style>' + S('css/main.css') + '</style>'
  + S('01-body.html')
  + SCRIPTS.map(n => '<script>' + S('scripts', n + '.js') + '</script>').join(NL + NL)
  + NL + NL + S('99-tail.html');

const check = process.argv.includes('--check');
const committed = readFileSync(join(ROOT, 'assets/plan-template.html'), 'utf8');
if (check) {
  if (out !== committed) {
    console.error('X 漂移：src/plan 重建结果与 assets/plan-template.html 不一致');
    console.error('  请运行 node bin/build-template.mjs 重新生成（勿直改产物）');
    process.exit(1);
  }
  console.log('OK src/plan 重建与产物逐字节一致（' + Buffer.byteLength(out) + ' B）');
  process.exit(0);
}
for (const dest of DESTS) {
  writeFileSync(join(ROOT, dest), out);
  console.log('OK 已生成 ' + resolve(join(ROOT, dest)) + '（' + Buffer.byteLength(out) + ' B）');
}
