#!/usr/bin/env node
/**
 * bin/tag.mjs · v2.22
 *
 * 给当前 package.json 的 version 打 git annotated tag（v2.X.0）。
 *
 * 用法：
 *   node bin/tag.mjs            # 直接打 tag
 *   node bin/tag.mjs --dry-run  # 预览，不打
 *   node bin/tag.mjs --push     # 打完立即 push 到 origin（需要远程已配好）
 *
 * 零依赖（node:fs + node:child_process + node:path）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const PKG = path.join(ROOT, 'package.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const push = args.includes('--push');

if (!fs.existsSync(PKG)){
  console.error('package.json 不存在：' + PKG);
  process.exit(2);
}

const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const version = pkg.version;
const tagName = 'v' + version;

// 检查 git 仓库
function inGitRepo(){
  try { execSync('git rev-parse --is-inside-work-tree', { cwd: ROOT, stdio: 'pipe' }); return true; }
  catch(e){ return false; }
}
if (!inGitRepo()){
  console.error('当前目录不是 git 仓库：' + ROOT);
  process.exit(2);
}

// 检查 tag 是否已存在
function tagExists(name){
  try { execSync('git rev-parse --verify --quiet refs/tags/' + name, { cwd: ROOT, stdio: 'pipe' }); return true; }
  catch(e){ return false; }
}

// 当前 commit 短 SHA
function shortSha(){
  try { return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch(e){ return '(unknown)'; }
}

// 当前 HEAD 距 package.json 最近一次变更的 commit 数（粗略判断是否新版本）
function commitsAhead(){
  try {
    // 如果 tag 存在，算 commit 数；否则返回 -1（"首次打 tag"）
    if (!tagExists(tagName)) return -1;
    const out = execSync('git rev-list --count ' + tagName + '..HEAD', { cwd: ROOT, encoding: 'utf8' });
    return parseInt(out.trim(), 10);
  } catch(e){ return -1; }
}

console.log('english-memory-method · tag helper');
console.log('  package.json: ' + PKG);
console.log('  version:      ' + version);
console.log('  tag name:     ' + tagName);
console.log('  HEAD:         ' + shortSha());

if (tagExists(tagName)){
  console.log('  状态:         ✅ tag 已存在，跳过打 tag');
  if (dryRun) console.log('  --dry-run 模式：不推送');
  else if (push){
    try { execSync('git push origin ' + tagName, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' }); console.log('  ✅ pushed ' + tagName); }
    catch(e){ console.error('  ❌ push 失败：' + e.message); process.exit(1); }
  }
  process.exit(0);
}

const ahead = commitsAhead();
console.log('  状态:         首次打 tag' + (ahead >= 0 ? '（HEAD 距上次 tag +' + ahead + ' commits）' : ''));

if (dryRun){
  console.log('\n--dry-run：不实际执行。完整命令：');
  console.log('  git tag -a ' + tagName + ' -m "english-memory-method v' + version + '"');
  if (push) console.log('  git push origin ' + tagName);
  process.exit(0);
}

const msg = 'english-memory-method v' + version + '\n\n自动生成（bin/tag.mjs）。\n参考 CHANGELOG.md 了解本次变更。';
try {
  execSync('git tag -a ' + tagName + ' -m ' + JSON.stringify(msg), { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
  console.log('  ✅ 已创建 tag: ' + tagName);
  if (push){
    try { execSync('git push origin ' + tagName, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' }); console.log('  ✅ pushed ' + tagName); }
    catch(e){ console.error('  ❌ push 失败：' + e.message); process.exit(1); }
  }
} catch(e){
  console.error('  ❌ git tag 失败：' + e.message);
  process.exit(1);
}

console.log('\n下次升级时：');
console.log('  1. 改 package.json + CHANGELOG.md + 模板版本号');
console.log('  2. 跑 npm run version-check && npm test');
console.log('  3. 跑 node bin/tag.mjs --push（自动打 tag + 推送）');