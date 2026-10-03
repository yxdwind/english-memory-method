#!/usr/bin/env node
/**
 * bin/sync-fixtures.mjs · v2.26
 *
 * 把 tests/samples/ 下的真实生成方案同步为 tests/fixtures/ 的 fixture。
 * 用途：让 fixture 反映"真实生成结果"，而不是手写字符串。
 *
 * 用法：
 *   node bin/sync-fixtures.mjs           # 默认：从 getty-memorialization-plan.html → fixture-success.html
 *   node bin/sync-fixtures.mjs --check   # 检查（CI 友好：有差异时退出码 1）
 *
 * 零依赖（node:fs + node:path）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

const SRC = path.join(ROOT, 'tests', 'samples', 'getty-memorialization-plan.html');
const DST = path.join(ROOT, 'tests', 'fixtures', 'fixture-success.html');

if (!fs.existsSync(SRC)){
  console.error('源文件不存在：' + SRC);
  console.error('先跑 npm run build-samples 生成。');
  process.exit(2);
}

const srcContent = fs.readFileSync(SRC, 'utf8');
const dstContent = fs.existsSync(DST) ? fs.readFileSync(DST, 'utf8') : '';

if (srcContent === dstContent){
  console.log('✅ fixture-success.html 与 getty-memorialization-plan.html 一致');
  process.exit(0);
}

if (checkOnly){
  console.error('❌ fixture-success.html 与 generate-结果不一致（' + (srcContent.length - dstContent.length) + ' byte diff）');
  console.error('   跑 `node bin/sync-fixtures.mjs` 同步。');
  process.exit(1);
}

fs.writeFileSync(DST, srcContent, 'utf8');
console.log('✅ 同步 fixture-success.html ← getty-memorialization-plan.html（' + (srcContent.length / 1024).toFixed(1) + ' KB）');
console.log('   fixture 现已反映"真实生成结果"，后续更新 samples 时只需重跑本脚本。');