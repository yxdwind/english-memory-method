
/* ===== v2.18 EMM_FOLD_V218: 首屏折叠 + on-boarding ===== */
(function(){
  "use strict";

  // 1. 标记"进阶章节"：h2 编号 ≥ 9 整段作为 advanced
  document.querySelectorAll('h2').forEach(function(h2){
    var m = /^\s*(\d+)\./.exec(h2.textContent || '');
    if(!m || +m[1] < 9) return;
    h2.classList.add('emm-advanced');
    var n = h2.nextElementSibling;
    while(n && n.tagName !== 'H2'){
      n.classList.add('emm-advanced');
      n = n.nextElementSibling;
    }
  });

  // 2. 浮动切换按钮
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'emm-fold-toggle';
  btn.id = 'emm-fold-toggle';
  btn.innerHTML = '≡ 进阶内容 <span class="tag"></span>';
  document.body.appendChild(btn);

  function syncBtn(){
    var folded = document.body.classList.contains('emm-folded');
    btn.querySelector('.tag').textContent = folded ? '（已折叠，点开）' : '（全部展开）';
    btn.setAttribute('title', folded ? '显示所有章节' : '折叠至核心 4 节');
  }

  btn.addEventListener('click', function(){
    document.body.classList.toggle('emm-folded');
    syncBtn();
    try { localStorage.setItem('emm-fold-state', document.body.classList.contains('emm-folded') ? '1' : '0'); } catch(e){}
  });

  // 3. 应用持久化状态
  try {
    var saved = localStorage.getItem('emm-fold-state');
    if(saved === '1') document.body.classList.add('emm-folded');
    // 没有过任何记录的用户：默认折叠（降低首屏信息密度）
    if(localStorage.getItem('emm-fold-state') === null) document.body.classList.add('emm-folded');
  } catch(e){}
  syncBtn();

  // 4. 首次访问 on-boarding
  try {
    if(!localStorage.getItem('emm-onboarding-shown')){
      var wrap = document.querySelector('.wrap');
      if(wrap){
        var ob = document.createElement('div');
        ob.className = 'emm-onboarding';
        ob.id = 'emm-onboarding';
        ob.innerHTML = '<h3>🎓 第一次用？60 秒引导</h3>'
          + '<ol>'
          + '<li>读 <b>1. 整体策略</b>——知道主题、要背几天</li>'
          + '<li>看 <b>2. 文章结构图</b>——5 秒看整体</li>'
          + '<li>读 <b>4. 原文逐句精读</b>——听读 3 遍</li>'
          + '<li>点 <b>📅 今日任务</b> 的「开始本轮」做第一次复述</li>'
          + '<li>卡壳 → 仪表盘薄弱清单 → 第二天自测</li>'
          + '</ol>'
          + '<button type="button" class="emm-onboarding-dismiss">我知道了，下次不再显示</button>';
        wrap.insertBefore(ob, wrap.firstChild);
        ob.querySelector('.emm-onboarding-dismiss').addEventListener('click', function(){
          try { localStorage.setItem('emm-onboarding-shown', '1'); } catch(e){}
          ob.remove();
        });
      }
    }
  } catch(e){}
})();
