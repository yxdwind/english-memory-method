#!/usr/bin/env node
// english-memory-method · 自动内容校验（v2.17.0+）
// 实现 SKILL.md §"内容校验（生成后强制执行）" 列出的 6 条硬规则
//
// Usage:
//     node bin/verify-plan.mjs <file.html> [--source <原文文本|文件>] [--no-color]
//     node bin/verify-plan.mjs <dir>                           # 扫目录中所有 *-memorization-plan.html
//     node bin/verify-plan.mjs --help
//
// 退出码：
//   0 = 全部通过（无 error，可有 warning）
//   1 = 有 error 级失败
//   2 = 参数错误

import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { join, basename, dirname, resolve, relative as rel } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RULE_BOOK = [
  { id: 1, name: "逐句完整性", severity: "error",   hint: "句数与原文必须一致；每句去首尾空白后逐字符一致" },
  { id: 2, name: "标注精度",   severity: "warning", hint: "连读/弱读/flap t/击穿按'存疑不标'复核；音标抽查 ≥3 处" },
  { id: 3, name: "宫殿对齐",   severity: "error",   hint: "data-sents 覆盖齐全；站号 1..M 连续；锚词与钩子链同句" },
  { id: 4, name: "钩子链对齐", severity: "error",   hint: "每段句钩数==段内句数；句钩之间有逻辑桥；每钩挂锚词" },
  { id: 5, name: "挖空可核对", severity: "error",   hint: "每段挖 2~5 空；______ 个数==答案数；答案真在原句中" },
  { id: 6, name: "词汇与金句溯源", severity: "error", hint: "专业词表每词 / 金句句型库每条原文摘录都必须能在原文中找到" },
];

// ── HTML 工具 ─────────────────────────────────────────────────────────────
function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function stripTags(html) {
  return decode(html.replace(/<[^>]+>/g, ""));
}
function norm(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}
function matches(re, src, group = 1) {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = r.exec(src)) !== null) out.push(group == null ? m : m[group]);
  return out;
}
function matchOne(re, src) {
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags.replace("g", "") : re.flags);
  const m = r.exec(src);
  return m ? m[1] : null;
}

// 给定 `<tag...>` 的起始 index，返回对应 `</tag>` 的起始 index（-1 表示不平衡）
// 关键：必须严格按文档顺序处理 open/close，否则 exec 自动推进 lastIndex 会"吞掉"未处理的匹配
function findBalancedClose(html, startIdx, tag) {
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
  const closeRe = new RegExp(`</${tag}\\s*>`, "gi");
  let pos = startIdx + 1;
  let depth = 1;
  let lastCloseIdx = -1;
  while (depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const nextOpen = openRe.exec(html); // 可能为 null
    const nextClose = closeRe.exec(html); // 可能为 null
    if (!nextClose) return -1;
    // 选择在文档中更靠前的那个事件
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      lastCloseIdx = nextClose.index;
      pos = nextClose.index + nextClose[0].length;
    }
  }
  return lastCloseIdx;
}

// ── 抽取器（处理嵌套）─────────────────────────────────────────────────────
function extractSentences(html) {
  return matches(/<div class="sent-en"[^>]*>([\s\S]*?)<\/div>/g, html).map(s => norm(stripTags(s)));
}
function extractSentCount(html) { return extractSentences(html).length; }
function extractSentZh(html) {
  return matches(/<div class="sent-zh"[^>]*>([\s\S]*?)<\/div>/g, html).map(s => norm(stripTags(s)));
}

function extractPalaceStops(html) {
  // palace-stop 内有 <div class="st-name"> 等嵌套，必须按 div 深度匹配
  const out = [];
  const startRe = /<div class="palace-stop"([^>]*)>/g;
  let m;
  while ((m = startRe.exec(html)) !== null) {
    const attrs = m[1] || "";
    const closeStart = findBalancedClose(html, m.index, "div");
    if (closeStart < 0) continue;
    const body = html.substring(m.index + m[0].length, closeStart);
    startRe.lastIndex = closeStart + "</div>".length;
    const dataSents = matchOne(/data-sents="([^"]+)"/, attrs);
    const noText = matchOne(/<span class="st-no"[^>]*>([^<]+)<\/span>/, body) || "";
    const noNumMatch = noText.match(/\d+/);
    const anchor = matchOne(/<span class="st-anchor"[^>]*>([\s\S]*?)<\/span>/, body);
    const hook = matchOne(/<div class="st-hook"[^>]*>([\s\S]*?)<\/div>|<span class="st-hook"[^>]*>([\s\S]*?)<\/span>/, body);
    out.push({
      dataSents: dataSents || null,
      noText: noText.trim(),
      noNumber: noNumMatch ? +noNumMatch[0] : null,
      hookText: hook ? norm(stripTags(hook)) : "",
      anchor: anchor ? norm(stripTags(anchor)) : "",
    });
  }
  return out;
}

function extractHookChains(html) {
  const out = [];
  const startRe = /<div class="hook-chain"[^>]*>/g;
  let m;
  while ((m = startRe.exec(html)) !== null) {
    const closeStart = findBalancedClose(html, m.index, "div");
    if (closeStart < 0) continue;
    const body = html.substring(m.index + m[0].length, closeStart);
    startRe.lastIndex = closeStart + "</div>".length;
    const paraHook = matchOne(/<span class="para-hook"[^>]*>([\s\S]*?)<\/span>/, body);
    const segs = matches(/<span class="seg"[^>]*>([\s\S]*?)<\/span>/g, body).map(s => norm(stripTags(s)));
    const bridges = matches(/<span class="bridge"[^>]*>([\s\S]*?)<\/span>/g, body).map(s => norm(stripTags(s)));
    const anchors = matches(/<span class="anchor"[^>]*>([\s\S]*?)<\/span>/g, body).map(s => norm(stripTags(s)));
    out.push({ paraHook: paraHook ? norm(stripTags(paraHook)) : null, segs, bridges, anchors });
  }
  return out;
}

function extractClozeBlocks(html) {
  const out = [];
  const reDetails = /<details class="answer-toggle"[^>]*>/g;
  let d;
  while ((d = reDetails.exec(html)) !== null) {
    const closeStart = findBalancedClose(html, d.index, "details");
    if (closeStart < 0) continue;
    const detailsBody = html.substring(d.index + d[0].length, closeStart);
    reDetails.lastIndex = closeStart + "</details>".length;
    const answerDiv = matchOne(/<div class="answer"[^>]*>([\s\S]*?)<\/div>/, detailsBody);
    if (!answerDiv) continue;
    const answerText = norm(stripTags(answerDiv)).replace(/^答案[:：]?\s*/, "");
    const answers = answerText.split(/[\/、，,]/).map(s => s.trim()).filter(Boolean);
    // 上溯最多 5 个 <p> 找含 ___ 的最近段落
    const upTo = html.substring(0, d.index);
    let cursor = upTo.length;
    let pBlock = "";
    for (let hop = 0; hop < 5; hop++) {
      const lastP = upTo.lastIndexOf("<p", cursor);
      if (lastP === -1) break;
      const nextClose = upTo.indexOf("</p>", lastP);
      if (nextClose === -1) break;
      const candidate = upTo.substring(lastP, nextClose + 4);
      if (/_{3,}/.test(candidate)) { pBlock = candidate; break; }
      cursor = lastP;
    }
    const blanks = (pBlock.match(/_{3,}/g) || []).length;
    // 上下文原句：合并挖空段之前所有 .sent-en（plan.html 中挖空对应的原文就在它之前的 .sent 块）
    const allSentEn = matches(/<div class="sent-en"[^>]*>([\s\S]*?)<\/div>/g, upTo).map(s => norm(stripTags(s)));
    const sentEn = allSentEn.join(" ");
    out.push({ blanksCount: blanks, answersCount: answers.length, answers, sentEn });
  }
  return out;
}

function extractRowsFromTableWithHeader(html, headerRe, mapRow) {
  const out = [];
  const tableStartRe = /<table[^>]*>/g;
  let m;
  while ((m = tableStartRe.exec(html)) !== null) {
    const closeStart = findBalancedClose(html, m.index, "table");
    if (closeStart < 0) continue;
    const table = html.substring(m.index, closeStart + "</table>".length);
    tableStartRe.lastIndex = closeStart + "</table>".length;
    if (!headerRe.test(table)) continue;
    const rows = matches(/<tr[\s\S]*?>([\s\S]*?)<\/tr>/g, table);
    for (let i = 1; i < rows.length; i++) {
      const cells = matches(/<td[^>]*>([\s\S]*?)<\/td>/g, rows[i]).map(s => norm(stripTags(s)));
      if (cells[0]) out.push(mapRow(cells));
    }
  }
  return out;
}
function extractTermRows(html) {
  return extractRowsFromTableWithHeader(html, /<th[^>]*>术语<\/th>/, cells => ({ term: cells[0], ipa: cells[2] || "", cn: cells[3] || "" }));
}
function extractPatternRows(html) {
  // 注意：表头是"句型"，h2 是"金句句型库"——避免误判
  return extractRowsFromTableWithHeader(html, /<th[^>]*>句型<\/th>/, cells => ({ pattern: cells[0] }));
}
function extractPronBlocks(html) {
  return matches(/<div class="pron"[^>]*>([\s\S]*?)<\/div>/g, html).map(s => stripTags(s));
}
function extractTitle(html) {
  const h1 = matchOne(/<h1[^>]*>([\s\S]*?)<\/h1>/, html);
  return h1 ? norm(stripTags(h1)) : "(无标题)";
}
function extractVersionMarkers(html) {
  const ids = ["EMM_LIBRARY_V217", "EMM_V215_STABLE", "EMM_MOBILE_V216", "EMM_DRILL_CLOZE_V214", "EMM_TODAY_V213"];
  return ids.map(id => ({ id, count: (html.match(new RegExp(id, "g")) || []).length }));
}

// ── 6 条规则 ──────────────────────────────────────────────────────────────
function rule1_sentenceFidelity(html, sourceText) {
  const sentences = extractSentences(html);
  if (!sourceText) {
    return { id: 1, name: "逐句完整性", status: "skip",
      msg: `未提供原文（--source 缺省），仅做基础结构检查；方案共 ${sentences.length} 句`, items: [] };
  }
  const sourceLines = sourceText.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const items = [];
  if (sentences.length !== sourceLines.length) {
    items.push({ ok: false, msg: `句数不一致：方案 ${sentences.length} 句 vs 原文 ${sourceLines.length} 句` });
  }
  const minLen = Math.min(sentences.length, sourceLines.length);
  let mismatches = 0;
  for (let i = 0; i < minLen; i++) {
    const plan = sentences[i], src = sourceLines[i];
    if (plan !== src) {
      mismatches++;
      let diffAt = -1;
      for (let j = 0; j < Math.max(plan.length, src.length); j++) {
        if (plan[j] !== src[j]) { diffAt = j; break; }
      }
      items.push({ ok: false, msg: `第 ${i + 1} 句不一致（字符 ${diffAt} 起；长度差 ${plan.length - src.length}）`, detail: { plan, src, diffAt } });
    }
  }
  return {
    id: 1, name: "逐句完整性",
    status: mismatches === 0 ? "pass" : "fail",
    msg: `方案 ${sentences.length} 句 vs 原文 ${sourceLines.length} 句；${mismatches === 0 ? "逐字符一致 ✓" : `${mismatches} 处不一致`}`,
    items,
  };
}

function rule2_annotationAccuracy(html) {
  const prons = extractPronBlocks(html);
  const items = [];
  if (prons.length === 0) {
    return { id: 2, name: "标注精度", status: "skip", msg: "未发现 .pron 块", items };
  }
  const labelCounts = {
    连读: (html.match(/<b[^>]*style="color:#d97706"[^>]*>⌒<\/b>/g) || []).length,
    弱读: (html.match(/<span class="wk"/g) || []).length,
    flap: (html.match(/<span class="ft"/g) || []).length,
    h击穿: (html.match(/<span class="hk"/g) || []).length,
    专业词: (html.match(/<span class="term"/g) || []).length,
  };
  const oversized = [];
  prons.forEach((p, i) => {
    // 按 `·` 分隔符计数注解条数（每条注解用 `·` 分隔"片段 音标"和"现象"）
    const sepCount = (p.match(/·/g) || []).length;
    if (sepCount > 6) oversized.push({ i, count: sepCount });
  });
  if (oversized.length) items.push({ ok: false, msg: `${oversized.length} 个 .pron 块 ` + `·` + ` 分隔符 ${'>'} 6（SKILL 规范每句 ≤6 条）`, detail: oversized.slice(0, 5) });
  const ipaSuspicious = [];
  prons.forEach((p, i) => {
    const ph = p.match(/\/([^/\n]+)\//g) || [];
    ph.forEach(s => {
      if (/[\u4e00-\u9fff]/.test(s)) ipaSuspicious.push({ i, snippet: s });
    });
  });
  if (ipaSuspicious.length) items.push({ ok: false, msg: `${ipaSuspicious.length} 处音标片段疑似含中文`, detail: ipaSuspicious.slice(0, 5) });
  return {
    id: 2, name: "标注精度",
    status: items.length === 0 ? "pass" : "warn",
    msg: `连读=${labelCounts.连读} 弱读=${labelCounts.弱读} flap=${labelCounts.flap} h击穿=${labelCounts.h击穿} 专业词=${labelCounts.专业词}；超限=${oversized.length} 可疑=${ipaSuspicious.length}`,
    items,
  };
}

function rule3_palaceAlignment(html) {
  const stops = extractPalaceStops(html);
  const totalSents = extractSentCount(html);
  const items = [];
  if (stops.length === 0) {
    return { id: 3, name: "宫殿对齐", status: "skip", msg: "本篇未启用记忆宫殿（无 .palace-stop）", items: [] };
  }
  const badNos = stops.filter((s, i) => s.noNumber !== i + 1);
  if (badNos.length) items.push({ ok: false, msg: `${badNos.length} 个站点站号不连续（期望 1..${stops.length}）`, detail: badNos.slice(0, 5) });
  const withData = stops.filter(s => s.dataSents);
  if (withData.length === stops.length) {
    const seen = new Set();
    const dups = [];
    stops.forEach(s => {
      (s.dataSents || "").split(",").map(x => +x).forEach(ix => {
        if (seen.has(ix)) dups.push(ix);
        else seen.add(ix);
      });
    });
    if (dups.length) items.push({ ok: false, msg: `data-sents 重复句号：${[...new Set(dups)].join(",")}`, detail: { dups } });
    const missing = [];
    for (let i = 1; i <= totalSents; i++) if (!seen.has(i)) missing.push(i);
    if (missing.length) items.push({ ok: false, msg: `${missing.length} 句未被任何站点覆盖（缺句号 ${missing.join(",")}）`, detail: { missing } });
  } else {
    if (stops.length !== totalSents) items.push({ ok: false, msg: `站数 ${stops.length} ≠ 句数 ${totalSents}（且未标 data-sents 兜底）` });
  }
  // 锚词必须能在所辖句中找到
  const sentences = extractSentences(html);
  stops.forEach((s, i) => {
    const sentIndices = s.dataSents ? s.dataSents.split(",").map(x => +x - 1) : [i];
    const anchorWords = s.anchor.replace(/[\[\]（）()]/g, "").split(/\s+/).filter(Boolean);
    if (!anchorWords.length) return;
    const covered = sentIndices.some(ix => {
      const txt = sentences[ix] || "";
      return anchorWords.some(w => w.length > 1 && txt.toLowerCase().includes(w.toLowerCase()));
    });
    if (!covered) items.push({ ok: false, msg: `站 ${s.noNumber} 锚词「${anchorWords.join(", ")}」在所辖句中查不到` });
  });
  return {
    id: 3, name: "宫殿对齐",
    status: items.length === 0 ? "pass" : "fail",
    msg: `站数 ${stops.length} / 句数 ${totalSents}${withData.length === stops.length ? "（data-sents 全标）" : ""}`,
    items,
  };
}

function rule4_hookChainAlignment(html) {
  const chains = extractHookChains(html);
  const sentences = extractSentences(html);
  const items = [];
  if (chains.length === 0) {
    return { id: 4, name: "钩子链对齐", status: "skip", msg: "未发现 .hook-chain", items: [] };
  }
  const totalSegs = chains.reduce((acc, c) => acc + c.segs.length, 0);
  if (totalSegs !== sentences.length) {
    items.push({ ok: false, msg: `句钩总数 ${totalSegs} ≠ 句数 ${sentences.length}` });
  }
  chains.forEach((c, idx) => {
    const segs = c.segs.length, bridges = c.bridges.length, anchors = c.anchors.length;
    if (bridges !== segs - 1) items.push({ ok: false, msg: `链 #${idx + 1} 逻辑桥 ${bridges} ≠ 期望 ${segs - 1}（句钩 - 1）` });
    if (anchors < segs) items.push({ ok: false, msg: `链 #${idx + 1} 英文锚点 ${anchors} < 句钩 ${segs}` });
    if (!c.paraHook) items.push({ ok: false, msg: `链 #${idx + 1} 缺段钩（para-hook）` });
  });
  return {
    id: 4, name: "钩子链对齐",
    status: items.length === 0 ? "pass" : "fail",
    msg: `${chains.length} 链 / 共 ${totalSegs} 句钩 / 句数 ${sentences.length}`,
    items,
  };
}

function rule5_clozeVerifiable(html) {
  const blocks = extractClozeBlocks(html);
  const items = [];
  if (blocks.length === 0) {
    return { id: 5, name: "挖空可核对", status: "skip", msg: "未发现挖空自测段（details.answer-toggle）", items };
  }
  blocks.forEach((b, idx) => {
    const id = `段 #${idx + 1}`;
    if (b.blanksCount < 2 || b.blanksCount > 5) {
      items.push({ ok: false, msg: `${id} 挖空数 ${b.blanksCount} 不在 2~5 区间` });
    }
    if (b.blanksCount !== b.answersCount) {
      items.push({ ok: false, msg: `${id} 空数 ${b.blanksCount} ≠ 答案数 ${b.answersCount}（失配会触发失配保护，挖空静态化）` });
    } else {
      b.answers.forEach((w, k) => {
        const ok = b.sentEn && b.sentEn.toLowerCase().includes(w.toLowerCase());
        if (!ok) items.push({ ok: false, msg: `${id} 答案 #${k + 1}「${w}」在原句中找不到`, sentEn: b.sentEn });
      });
    }
  });
  return {
    id: 5, name: "挖空可核对",
    status: items.length === 0 ? "pass" : "fail",
    msg: `${blocks.length} 段挖空`,
    items,
  };
}

function rule6_termAndPatternSourceability(html) {
  const terms = extractTermRows(html);
  const patterns = extractPatternRows(html);
  const sentences = extractSentences(html).join(" ");
  const items = [];
  terms.forEach(t => {
    if (!sentences.toLowerCase().includes(t.term.toLowerCase())) {
      items.push({ ok: false, msg: `专业词「${t.term}」在原文中找不到` });
    }
  });
  patterns.forEach((p, idx) => {
    const cleaned = p.pattern.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const probe = cleaned.slice(0, 12);
    if (!probe || probe.length < 4) return;
    if (!sentences.toLowerCase().includes(probe.toLowerCase())) {
      items.push({ ok: false, msg: `金句 #${idx + 1}「${probe}…」在原文中找不到` });
    }
  });
  return {
    id: 6, name: "词汇与金句溯源",
    status: items.length === 0 ? "pass" : "fail",
    msg: `术语 ${terms.length} 条 / 金句 ${patterns.length} 条`,
    items,
  };
}

// ── 颜色 ──────────────────────────────────────────────────────────────────
const useColor = !process.argv.includes("--no-color") && process.stdout.isTTY;
const col_ = useColor ? {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m",
} : Object.fromEntries(["reset", "dim", "bold", "red", "green", "yellow", "cyan", "gray"].map(k => [k, ""]));
function paint(c, s) { return col_[c] + s + col_.reset; }
const ICON = { pass: "✅", fail: "❌", warn: "⚠️ ", skip: "○" };

// ── 文件验证 ──────────────────────────────────────────────────────────────
function verifyFile(filePath, sourceText, opts = {}) {
  const html = readFileSync(filePath, "utf8");
  const title = extractTitle(html);
  const relPath = rel(PKG_ROOT, filePath) || filePath;
  console.log("");
  console.log(paint("bold", `▸ ${relPath}`) + paint("dim", `  ${title}`));
  const sentCount = extractSentCount(html);
  const zhCount = extractSentZh(html).length;
  console.log(paint("dim", `  句数=${sentCount}  / 翻译行=${zhCount}  / 文件=${(html.length / 1024).toFixed(1)} KB`));
  const markers = extractVersionMarkers(html);
  markers.forEach(m => {
    if (m.count !== 1) {
      const sev = m.count === 0 ? "warn" : "fail";
      console.log(paint(sev === "warn" ? "yellow" : "red", `  ${ICON[sev]} 版本锚点 ${m.id}: 出现 ${m.count} 次（期望 1）`));
    }
  });
  const results = [
    rule1_sentenceFidelity(html, sourceText),
    rule2_annotationAccuracy(html),
    rule3_palaceAlignment(html),
    rule4_hookChainAlignment(html),
    rule5_clozeVerifiable(html),
    rule6_termAndPatternSourceability(html),
  ];
  let hasAnyFail = false, hasAnyWarn = false;
  results.forEach(r => {
    const sev = r.status === "fail" ? "fail" : r.status === "warn" ? "warn" : r.status === "skip" ? "skip" : "pass";
    const color = sev === "fail" ? "red" : sev === "warn" ? "yellow" : sev === "skip" ? "gray" : "green";
    console.log(`  ${paint(color, ICON[sev])}  ${paint("bold", `规则 ${r.id} ${r.name}`)}  ${paint(color, r.msg)}`);
    r.items.forEach(it => {
      const sign = it.ok === false ? paint("red", "    ✗ ") : "    · ";
      console.log(`${sign}${it.msg}`);
      if (it.detail && opts.verbose) console.log(paint("dim", `      ${JSON.stringify(it.detail).slice(0, 240)}`));
    });
    if (r.status === "fail") hasAnyFail = true;
    if (r.status === "warn") hasAnyWarn = true;
  });
  return { file: filePath, results, hasAnyFail, hasAnyWarn };
}

// ── CLI ───────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`用法：
  node bin/verify-plan.mjs <file.html> [--source <原文文本|文件>] [--no-color] [--verbose]
  node bin/verify-plan.mjs <dir>                              # 扫目录中所有 *-memorization-plan.html
  node bin/verify-plan.mjs --help

选项：
  --source <s>     原文文本或文件路径。提供后可执行规则 1 逐句对比
  --no-color       关闭彩色输出（适合 CI / 管道）
  --verbose        打印失败项的 detail JSON
  --all            目录扫描时包含所有 .html 文件（默认仅匹配 *-memorization-plan.html）

退出码：0=全部通过；1=有 fail；2=参数错误

覆盖的 6 条硬规则（来自 SKILL.md §"内容校验（生成后强制执行）"）：
  1. 逐句完整性（error）── 句数相等、逐句逐字符一致
  2. 标注精度（warning）── 注解条数 / 连读-弱读-flap-击穿统计 / 音标可疑字符
  3. 宫殿对齐（error）── data-sents 覆盖齐全；站号连续；锚词在原句中可找到
  4. 钩子链对齐（error）── 句钩数==句数；逻辑桥数==句钩-1；锚点≥句钩
  5. 挖空可核对（error）── 2~5 空；空数==答案数；答案词真在原句中
  6. 词汇与金句溯源（error）── 术语词真在原文中；金句摘录前 12 字真在原文中
`);
}
function readSource(s) {
  if (!s) return null;
  try { if (existsSync(s) && statSync(s).isFile()) return readFileSync(s, "utf8"); } catch {}
  return s;
}
function collectFiles(target, argv = []) {
  if (!target) return [];
  if (existsSync(target) && statSync(target).isFile()) return [resolve(target)];
  if (existsSync(target) && statSync(target).isDirectory()) {
    const allHtml = argv.includes("--all");
    const re = allHtml ? /\.html$/ : /-memorization-plan\.html$/;
    return readdirSync(target, { withFileTypes: true })
      .filter(d => d.isFile() && re.test(d.name))
      .map(d => resolve(target, d.name));
  }
  return [];
}
function main(argv) {
  if (argv.includes("--help") || argv.length === 0) { printHelp(); return 0; }
  const sourceArgIdx = argv.indexOf("--source");
  const sourceText = sourceArgIdx > -1 ? readSource(argv[sourceArgIdx + 1]) : null;
  const verbose = argv.includes("--verbose");
  const positional = argv.filter(a => !a.startsWith("--") && (sourceArgIdx < 0 || a !== argv[sourceArgIdx + 1]));
  if (positional.length === 0) { console.error("错误：缺少文件/目录参数"); printHelp(); return 2; }
  const files = collectFiles(resolve(positional[0]), argv);
  if (files.length === 0) { console.error("错误：未找到匹配的文件（要求：*-memorization-plan.html）"); return 2; }
  console.log(paint("bold", "english-memory-method · 内容校验（6 条硬规则）"));
  console.log(paint("dim", `目标: ${files.length} 个文件${sourceText ? "（含原文对比）" : "（未提供 --source，跳过规则 1 逐字符对比）"}`));
  let totalFail = 0, totalWarn = 0;
  files.forEach(f => {
    const r = verifyFile(f, sourceText, { verbose });
    if (r.hasAnyFail) totalFail++;
    if (r.hasAnyWarn) totalWarn++;
  });
  console.log("");
  if (totalFail === 0 && totalWarn === 0) {
    console.log(paint("green", `✓ 全部 ${files.length} 个文件通过 6 条硬规则`));
  } else {
    const summary = [];
    if (totalFail) summary.push(paint("red", `${totalFail} 个文件有 error 级失败`));
    if (totalWarn) summary.push(paint("yellow", `${totalWarn} 个文件有 warning`));
    console.log("⚑ " + summary.join("；"));
  }
  return totalFail > 0 ? 1 : 0;
}
process.exit(main(process.argv.slice(2)));