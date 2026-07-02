/* =================================================================
   ครู: ใส่วิดีโอ YouTube ตรงนี้ (TEACHER: PUT YOUR VIDEO HERE)
   วิธีทำ: 1) เปิดคลิป YouTube  2) คัดลอกรหัสหลัง v= ในลิงก์
   ตัวอย่างลิงก์: https://www.youtube.com/watch?v=ABC123xyz
   รหัสคือ ABC123xyz  -> วางไว้ในเครื่องหมายคำพูดข้างล่าง
   ถ้าเว้นว่าง "" จะแสดงเป็นช่องว่างเปล่า
==================================================================*/
var VIDEO_ID = "";
/* ================================================================= */

/* Cloudflare Worker URL — configured in config.js */
var workerUrl = window.WORKER_URL || "";

/* ===== Auto-save progress to localStorage (survives refresh) ===== */
var STORAGE_KEY="prism_alaska_v1";
var pendingRestore=null;
var saveTimer=null;
try{var _raw=localStorage.getItem(STORAGE_KEY);if(_raw)pendingRestore=JSON.parse(_raw)}catch(e){}
var mcqSolvedRestore=(pendingRestore&&pendingRestore.mcqSolved)||{};

var STOPS=[["①","Task","โจทย์"],["②","Sort","จัดกลุ่ม"],["③","Stance","ทัศนะ"],["④","Model","ตัวอย่าง"],["⑤","Warm-up","อุ่นเครื่อง"],["⑥","Write","เขียน"],["⑦","Review","ทบทวน"]];
var HUBINFO=[
  {t:"Your task + analysis",d:"Read the task, find two views, learn the shape. / อ่านโจทย์ หาสองมุมมอง",time:"~9 min",stars:1,rank:"Explorer / นักสำรวจ"},
  {t:"Sort the ideas",d:"Sort facts into View 1 / View 2 / opinion. / จัดข้อมูล",time:"~7 min",stars:2,rank:"Sorter / นักจัดกลุ่ม"},
  {t:"Stance language",d:"Learn phrases that show each view. / ภาษาแสดงทัศนะ",time:"~7 min",stars:3,rank:"Speaker / นักแสดงทัศนะ"},
  {t:"The model paragraph",d:"See the 5 parts and connectors. / ดู 5 ส่วน",time:"~9 min",stars:4,rank:"Analyst / นักวิเคราะห์"},
  {t:"Warm-up practice",d:"Fill the blanks to get ready to write. / อุ่นเครื่องเติมช่องว่าง",time:"~8 min",stars:5,rank:"Builder / นักประกอบร่าง"},
  {t:"Write it, part by part",d:"Build your paragraph with help. / เขียนทีละกล่อง",time:"~12 min",stars:6,rank:"Writer / นักเขียน"},
  {t:"Review & reflect",d:"Check your work and reflect. / ตรวจและสะท้อนคิด",time:"~8 min",stars:7,rank:"Champion / แชมเปี้ยน"}
];
var done=[false,false,false,false,false,false,false];
var current=null;

var rail=document.getElementById("rail");
STOPS.forEach(function(s,i){var b=document.createElement("button");b.className="stop";b.innerHTML='<span class="n">'+s[0]+'</span>'+s[1]+'<small>'+s[2]+'</small>';b.onclick=function(){
  if(current!==null&&current!==i)markDone();
  if(!unlocked(i)&&!done[i]){nudge(i);return}
  go(i)};rail.appendChild(b)});

// a panel is unlocked if it's panel 0, or the panel before it is done
function unlocked(i){return i===0||done[i-1]}

var hub=document.getElementById("hub");
function starStr(n){var s="";for(var i=0;i<7;i++)s+=(i<n?"★":"☆");return s}
function renderHub(){hub.innerHTML="";HUBINFO.forEach(function(h,i){
  var lock=!unlocked(i)&&!done[i];
  var b=document.createElement("button");b.className="hubcard"+(done[i]?" done":"")+(lock?" locked":"");
  b.innerHTML='<span class="hn">'+(done[i]?"✓":(lock?"🔒":(i+1)))+'</span><span class="htxt"><span class="ht">'+h.t+'</span><span class="hd">'+(lock?'Finish step '+i+' first / ทำขั้น '+i+' ก่อน':h.d)+'</span></span>'+
    '<span class="hmeta"><span class="htime">'+h.time+'</span>'+(done[i]?'<div class="hcheck" style="font-size:.66rem;letter-spacing:1px;color:var(--amber-deep)">'+starStr(h.stars)+'</div>':'')+'</span>';
  b.onclick=function(){if(lock){nudge(i);return}go(i)};hub.appendChild(b)})}
renderHub();

function nudge(i){
  var pop=document.getElementById("badgePop");
  pop.innerHTML='<div style="font-size:1.8rem">🔒</div><div class="btx" style="color:var(--mid)">Locked / ยังล็อกอยู่</div><div class="bth">Finish step '+i+' first. / ทำขั้น '+i+' ให้เสร็จก่อน</div>';
  pop.classList.add("show");setTimeout(function(){pop.classList.remove("show")},1600);
}

function renderProgress(){
  var n=done.filter(Boolean).length;
  document.getElementById("progtext").textContent=n+" / 7 done · "+(n===7?"Champion! 🎉":"keep going");
  document.getElementById("progfill").style.width=(n/7*100)+"%";
  document.getElementById("badgeRow").innerHTML=HUBINFO.map(function(h,i){return '<span class="bd'+(done[i]?" got":"")+'" style="font-size:.78rem">'+(done[i]?"★":"☆")+'</span>'}).join('');
}
renderProgress();

function showBadge(i){
  var h=HUBINFO[i];
  var pop=document.getElementById("badgePop");
  pop.innerHTML='<div style="font-size:1.4rem;letter-spacing:2px;color:#e8a23d">'+starStr(h.stars)+'</div><div class="btx">Level up! '+h.stars+' ★ / เลื่อนระดับ!</div><div class="bth">'+h.rank+'</div>';
  pop.classList.add("show");setTimeout(function(){pop.classList.remove("show")},1900);
}

function blockMsg(emoji,title,detail){
  var pop=document.getElementById("badgePop");
  pop.innerHTML='<div style="font-size:1.8rem">'+emoji+'</div><div class="btx" style="color:var(--amber-deep)">'+title+'</div><div class="bth">'+detail+'</div>';
  pop.classList.add("show");setTimeout(function(){pop.classList.remove("show")},2200);
}

function panelComplete(i){
  if(i===0){ // Task: drag words into View 1/2 + finish the Polar chatbot
    var taAll=TA.every(function(it){return taPlace[it.id]});
    if(!taAll){blockMsg("🧩","Not finished / ยังไม่ครบ","Drag all the words into View 1 / View 2. / ลากคำให้ครบ");return false}
    if(!taskBotDone){blockMsg("🐻‍❄️","คุยกับน้องโพลาร์ให้จบก่อน","ตอบน้องโพลาร์จนครบ แล้วพิมพ์จุดยืนของเธอ / Finish the chat and write your stance");return false}
    return true;
  }
  if(i===1){ // Sort: all 3 exercises done
    if(!sortDone[0]){sortTab(0);blockMsg("🗂️","แบบฝึก 1 ยังไม่ครบ","จัดข้อมูลลง View 1 / View 2 / Opinion ให้ถูกครบ");return false}
    if(!sortDone[1]){sortTab(1);blockMsg("🔗","แบบฝึก 2 ยังไม่ครบ","จับคู่สาเหตุกับผลกระทบให้ครบทุกคู่");return false}
    if(!sortDone[2]){sortTab(2);blockMsg("📑","แบบฝึก 3 ยังไม่ครบ","เรียงประโยคในย่อหน้าให้ถูกลำดับ");return false}
    return true;
  }
  if(i===2){ // Stance: both exercises (p3q + p3qB)
    var okA=mcqProgress["p3q"]&&mcqProgress["p3q"].correct===mcqProgress["p3q"].total;
    var okB=mcqProgress["p3qB"]&&mcqProgress["p3qB"].correct===mcqProgress["p3qB"].total;
    if(!okA||!okB){stanceTab(2);blockMsg("💬","แบบฝึกยังไม่ครบ","ทำแบบฝึก A และ B ให้ถูกครบทุกข้อ (แท็บ 3) / Finish both exercises in tab 3");return false}
    return true;
  }
  if(i===3){ // Model: must tap at least 4 of the 5 parts to explore
    var seen=Object.keys(modelSeen).length;
    if(seen<5){blockMsg("🔍","Keep exploring / สำรวจต่อ","Tap all 5 sentences in the model to learn each part. / แตะให้ครบทั้ง 5 ประโยค ("+seen+"/5)");return false}
    return true;
  }
  if(i===4){ // Warm-up: all dropdowns correct
    if(!warmAllCorrect()){blockMsg("🧩","Almost! / เกือบแล้ว","Choose the correct answer for every blank. / เลือกให้ถูกครบทุกช่อง (ดู ❌)");return false}
    return true;
  }
  if(i===5){ // Write: all 5 boxes filled
    var filled=["topic","v1","v2","op","close"].every(function(k){return boxVals[k]&&boxVals[k].trim().length>0});
    if(!filled){blockMsg("✍️","Almost there! / ใกล้แล้ว","Fill all 5 boxes to earn the Writer star. / เขียนครบ 5 กล่อง");return false}
    return true;
  }
  return true; // panel 6 (Review)
}

function markDone(){
  if(current===null||done[current])return true;
  if(!panelComplete(current))return false;
  done[current]=true;renderProgress();showBadge(current);scheduleSave();return true;
}

function go(n){
  var hubP=document.querySelector('[data-hub]');
  if(typeof n==="number"&&!unlocked(n)&&!done[n]){nudge(n);return}
  if('speechSynthesis' in window){speechSynthesis.cancel();speakState="idle";var pb=document.getElementById("playBtn");if(pb)pb.innerHTML="🔊 Listen / ฟัง"}
  document.querySelectorAll(".panel").forEach(function(p){p.classList.remove("show")});
  if(n==="hub"){current=null;hubP.classList.add("show");
    document.getElementById("rail").style.display="none";
    document.getElementById("progwrap").style.display="none";
    renderHub();renderProgress();window.scrollTo({top:0,behavior:"smooth"});return}
  hubP.classList.remove("show");current=n;
  document.querySelector('[data-step="'+n+'"]').classList.add("show");
  document.getElementById("rail").style.display="flex";
  document.getElementById("progwrap").style.display="block";
  document.querySelectorAll(".stop").forEach(function(s,i){s.classList.toggle("active",i===n);s.classList.toggle("done",done[i]);s.style.opacity=(unlocked(i)||done[i])?"1":"0.4"});
  if(n===6)renderEssay();
  window.scrollTo({top:0,behavior:"smooth"});
  scheduleSave()}

var mcqProgress={}; // id -> {total, correct}
function buildMCQ(id,items){var c=document.getElementById(id);mcqProgress[id]={total:items.length,correct:0};
  var restored=mcqSolvedRestore[id]||[];
  items.forEach(function(it,qi){
  var ex=document.createElement("div");ex.className="ex";
  var opts=it.o.map(function(o,j){return '<button class="opt" data-j="'+j+'">'+o+'</button>'}).join('');
  ex.innerHTML='<div class="qline">'+it.q+(it.qth?'<br><span class="qth">'+it.qth+'</span>':'')+'</div><div class="opts">'+opts+'</div><div class="fb"></div>';
  var solved=false;
  if(restored.indexOf(qi)>=0){
    solved=true;mcqProgress[id].correct++;
    ex.querySelectorAll(".opt").forEach(function(o){var oj=+o.dataset.j;o.classList.add("locked");if(oj===it.a)o.classList.add("correct")});
    var fb0=ex.querySelector(".fb");fb0.className="fb show good";fb0.innerHTML="Correct! "+it.why;
  }
  ex.querySelectorAll(".opt").forEach(function(btn){btn.onclick=function(){if(solved)return;var j=+btn.dataset.j;var right=(j===it.a);
    var fb=ex.querySelector(".fb");
    if(right){
      solved=true;mcqProgress[id].correct++;
      ex.querySelectorAll(".opt").forEach(function(o){var oj=+o.dataset.j;o.classList.add("locked");if(oj===it.a)o.classList.add("correct")});
      fb.className="fb show good";fb.innerHTML="Correct! "+it.why;
      if((id==="p3q"||id==="p3qB")&&typeof checkStance==="function")checkStance();
      scheduleSave();
    }else{
      // wrong: show feedback, mark this option, but allow retry
      btn.classList.add("wrong");
      fb.className="fb show bad";fb.innerHTML="Not yet — try again. / ยังไม่ใช่ ลองอีกครั้ง "+it.why;
      setTimeout(function(){btn.classList.remove("wrong")},900);
    }
  }});c.appendChild(ex)})}

var TA=[
  {id:1,t:"danger for the whole world",side:"V1"},
  {id:2,t:"a problem for Alaska only",side:"V2"},
  {id:3,t:"the whole world",side:"V1"},
  {id:4,t:"Alaska only",side:"V2"}
];
var taPlace={},taSel=null;
function taRender(){var pool=document.getElementById("taPool");pool.innerHTML="";
  var rem=TA.filter(function(it){return !taPlace[it.id]});
  if(!rem.length)pool.innerHTML='<span style="color:var(--ok);font-weight:bold;font-family:Trebuchet MS,sans-serif;font-size:.8rem">All sorted! Now find the big word below. / จัดครบแล้ว หาคำใหญ่ด้านล่าง</span>';
  rem.forEach(function(it){var b=document.createElement("button");b.className="item"+(taSel===it.id?" sel":"");
    b.textContent=it.t;b.onclick=function(e){e.stopPropagation();taSel=(taSel===it.id?null:it.id);taRender();taArm()};pool.appendChild(b)});
  ["V1","V2"].forEach(function(side){var c=document.getElementById("ta"+side+"-items");c.innerHTML="";
    TA.filter(function(it){return taPlace[it.id]===side}).forEach(function(it){var ok=it.side===side;
      var d=document.createElement("div");d.className="placed "+(ok?"ok":"no");d.textContent=(ok?"✓ ":"✗ ")+it.t;
      d.onclick=function(e){e.stopPropagation();delete taPlace[it.id];taRender();scheduleSave()};c.appendChild(d)})})}
function taArm(){["V1","V2"].forEach(function(s){document.getElementById("ta"+s).classList.toggle("armed",!!taSel)})}
function taDrop(side){if(!taSel)return;taPlace[taSel]=side;taSel=null;taArm();taRender();scheduleSave()}
taRender();

// ===== TASK chatbot "น้องโพลาร์" (Socratic, scripted decision-tree) =====
// [STATE-DATA] เปลี่ยนบทสนทนานี้สำหรับ State 2/3/4 ได้ — engine ด้านล่างคงเดิม
// บทสนทนาออกแบบให้ "ไม่ทับ" model paragraph: ใช้คำถามชวนคิด/สถานการณ์สมมติแทนการบอกเนื้อหาตรง ๆ
var BOT_SCRIPT=[
  {bot:["สวัสดีจ้า เราชื่อน้องโพลาร์ 🐻‍❄️ เป็นเพื่อนคิดของเธอวันนี้!","โจทย์บอกว่า \"คนเรามองการละลายของอะแลสกาต่างกัน\" ก่อนอื่น...เธอว่าเรื่องนี้มันเป็นเรื่อง \"ใกล้ตัว\" หรือ \"ไกลตัว\" เธอล่ะ?"],
   opts:[
     {t:"รู้สึกไกลตัว อะแลสกาอยู่ตั้งไกล",next:1},
     {t:"ใกล้ตัวสิ โลกใบเดียวกัน",next:1}
   ]},
  {bot:["ไม่ว่าจะตอบแบบไหน เธอเพิ่งทำสิ่งสำคัญไปแล้วนะ — เธอ \"มองเห็นสองด้าน\" ของเรื่องเดียวกัน!","ในงานเขียนแบบนี้ เราเรียกสองด้านนั้นว่า View 1 กับ View 2 ลองมาแยกกันดู","คำถามแรก: ถ้าน้ำแข็งก้อนยักษ์ละลายจนน้ำทะเลทั้งโลกสูงขึ้น เธอคิดว่าใครเดือดร้อนบ้าง?"],
   opts:[
     {t:"คนทั้งโลก เมืองริมทะเลทุกที่",tag:"global",next:2},
     {t:"เฉพาะคนอะแลสกา",tag:"local-wrong",next:2}
   ]},
  {bot:["คิดดี ๆ นะ 💭 น้ำทะเลมันไม่มีพรมแดน ถ้ามันสูงขึ้น มันก็สูงขึ้นทั่วโลก เกาะเล็ก ๆ ประเทศริมทะเลก็กระทบหมด","แบบนี้แหละคือ View 1 — \"เป็นเรื่องระดับโลก (global)\" เก็บคำนี้ไว้ในใจนะ ✨","ทีนี้อีกด้านบ้าง: ถนนในอะแลสกาทรุด เสาไฟเอียง ป่าในอะแลสกาถูกแมลงกิน...สามอย่างนี้เกิดที่ไหน?"],
   opts:[
     {t:"เกิดในพื้นที่อะแลสกาเอง",tag:"local",next:3},
     {t:"เกิดทั่วโลก",tag:"global-wrong",next:3}
   ]},
  {bot:["ใช่เลย! 🎯 ถนน เสาไฟ ป่า ที่พังเนี่ย มัน \"อยู่ในอะแลสกา\" ไม่ได้ลามไปไหน","นี่คือ View 2 — \"เป็นปัญหาเฉพาะที่ (local)\" เห็นไหมว่าเรื่องเดียวกันมองได้สองมุม!","สรุปให้หน่อยซิ: ข้อไหนคือ View 1 (ระดับโลก)?"],
   opts:[
     {t:"น้ำทะเลสูง กระทบทั้งโลก",tag:"ok",next:4},
     {t:"ถนนในอะแลสกาพัง",tag:"mix",next:4}
   ]},
  {bot:["เก่งมาก! 👏 เธอแยก View 1 (global) กับ View 2 (local) ออกจากกันได้แล้ว — นี่คือหัวใจของงานเขียนนี้เลย","ขั้นสุดท้ายที่ยากที่สุด...และสำคัญที่สุด: แล้ว \"เธอ\" ล่ะ คิดยังไง?","ไม่มีคำตอบผิดนะ ขอแค่เลือกข้างแล้วบอกเหตุผลสั้น ๆ ของเธอเอง พิมพ์ลงช่องข้างล่างได้เลย 👇"],
   input:true}
];
var botStep=0, botStance="";
var chatEl=document.getElementById("chatbot");
function renderChat(){
  chatEl.innerHTML='<div class="chatwin" id="chatwin"></div><div class="chatfoot" id="chatfoot"></div>';
  var win=document.getElementById("chatwin");
  // render history up to current step
  for(var s=0;s<=botStep && s<BOT_SCRIPT.length;s++){
    var node=BOT_SCRIPT[s];
    (node.bot||[]).forEach(function(line){
      var b=document.createElement("div");b.className="cbubble bot";b.innerHTML='<span class="cav">🐻‍❄️</span><span class="ctext">'+line+'</span>';win.appendChild(b);
    });
    if(s<botStep && node.chosen){
      var u=document.createElement("div");u.className="cbubble user";u.textContent=node.chosen;win.appendChild(u);
    }
  }
  var foot=document.getElementById("chatfoot");
  var cur=BOT_SCRIPT[botStep];
  if(!cur){renderChatDone();return;}
  if(cur.input){
    foot.innerHTML='<div class="stancebox"><textarea id="botStance" placeholder="I think it is a ... problem, because ... / ฉันคิดว่า... เพราะ..."></textarea><button class="cbtn send" onclick="submitStance()">ส่งจุดยืน / Send 🎯</button></div>';
    if(botStance)document.getElementById("botStance").value=botStance;
  }else{
    foot.innerHTML="";
    cur.opts.forEach(function(o,i){
      var btn=document.createElement("button");btn.className="cbtn";btn.textContent=o.t;
      btn.onclick=function(){cur.chosen=o.t;botStep++;renderChat();setTimeout(scrollChat,30);scheduleSave()};
      foot.appendChild(btn);
    });
  }
  scrollChat();
}
function scrollChat(){var w=document.getElementById("chatwin");if(w)w.scrollTop=w.scrollHeight;}
function submitStance(){
  var v=document.getElementById("botStance").value.trim();
  if(v.length<5){blockMsg("💭","บอกอีกนิด","พิมพ์จุดยืนของเธอ + เหตุผลสั้น ๆ / Write your stance and a reason");return;}
  botStance=v;botStep++;taskBotDone=true;
  // เด้งไปเติมใน Write (Part 4 My Opinion) อัตโนมัติ
  try{ if(typeof boxVals==="object"){ boxVals.op=v; var ta=document.querySelector('[data-key="op"]'); if(ta)ta.value=v; } }catch(e){}
  renderChat();scheduleSave();
}
function renderChatDone(){
  var foot=document.getElementById("chatfoot");
  document.getElementById("chatwin").innerHTML+='<div class="cbubble bot"><span class="cav">🐻‍❄️</span><span class="ctext">เยี่ยมไปเลย! 🌟 เธอวิเคราะห์โจทย์ แยกสองมุมมอง และตั้งจุดยืนของตัวเองได้แล้ว<br>จุดยืนนี้เราเก็บไว้ให้ ไปโผล่ในขั้น Write ส่วน \"My Opinion\" ให้เธอใช้ต่อได้เลยนะ ไปลุยกันต่อ!</span></div>';
  foot.innerHTML='<div class="stancedone">✅ จุดยืนของฉัน / My stance: <b>'+esc(botStance)+'</b></div>';
  scrollChat();
}
var taskBotDone=false;
renderChat();

buildMCQ("p3q",[
  {q:'Which phrase opens View 1?',qth:'วลีไหนเปิดมุมมองแรก',o:["I think","Some people believe","However"],a:1,why:'"Some people believe" opens View 1.'},
  {q:'Which phrase shows the other view?',qth:'วลีไหนแสดงมุมมองตรงข้าม',o:["On the other hand,","because","for example"],a:0,why:'"On the other hand" shows View 2.'},
  {q:'Which phrase shows YOUR opinion?',qth:'วลีไหนแสดงความเห็นของคุณ',o:["Some people say","In my opinion,","Others think"],a:1,why:'"In my opinion" = your own view.'}
]);

buildMCQ("p3qB",[
  {q:'Which connector shows CONTRAST?',qth:'คำเชื่อมไหนแสดงความขัดแย้ง',o:["For example,","However,","Because"],a:1,why:'"However" shows contrast between two views.'},
  {q:'Which connector gives a REASON?',qth:'คำเชื่อมไหนให้เหตุผล',o:["because","In conclusion,","Also,"],a:0,why:'"because" introduces a reason.'},
  {q:'Which connector gives an EXAMPLE?',qth:'คำเชื่อมไหนยกตัวอย่าง',o:["Therefore,","For example,","But"],a:1,why:'"For example" introduces an example.'},
  {q:'Which connector CONCLUDES the paragraph?',qth:'คำเชื่อมไหนใช้สรุป',o:["To begin with,","On the other hand,","In conclusion,"],a:2,why:'"In conclusion" closes the paragraph.'}
]);

// ===== STANCE: 3 parts (2 knowledge + 1 exercise) =====
function stanceTab(i){
  document.querySelectorAll("#stanceTabs .subtab").forEach(function(t){t.classList.toggle("on",+t.dataset.ex===i)});
  [0,1,2].forEach(function(n){document.getElementById("stanceEx"+n).style.display=(n===i?"block":"none")});
}
function checkStance(){
  var a=mcqProgress["p3q"]&&mcqProgress["p3q"].correct===mcqProgress["p3q"].total;
  var b=mcqProgress["p3qB"]&&mcqProgress["p3qB"].correct===mcqProgress["p3qB"].total;
  var st=document.getElementById("stanceStat");
  if(a&&b){st.className="exstatus done";st.innerHTML="✅ ทำครบทั้ง 2 แบบฝึก! / Both exercises complete";}
  else{st.className="exstatus";st.innerHTML="";}
  return a&&b;
}

// ===== SORT: 3 exercises =====
var sortDone=[false,false,false];
function sortTab(i){
  document.querySelectorAll("#sortTabs .subtab").forEach(function(t){t.classList.toggle("on",+t.dataset.ex===i)});
  [0,1,2].forEach(function(n){document.getElementById("sortEx"+n).style.display=(n===i?"block":"none")});
}

// --- EX 1: sort into bins ---
var SORT=[
  {id:1,t:"Sea levels rise and flood islands",tth:"น้ำทะเลสูง ท่วมเกาะ",side:"V1"},
  {id:2,t:"Roads in Alaska break",tth:"ถนนในอะแลสกาพัง",side:"V2"},
  {id:3,t:"World temperature goes up",tth:"อุณหภูมิโลกสูงขึ้น",side:"V1"},
  {id:4,t:"Alaska's forests die",tth:"ป่าอะแลสกาตาย",side:"V2"},
  {id:5,t:"I think the world should care",tth:"ฉันคิดว่าโลกควรใส่ใจ",side:"OP"}
];
var place={},selId=null;
function renderPool(){var pool=document.getElementById("pool");pool.innerHTML="";
  var rem=SORT.filter(function(it){return !place[it.id]});
  if(!rem.length)pool.innerHTML='<span style="color:var(--ok);font-weight:bold;font-family:Trebuchet MS,sans-serif;font-size:.8rem">All placed! / จัดครบแล้ว</span>';
  rem.forEach(function(it){var b=document.createElement("button");b.className="item"+(selId===it.id?" sel":"");
    b.innerHTML=it.t+'<span class="ith">'+it.tth+'</span>';
    b.onclick=function(e){e.stopPropagation();selId=(selId===it.id?null:it.id);renderPool();arm()};pool.appendChild(b)});
  renderBins();checkSort1()}
function renderBins(){["V1","V2","OP"].forEach(function(side){var c=document.getElementById("bin"+side+"-items");c.innerHTML="";
  SORT.filter(function(it){return place[it.id]===side}).forEach(function(it){var ok=it.side===side;
    var d=document.createElement("div");d.className="placed "+(ok?"ok":"no");d.textContent=(ok?"✓ ":"✗ ")+it.t;
    d.onclick=function(e){e.stopPropagation();delete place[it.id];renderPool();scheduleSave()};c.appendChild(d)})})}
function arm(){["V1","V2","OP"].forEach(function(s){document.getElementById("bin"+s).classList.toggle("armed",!!selId)})}
function drop(side){if(!selId)return;place[selId]=side;selId=null;arm();renderPool();scheduleSave()}
function checkSort1(){
  var allPlaced=SORT.every(function(it){return place[it.id]});
  var allRight=SORT.every(function(it){return place[it.id]===it.side});
  var st=document.getElementById("sortStat0");
  if(allRight){st.className="exstatus done";st.innerHTML="✅ ถูกครบ! / All correct";sortDone[0]=true;}
  else if(allPlaced){st.className="exstatus warn";st.innerHTML="ยังมีบางข้อผิด ลองดู ✗ / Some are wrong";sortDone[0]=false;}
  else{st.className="exstatus";st.innerHTML="";sortDone[0]=false;}
}
renderPool();

// --- EX 2: match cause -> effect ---
var MATCH=[
  {id:"m1",cause:"Permafrost thaws",cth:"ดินเยือกแข็งละลาย",effect:"Roads and poles collapse",eth:"ถนนและเสาล้ม"},
  {id:"m2",cause:"Glaciers melt",cth:"ธารน้ำแข็งละลาย",effect:"Sea levels rise",eth:"น้ำทะเลสูงขึ้น"},
  {id:"m3",cause:"Warmer weather",cth:"อากาศอุ่นขึ้น",effect:"Insects kill the forests",eth:"แมลงทำลายป่า"},
  {id:"m4",cause:"More greenhouse gas",cth:"ก๊าซเรือนกระจกมากขึ้น",effect:"World temperature goes up",eth:"อุณหภูมิโลกสูงขึ้น"}
];
var matchSel=null,matched={};
function renderMatch(){
  var cc=document.getElementById("causeCol"),ec=document.getElementById("effectCol");
  cc.innerHTML="";ec.innerHTML="";
  MATCH.forEach(function(m){
    var b=document.createElement("button");b.className="matchcard cause"+(matchSel===m.id?" sel":"")+(matched[m.id]?" done":"");
    b.innerHTML=m.cause+'<span class="ith">'+m.cth+'</span>';
    b.onclick=function(){if(matched[m.id])return;matchSel=(matchSel===m.id?null:m.id);renderMatch()};
    cc.appendChild(b);
  });
  // effects shuffled once
  (window._effOrder||(window._effOrder=MATCH.slice().sort(function(){return Math.random()-.5}))).forEach(function(m){
    var b=document.createElement("button");b.className="matchcard effect"+(matched[m.id]?" done":"");
    b.innerHTML=m.effect+'<span class="ith">'+m.eth+'</span>';
    b.onclick=function(){
      if(matched[m.id])return;
      if(!matchSel){return;}
      if(matchSel===m.id){matched[m.id]=true;matchSel=null;}
      else{ // wrong pair flash
        b.classList.add("wrong");setTimeout(function(){b.classList.remove("wrong")},700);matchSel=null;
      }
      renderMatch();checkMatch();scheduleSave();
    };
    ec.appendChild(b);
  });
}
function checkMatch(){
  var done=MATCH.every(function(m){return matched[m.id]});
  var st=document.getElementById("sortStat1");
  if(done){st.className="exstatus done";st.innerHTML="✅ จับคู่ครบ! / All matched";sortDone[1]=true;}
  else{st.className="exstatus";st.innerHTML="";sortDone[1]=false;}
}
renderMatch();

// --- EX 3: order the paragraph ---
var ORDER=[
  {n:1,t:"Alaska is melting, and people do not agree about how serious it is.",tth:"(เปิดประเด็น)"},
  {n:2,t:"On the one hand, some people believe it is a danger for the whole world.",tth:"(มุมมอง 1)"},
  {n:3,t:"On the other hand, others think it is mainly Alaska's problem.",tth:"(มุมมอง 2)"},
  {n:4,t:"In my opinion, it is a danger for everyone.",tth:"(ความเห็น)"},
  {n:5,t:"In conclusion, the world should care about Alaska.",tth:"(สรุป)"}
];
var orderPlaced=[];
function renderOrder(){
  var slots=document.getElementById("orderSlots"),pool=document.getElementById("orderPool");
  slots.innerHTML="";pool.innerHTML="";
  for(var i=0;i<5;i++){
    var slot=document.createElement("div");slot.className="orderslot";
    var placed=orderPlaced[i];
    if(placed){var ok=placed.n===(i+1);slot.className="orderslot filled "+(ok?"ok":"no");
      slot.innerHTML='<span class="oslotn">'+(i+1)+'</span>'+(ok?"✓ ":"✗ ")+placed.t;
      slot.onclick=(function(idx){return function(){orderPlaced.splice(idx,1);renderOrder();scheduleSave()}})(i);
    }else{slot.innerHTML='<span class="oslotn">'+(i+1)+'</span><span class="oslotempty">แตะประโยคด้านล่าง...</span>';}
    slots.appendChild(slot);
  }
  var used=orderPlaced.map(function(x){return x.n});
  (window._ordPool||(window._ordPool=ORDER.slice().sort(function(){return Math.random()-.5}))).forEach(function(o){
    if(used.indexOf(o.n)>=0)return;
    var b=document.createElement("button");b.className="orderchip";
    b.innerHTML=o.t+'<span class="ith">'+o.tth+'</span>';
    b.onclick=function(){if(orderPlaced.length<5){orderPlaced.push(o);renderOrder();scheduleSave()}};
    pool.appendChild(b);
  });
  checkOrder();
}
function resetOrder(){orderPlaced=[];renderOrder();scheduleSave()}
function checkOrder(){
  var st=document.getElementById("sortStat2");
  if(orderPlaced.length<5){st.className="exstatus";st.innerHTML="";sortDone[2]=false;return;}
  var allRight=orderPlaced.every(function(p,i){return p.n===(i+1)});
  if(allRight){st.className="exstatus done";st.innerHTML="✅ เรียงถูกครบ! / Correct order";sortDone[2]=true;}
  else{st.className="exstatus warn";st.innerHTML="ยังมีลำดับผิด (ดู ✗) แตะออกแล้วลองใหม่ / Some positions wrong";sortDone[2]=false;}
}
renderOrder();

var PARTS=[
  {pt:"1 · Topic sentence",th:"Role: it introduces the issue and tells the reader two views exist — like the title card of a film that sets the scene before the story begins. / บทบาท: เปิดประเด็นและบอกว่ามีสองมุมมอง เหมือนป้ายชื่อเรื่องที่ปูพื้นก่อนเข้าเนื้อหา ยังไม่เลือกข้าง",color:"var(--c-topic)"},
  {pt:"2 · View 1 + reason + example",th:"Role: it presents the first side fairly, with a reason and an example — like a lawyer presenting the first witness's case clearly so the reader understands it. / บทบาท: เสนอมุมมองแรกอย่างเป็นธรรม พร้อมเหตุผลและตัวอย่าง เหมือนทนายเสนอพยานฝั่งแรกให้ชัด",color:"var(--c-v1)"},
  {pt:"3 · View 2 + reason + example",th:"Role: it presents the opposite side with equal weight — like the same lawyer fairly presenting the other witness, so both sides are balanced before judgement. / บทบาท: เสนอมุมมองตรงข้ามด้วยน้ำหนักเท่ากัน เหมือนเสนอพยานอีกฝั่งให้สมดุลก่อนตัดสิน",color:"var(--c-v2)"},
  {pt:"4 · Opinion + reason",th:"Role: this is where you, the judge, weigh both sides and decide — the most important part, because the reader wants to know what YOU think and why. / บทบาท: จุดที่คุณในฐานะผู้ตัดสินชั่งน้ำหนักสองฝั่งแล้วเลือก สำคัญที่สุดเพราะผู้อ่านอยากรู้ว่าคุณคิดอย่างไรและเพราะอะไร",color:"var(--c-op)"},
  {pt:"5 · Closing sentence",th:"Role: it closes the paragraph and leaves a final thought — like the last line of a speech that the audience remembers. It adds no new idea. / บทบาท: ปิดย่อหน้าและทิ้งท้ายให้จดจำ เหมือนประโยคสุดท้ายของสุนทรพจน์ ไม่เพิ่มประเด็นใหม่",color:"var(--c-close)"}
];
var label=document.getElementById("plabel");
var modelSeen={};
document.querySelectorAll("#imodel .s").forEach(function(span){span.onclick=function(){var on=span.classList.contains("on");
  modelSeen[span.dataset.part]=true;
  document.querySelectorAll("#imodel .s").forEach(function(s){s.classList.remove("on")});
  if(on){label.classList.remove("show");return}span.classList.add("on");var p=PARTS[+span.dataset.part];
  label.style.background=p.color;label.innerHTML='<span class="pt">'+p.pt+'</span>'+p.th;label.classList.add("show")}});

var speakState="idle"; // idle | playing | paused
function setPlayBtn(t){document.getElementById("playBtn").innerHTML=t}
function toggleSpeak(){
  if(!('speechSynthesis' in window)){alert("Audio is not supported on this browser. / เบราว์เซอร์นี้ไม่รองรับเสียง");return}
  if(speakState==="playing"){speechSynthesis.pause();speakState="paused";setPlayBtn("▶️ Resume / เล่นต่อ");return}
  if(speakState==="paused"){speechSynthesis.resume();speakState="playing";setPlayBtn("⏸ Pause / หยุดชั่วคราว");return}
  // idle -> start fresh
  speechSynthesis.cancel();
  var text=Array.prototype.map.call(document.querySelectorAll("#imodel .s"),function(s){return s.textContent}).join(" ");
  var u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=0.9;
  u.onend=function(){speakState="idle";setPlayBtn("🔊 Listen / ฟัง")};
  speechSynthesis.speak(u);speakState="playing";setPlayBtn("⏸ Pause / หยุดชั่วคราว");
}
function stopSpeak(){if('speechSynthesis' in window){speechSynthesis.cancel();speakState="idle";setPlayBtn("🔊 Listen / ฟัง")}}

// video embedded directly as base64 in the Model panel (no external link needed)

var WB=[
 {key:"topic",cls:"wb-topic",title:"Part 1 · Introduction / แนะนำปัญหา",
  trick:"\u201cเปิดประเด็นให้เห็นสองมุมมอง\u201d (แค่บอกว่าคนเถียงกันเรื่องอะไร ยังไม่ต้องเลือกข้าง!)",
  guided:["What is happening to the ice in Alaska?","Are there two different views about this problem?"],
  conj:["Today","Currently","Right now"],
  starter:"_____, Alaska has a very big problem. The ice and the ground are _____ (melting / freezing) very fast. Some people think this is a _____ (global / small) danger, but other people think it is only a _____ (local / good) problem.",
  formula:"[คำเชื่อมเปิด] + [สถานการณ์] + [2 มุมมองที่ต่างกัน]"},
 {key:"v1",cls:"wb-v1",title:"Part 2 · View 1 / มุมมองที่ 1: ปัญหาระดับโลก",
  trick:"\u201cมุมมองแรกว่าไง ยกเหตุผลใส่พร้อมตัวอย่าง\u201d (ฝั่งแรกคิดยังไง ทำไมถึงคิดแบบนั้น?)",
  guided:["Why do some people say this is a global danger?","Does the melting ice affect the whole world?"],
  conj:["First","On one hand","For one group"],
  starter:"_____, some people believe it is a danger for the whole _____ (world / city). Because a lot of ice is melting, it can change the climate everywhere. It can also make the sea levels go _____ (up / down).",
  formula:"[คำเชื่อมเปิดมุมมอง] + [ความเชื่อฝั่งแรก] + [เหตุผล/ตัวอย่าง]"},
 {key:"v2",cls:"wb-v2",title:"Part 3 · View 2 / มุมมองที่ 2: ปัญหาแค่ในอะแลสกา",
  trick:"\u201cอีกมุมมองคิดต่าง ใช้คำเชื่อมสร้างจุดพลิก\u201d (เปลี่ยนฝั่งแล้ว! อย่าลืมคำเชื่อมขัดแย้ง)",
  guided:["Why do other people argue it is only a local problem?","What happens to the roads, utility poles, and forests inside Alaska?"],
  conj:["But","However","On the other hand"],
  starter:"_____, other people say it is only a problem inside _____ (Alaska / Thailand). For example, the melting ground makes roads and utility poles _____ (collapse / grow). Also, warmer weather brings insects to destroy the local _____ (forests / cars).",
  formula:"[คำเชื่อมขัดแย้ง] + [ความเชื่อฝั่งที่สอง] + [ตัวอย่างในพื้นที่]"},
 {key:"op",cls:"wb-op",title:"Part 4 · My Opinion / ความคิดเห็นของฉัน",
  trick:"\u201cถึงตาส่วนตัว ฟันธงให้ชัวร์ว่าเลือกมุมมองไหน\u201d (ตาเราแล้ว! เลือกมา 1 ฝั่งพร้อมให้เหตุผล)",
  guided:["Do you think this is a warning for everyone?","Is this a \u201cpreview\u201d of the future?"],
  conj:["In my opinion","I think","For me"],
  starter:"_____, this is not just a problem for Alaska. It is a big _____ (warning / joke) for everyone. As the text says, horribly, this situation is a \u201cpreview\u201d of the _____ (future / past) for the rest of the world.",
  formula:"[คำเชื่อมแสดงความเห็น] + [จุดยืนของฉัน] + [เหตุผลสนับสนุน]"},
 {key:"close",cls:"wb-close",title:"Part 5 · Conclusion / บทสรุป",
  trick:"\u201cสรุปทิ้งท้าย ห้ามแถมประเด็นใหม่เด็ดขาด\u201d (ย้ำจุดยืนรอบสุดท้าย ปิดจบแบบสวย ๆ)",
  guided:["Is the melting of Alaska a serious danger?","What should we do?"],
  conj:["In conclusion","To sum up","Finally"],
  starter:"_____, the melting of Alaska is a serious warning for the whole world. Therefore, we must _____ (protect / destroy) our earth before it is too late.",
  formula:"[คำเชื่อมสรุป] + [ย้ำจุดยืน] + [ข้อเสนอ/สิ่งที่ควรทำ]"}
];
var wb=document.getElementById("writeBoxes");
WB.forEach(function(b){
  var div=document.createElement("div");div.className="wbox "+b.cls;
  var guided=b.guided.map(function(q,i){return '<div class="wbubble"><span class="wbnum">'+(i+1)+'</span>'+q+'</div>'}).join('');
  var conj=b.conj.map(function(c){return '<button class="wchip" onclick="insBox(\''+b.key+'\',\''+c.replace(/'/g,"\\'")+', \')">+ '+c+'</button>'}).join('');
  div.innerHTML='<div class="whead">'+b.title+'</div><div class="wbody">'+
    '<div class="wtrick">💡 <b>ทริคจำติดใจ:</b> '+b.trick+'</div>'+
    '<div class="wbubbles"><div class="wblead">❓ Guided Questions / คำถามนำ:</div>'+guided+'</div>'+
    '<div class="wlabel">🔗 Conjunctions to use / คำเชื่อมที่ใช้ได้</div><div class="wstart">'+conj+'</div>'+
    '<div class="wlabel">✏️ Sentence Starters / โครงประโยค (เติมในช่องว่าง)</div>'+
    '<div class="wstarter">'+esc(b.starter)+'</div>'+
    '<div class="wformula">🧩 <b>สูตรประกอบร่าง:</b> '+b.formula+'</div>'+
    '<textarea data-key="'+b.key+'" placeholder="✍️ เขียนส่วนนี้ของคุณ... / Write this part..."></textarea>'+
    '<div class="wstatus" id="st-'+b.key+'">0 words</div>'+
    '</div>';
  wb.appendChild(div);
});
var boxVals={topic:"",v1:"",v2:"",op:"",close:""};
wb.addEventListener("input",function(e){if(e.target.tagName==="TEXTAREA"){var k=e.target.dataset.key;boxVals[k]=e.target.value;
  var n=e.target.value.trim()?e.target.value.trim().split(/\s+/).length:0;var st=document.getElementById("st-"+k);st.textContent=n+" words";st.classList.toggle("ok",n>=4);scheduleSave()}});
function insBox(k,t){var ta=wb.querySelector('textarea[data-key="'+k+'"]');ta.value=(ta.value||"")+t;boxVals[k]=ta.value;ta.focus();
  var n=ta.value.trim()?ta.value.trim().split(/\s+/).length:0;var st=document.getElementById("st-"+k);st.textContent=n+" words";st.classList.toggle("ok",n>=4);scheduleSave()}
function assemble(){var parts=[boxVals.topic,boxVals.v1,boxVals.v2,boxVals.op,boxVals.close].map(function(x){return x.trim()}).filter(Boolean);
  var full=parts.join(" ");
  var d1=document.getElementById("draft1");if(d1){d1.value=full;}
  go(6);}

// ===== Warm-Up Practice (dropdown fill-in-the-blanks) =====
var WARM=[
 {cls:"wu-topic",head:"1 · Topic Sentence / ประโยคเปิดประเด็น",
  sents:[
   {parts:[{blank:0},{t:" the melting of Alaska is just a local issue or a global warning."}]},
   {parts:[{t:"People are discussing the problem because Alaska's "},{blank:1},{t:" are melting very fast."}]}
  ],
  drops:[
   ["There are two different views about whether","In conclusion,"],
   ["glaciers","utility poles"]
  ]},
 {cls:"wu-v1",head:"2 · View A — The Counter-Argument / มุมมองด้านแรก",
  sents:[
   {parts:[{blank:0},{t:" "},{blank:1},{t:" this is a danger for the whole world because the sea level is rising."}]},
   {parts:[{blank:2},{t:" violent storms could "},{blank:3},{t:" on small low islands."}]}
  ],
  drops:[
   ["On the one hand,","On the other hand,"],
   ["many people believe that","in my opinion, I believe that"],
   ["For example,","As a result,"],
   ["wipe out the entire community","relocate"]
  ]},
 {cls:"wu-v2",head:"3 · View B — The Alternative View / มุมมองด้านที่สอง",
  sents:[
   {parts:[{blank:0},{t:" "},{blank:1},{t:" it is mainly Alaska's problem right now."}]},
   {parts:[{blank:2},{t:" the thawing permafrost, roads and utility poles are "},{blank:3},{t:"."}]}
  ],
  drops:[
   ["On the other hand,","To begin with,"],
   ["other critics point out that","many people believe that"],
   ["As a result of","For example,"],
   ["collapsing","glaciers"]
  ]},
 {cls:"wu-op",head:"4 · Your Opinion / ทัศนะส่วนตัว",
  sents:[
   {parts:[{blank:0},{t:" the melting ice is a global crisis that affects everyone."}]}
  ],
  drops:[
   ["In my opinion, I believe that","First of all,"]
  ]},
 {cls:"wu-close",head:"5 · Concluding Sentence / ประโยคสรุป",
  sents:[
   {parts:[{blank:0},{t:" we should all care about Alaska before the situation gets worse."}]},
   {parts:[{t:"The situation is horribly affecting the environment, and it could be a "},{blank:1},{t:" of what will happen to the rest of the world."}]}
  ],
  drops:[
   ["In conclusion,","On the one hand,"],
   ["preview","thawing permafrost"]
  ]}
];
var warmEl=document.getElementById("warmup");
var warmTotal=0;
WARM.forEach(function(part,pi){
  warmTotal+=part.drops.length;
  var div=document.createElement("div");div.className="wupart "+part.cls;
  var html='<div class="wuhead">'+part.head+'</div>';
  part.sents.forEach(function(sent){
    html+='<div class="wusent">';
    sent.parts.forEach(function(seg){
      if(seg.t!==undefined){html+='<b>'+seg.t.replace(/</g,'&lt;')+'</b>';}
      else{
        var di=seg.blank;var opts=part.drops[di];
        // shuffle display but remember correct = index 0 in data
        var order=[0,1].sort(function(){return Math.random()-.5});
        var optHtml='<option value="-1">--- Choose ---</option>';
        order.forEach(function(oi){optHtml+='<option value="'+oi+'">'+opts[oi].replace(/</g,'&lt;')+'</option>'});
        html+='<select class="wusel" data-pi="'+pi+'" data-di="'+di+'" onchange="warmCheck(this)">'+optHtml+'</select><span class="wumark" data-mark="'+pi+'-'+di+'"></span>';
      }
    });
    html+='</div>';
  });
  div.innerHTML=html;warmEl.appendChild(div);
});
function warmCheck(sel){
  var correct=(sel.value==="0");
  var mark=warmEl.querySelector('[data-mark="'+sel.dataset.pi+'-'+sel.dataset.di+'"]');
  sel.classList.remove("ok","no");
  if(sel.value==="-1"){mark.textContent="";return;}
  if(correct){sel.classList.add("ok");mark.textContent="✅";}
  else{sel.classList.add("no");mark.textContent="❌";}
  scheduleSave();
}
function warmAllCorrect(){
  var sels=warmEl.querySelectorAll(".wusel");
  if(sels.length===0)return false;
  return Array.prototype.every.call(sels,function(s){return s.value==="0"});
}
function checkAllWarm(){
  var sels=warmEl.querySelectorAll(".wusel");
  sels.forEach(function(s){warmCheck(s)});
  var res=document.getElementById("warmResult");
  if(warmAllCorrect()){
    res.innerHTML='<div class="wusuccess"><div class="em">🎉</div><div class="tx">Great job! You are ready to WRITE!</div><div class="th">เก่งมาก! คุณพร้อมที่จะเขียนย่อหน้าของตัวเองแล้ว</div></div>';
  }else{
    var done=Array.prototype.filter.call(sels,function(s){return s.value==="0"}).length;
    res.innerHTML='<div class="wufail">ยังไม่ครบนะ ลองดูช่องที่เป็น ❌ แล้วเลือกใหม่ ('+done+'/'+sels.length+' ถูกแล้ว) / Keep trying the ❌ blanks.</div>';
  }
}

var RUBRIC=[
  ["TR","#1b6e9b","Task Response","ตอบโจทย์",[["4","Two views + clear opinion. / สองมุมมอง + ความเห็นชัด"],["2","One view weak. / มุมมองหนึ่งอ่อน"],["1","Only one side. / มุมมองเดียว"]]],
  ["CC","#185fa5","Coherence & Cohesion","การลำดับ/ตัวเชื่อม",[["4","5 parts in order, good connectors. / ครบ 5 ส่วน เรียงดี"],["2","Few connectors. / ตัวเชื่อมน้อย"],["1","Jumbled. / สับสน"]]],
  ["LR","#c47a1a","Lexical Resource","คลังคำ",[["4","Good topic words. / คำตรงเรื่อง"],["2","Basic, some repeats. / พื้นฐาน ซ้ำบ้าง"],["1","Very limited. / จำกัดมาก"]]],
  ["GRA","#2f9e6b","Grammar","ไวยากรณ์",[["4","Correct S+V+O, joined well. / ถูก รวมประโยคได้"],["2","Some errors. / ผิดบ้าง"],["1","Many errors. / ผิดมาก"]]],
  ["ME","#b14b8e","Mechanics","สะกด/จุด/ตัวพิมพ์",[["4","Capitals, full stops, spelling OK. / ถูก"],["2","Some slips. / ผิดบ้าง"],["1","Frequent slips. / ผิดบ่อย"]]]
];
document.getElementById("rubricBody").innerHTML=RUBRIC.map(function(d){
  return '<div class="dim"><div class="dh"><span class="code" style="background:'+d[1]+'">'+d[0]+'</span><span><span class="dname">'+d[2]+'</span><br><span class="dth">'+d[3]+'</span></span></div>'+
  d[4].map(function(b){return '<div class="band"><b>'+b[0]+'</b>'+b[1]+'</div>'}).join('')+'</div>'}).join('');
function openR(){document.getElementById("overlayR").classList.add("show");document.body.style.overflow="hidden"}
function closeR(){document.getElementById("overlayR").classList.remove("show");document.body.style.overflow=""}

var SCALE=[
  {t:"1 · Topic sentence / ประโยคนำ",color:"#1b6e9b",job:"Tell the topic. No side yet. / บอกหัวข้อ ยังไม่เลือกข้าง",how:"Name topic + say two views exist. / เอ่ยหัวข้อ บอกว่ามีสองมุมมอง",
   pills:[["easy","#e3f4ec","#27500a",["Alaska is melting.","People talk about..."]],["medium","#fdf3df","#633806",["People do not agree about..."]],["hard","#fbe8e4","#791f1f",["The melting of Alaska has become a debated issue."]]]},
  {t:"2 · View 1 + reason + example / มุมมองแรก",color:"#185fa5",job:"First view + why + example. / มุมมองแรก + เหตุผล + ตัวอย่าง",how:"State view, add because, add for example. / บอกมุมมอง ใส่ because และ for example",
   pills:[["easy","#e3f4ec","#27500a",["Some people believe...","because","for example,"]],["medium","#fdf3df","#633806",["Many argue that...","since","such as"]],["hard","#fbe8e4","#791f1f",["Supporters claim that...","This is mainly because...","A clear example is..."]]]},
  {t:"3 · View 2 + reason + example / มุมมองตรงข้าม",color:"#c47a1a",job:"Opposite view + why + example. / มุมมองตรงข้าม + เหตุผล + ตัวอย่าง",how:"Signal contrast first. / ใช้คำเชื่อมขัดแย้งก่อน",
   pills:[["easy","#e3f4ec","#27500a",["But others think...","On the other hand,"]],["medium","#fdf3df","#633806",["However, others argue...","while others believe..."]],["hard","#fbe8e4","#791f1f",["Critics counter that...","Conversely,"]]]},
  {t:"4 · Your opinion + reason / ความเห็น",color:"#2f9e6b",job:"Pick a side and say why. / เลือกข้างและบอกเหตุผล",how:"Opinion phrase + side + reason. / วลีแสดงความเห็น + เลือกข้าง + เหตุผล",
   pills:[["easy","#e3f4ec","#27500a",["I think...","so"]],["medium","#fdf3df","#633806",["In my opinion,","therefore"]],["hard","#fbe8e4","#791f1f",["From my point of view,","Weighing both sides, I believe..."]]]},
  {t:"5 · Closing sentence / ประโยคสรุป",color:"#b14b8e",job:"End by summing up. / ปิดด้วยการสรุป",how:"Restate stance briefly. / ย้ำจุดยืนสั้น ๆ",
   pills:[["easy","#e3f4ec","#27500a",["So,","In the end,"]],["medium","#fdf3df","#633806",["Therefore,","In conclusion,"]],["hard","#fbe8e4","#791f1f",["Ultimately,","All things considered,"]]]}
];
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')}
document.getElementById("scaleBody").innerHTML=SCALE.map(function(d){
  var pills=d.pills.map(function(p){var lv={easy:"ง่าย",medium:"ปานกลาง",hard:"ยาก"}[p[0]];
    return '<div class="rowline"><span class="lab"><span class="pill" style="background:'+p[1]+';color:'+p[2]+'">'+lv+'</span></span><div class="pills">'+
    p[3].map(function(x){return '<span class="pill" style="background:'+p[1]+';color:'+p[2]+'">'+esc(x)+'</span>'}).join('')+'</div></div>'}).join('');
  return '<div class="seg" style="border-left:3px solid '+d.color+'"><div class="st">'+esc(d.t)+'</div>'+
    '<div class="rowline"><span class="lab">What it does / หน้าที่</span><br>'+esc(d.job)+'</div>'+
    '<div class="rowline"><span class="lab">How to write / วิธีเขียน</span><br>'+esc(d.how)+'</div>'+
    '<div class="rowline"><span class="lab">Connectors / ตัวเชื่อม</span>'+pills+'</div></div>'}).join('');
function openScale(){document.getElementById("overlayS").classList.add("show");document.body.style.overflow="hidden"}
function closeScale(){document.getElementById("overlayS").classList.remove("show");document.body.style.overflow=""}

var COACH_PROMPT_1="Act as my friendly 'AI Coach'. I am a Beginner English student writing a paragraph about 'Alaska is Melting' (Discuss Both Views and Give Opinion). Review my First Draft below. Rules:\nScore: Give a practice score out of 25 (TR, CC, LR, GRA, ME - 5 points each). MUST include exactly: '\ud83d\udca1 \u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38: \u0e19\u0e35\u0e48\u0e04\u0e37\u0e2d\u0e04\u0e30\u0e41\u0e19\u0e19\u0e0b\u0e49\u0e2d\u0e21\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19 \u0e04\u0e30\u0e41\u0e19\u0e19\u0e08\u0e23\u0e34\u0e07\u0e08\u0e30\u0e21\u0e32\u0e08\u0e32\u0e01\u0e01\u0e32\u0e23\u0e1b\u0e23\u0e30\u0e40\u0e21\u0e34\u0e19\u0e42\u0e14\u0e22\u0e04\u0e38\u0e13\u0e04\u0e23\u0e39\u0e19\u0e30\u0e04\u0e23\u0e31\u0e1a'\nFeedback: Focus on 1-2 major points.\n\ud83c\udf1f \u0e08\u0e38\u0e14\u0e41\u0e02\u0e47\u0e07 (Strengths): Link to the 5 dimensions.\n\ud83d\udd0d \u0e08\u0e38\u0e14\u0e2d\u0e48\u0e2d\u0e19 (Weaknesses): You MUST quote my exact words/sentences. Explain why it needs adjusting.\n\ud83d\udee0\ufe0f \u0e08\u0e38\u0e14\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e1e\u0e31\u0e12\u0e19\u0e32 (Improvement hints): Give hints. DO NOT rewrite my sentences for me. DO NOT give direct answers.\nEnd with: '\u0e19\u0e35\u0e48\u0e04\u0e37\u0e2d First Draft \u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e41\u0e01\u0e49\u0e44\u0e02\u0e07\u0e32\u0e19 2 \u0e04\u0e23\u0e31\u0e49\u0e07 \u0e25\u0e2d\u0e07\u0e1b\u0e23\u0e31\u0e1a\u0e41\u0e01\u0e49\u0e41\u0e25\u0e49\u0e27\u0e2a\u0e48\u0e07 Second Draft \u0e21\u0e32\u0e43\u0e2b\u0e49\u0e40\u0e23\u0e32\u0e0a\u0e48\u0e27\u0e22\u0e14\u0e39\u0e2d\u0e35\u0e01\u0e23\u0e2d\u0e1a\u0e19\u0e30!'\nMy First Draft:\n";
var COACH_PROMPT_2="Act as my friendly 'AI Coach'. Here is my Second Draft. Rules:\nRe-evaluate and give the practice score (out of 25) across TR, CC, LR, GRA, ME. Include the same disclaimer about the teacher's real score.\nIdentify remaining \ud83c\udf1f \u0e08\u0e38\u0e14\u0e41\u0e02\u0e47\u0e07, \ud83d\udd0d \u0e08\u0e38\u0e14\u0e2d\u0e48\u0e2d\u0e19 (quote exact words), and \ud83d\udee0\ufe0f \u0e08\u0e38\u0e14\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e1e\u0e31\u0e12\u0e19\u0e32 (Improvement hints). DO NOT rewrite my sentences.\nEnd with: '\u0e19\u0e35\u0e48\u0e04\u0e37\u0e2d Second Draft \u0e19\u0e33\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e44\u0e1b\u0e1b\u0e23\u0e31\u0e1a\u0e40\u0e1b\u0e47\u0e19 Final Draft \u0e41\u0e25\u0e49\u0e27\u0e2a\u0e48\u0e07\u0e43\u0e2b\u0e49\u0e04\u0e38\u0e13\u0e04\u0e23\u0e39\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22!'\nMy Second Draft:\n";
var COACH_PROMPT_3="Act as my friendly 'AI Coach'. Here is my Final Draft. Rules:\nGive the final practice score (out of 25) across TR, CC, LR, GRA, ME. MUST include exactly: '\ud83d\udca1 \u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38: \u0e19\u0e35\u0e48\u0e04\u0e37\u0e2d\u0e04\u0e30\u0e41\u0e19\u0e19\u0e0b\u0e49\u0e2d\u0e21\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19 \u0e04\u0e30\u0e41\u0e19\u0e19\u0e08\u0e23\u0e34\u0e07\u0e08\u0e30\u0e21\u0e32\u0e08\u0e32\u0e01\u0e01\u0e32\u0e23\u0e1b\u0e23\u0e30\u0e40\u0e21\u0e34\u0e19\u0e42\u0e14\u0e22\u0e04\u0e38\u0e13\u0e04\u0e23\u0e39\u0e19\u0e30\u0e04\u0e23\u0e31\u0e1a'\nSummarize: \ud83c\udf1f \u0e08\u0e38\u0e14\u0e41\u0e02\u0e47\u0e07 (Strengths) linked to the 5 dimensions, and \ud83d\udee0\ufe0f \u0e08\u0e38\u0e14\u0e17\u0e35\u0e48\u0e22\u0e31\u0e07\u0e04\u0e27\u0e23\u0e1d\u0e36\u0e01\u0e15\u0e48\u0e2d (Areas to keep practicing) with Improvement hints. You MUST quote my exact words. DO NOT rewrite my sentences for me. DO NOT give direct answers.\nEnd with: '\u0e19\u0e35\u0e48\u0e04\u0e37\u0e2d Final Draft \u0e02\u0e2d\u0e07\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19 \u0e40\u0e01\u0e48\u0e07\u0e21\u0e32\u0e01! \u0e2d\u0e22\u0e48\u0e32\u0e25\u0e37\u0e21\u0e19\u0e33\u0e04\u0e30\u0e41\u0e19\u0e19\u0e0b\u0e49\u0e2d\u0e21\u0e41\u0e25\u0e30 feedback \u0e19\u0e35\u0e49\u0e44\u0e1b\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e43\u0e19\u0e41\u0e2d\u0e1b \u0e41\u0e25\u0e49\u0e27\u0e19\u0e33\u0e44\u0e1b\u0e25\u0e07\u0e04\u0e30\u0e41\u0e19\u0e19\u0e0b\u0e49\u0e2d\u0e21\u0e02\u0e2d\u0e07\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07\u0e19\u0e30!'\nMy Final Draft:\n";
function copyDraft(which,b){
  var id=which===1?"draft1":(which===2?"draft2":"draft3");
  var t=document.getElementById(id).value.trim();
  if(!t){blockMsg("\u270d\ufe0f","\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e07\u0e32\u0e19","\u0e40\u0e02\u0e35\u0e22\u0e19\u0e07\u0e32\u0e19\u0e43\u0e19\u0e0a\u0e48\u0e2d\u0e07\u0e19\u0e35\u0e49\u0e01\u0e48\u0e2d\u0e19 / Write in this draft first.");return}
  var pr=which===1?COACH_PROMPT_1:(which===2?COACH_PROMPT_2:COACH_PROMPT_3);
  var full=pr+t;
  if(navigator.clipboard)navigator.clipboard.writeText(full).then(function(){
    var o=b.innerHTML;b.classList.add("copied");b.innerHTML="\u2705 Copied! \u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27 \u2192 \u0e44\u0e1b\u0e27\u0e32\u0e07\u0e43\u0e19 Claude";
    setTimeout(function(){b.innerHTML=o;b.classList.remove("copied")},1900);
  });
}
function cwUpd(n){var t=document.getElementById("draft"+n).value.trim();document.getElementById("cw"+n).textContent=t?t.split(/\s+/).length:0}
function renderEssay(){
  var parts=[["Topic / ประโยคเปิดประเด็น",boxVals.topic],["View A / มุมมองด้านแรก",boxVals.v1],["View B / มุมมองด้านที่สอง",boxVals.v2],["My Opinion / ทัศนะส่วนตัว",boxVals.op],["Conclusion / ประโยคสรุป",boxVals.close]];
  var d1=document.getElementById("draft1");
  var existing=d1.value.trim();
  var any=false,html="";
  parts.forEach(function(p){html+='<span class="pt">'+p[0]+'</span>';if(p[1].trim()){html+=esc(p[1].trim());any=true}else{html+='<span class="empty">(empty / ยังว่าง)</span>'}html+="\n"});
  document.getElementById("essayOut").innerHTML=any?html:'<span class="empty">Go to step Write and fill the boxes. / ไปขั้น Write เติมกล่องก่อน</span>';
  if(any&&!existing)d1.value=parts.map(function(p){return p[1].trim()}).filter(Boolean).join(" ");
  cwUpd(1);
}
function flash(b,m){var o=b.textContent;b.textContent=m;b.classList.add("done");setTimeout(function(){b.textContent=o;b.classList.remove("done")},1500)}

// populate class dropdown ม.3/1 - ม.3/12
(function(){var sel=document.getElementById("stuClass");if(sel){var o=document.createElement("option");o.value="";o.textContent="--- เลือกชั้น ---";sel.appendChild(o);
  for(var i=1;i<=12;i++){var op=document.createElement("option");op.value="\u0e21.3/"+i;op.textContent="\u0e21.3/"+i;sel.appendChild(op)}}})();

// Think Before You Trust — AI Boss Battle logic
(function(){
  var chks=document.querySelectorAll(".thinkchk");
  var aiLinesClean=[
    "\"เชื่อฉันสิ! ฉันคือ AI ฉันไม่เคยผิด เธอแค่ทำตามที่ฉันบอกก็พอ ไม่ต้องคิดเยอะ~\" 😏",
    "\"เฮ้! ทำไมเธอเริ่มคิดเอง?! หยุดนะ!\" 😬",
    "\"ไม่นะ... เธอฉลาดขึ้นเรื่อย ๆ ฉันเริ่มคุมเธอไม่ได้!\" 😱",
    "\"อาร์ก! เธอชนะ... เธอใช้สมองคิดเอง ฉันยอมแพ้!\" 🤖💥"
  ];
  var brainLines=[
    "\"เดี๋ยวก่อน! ฉันจะคิดเอง 🧠💪\"",
    "\"AI พูดมาก็ฟัง แต่ฉันตัดสินใจเอง!\"",
    "\"ฉันเชื่อบางอย่าง ไม่เชื่อบางอย่าง!\"",
    "\"สมองฉันชนะ! 🏆 ฉันคือเจ้าของงานเขียนนี้!\""
  ];
  function upd(){
    var n=Array.prototype.filter.call(chks,function(c){return c.checked}).length;
    var box=document.getElementById("thinkbox");
    var hp=document.getElementById("hpFill"),hpt=document.getElementById("hpText");
    var aiSp=document.getElementById("aiSpeech"),brSp=document.getElementById("brainSpeech");
    var st=document.getElementById("thinkStatus");
    if(hp){hp.style.width=(n/3*100)+"%";}
    if(hpt){hpt.textContent=Math.round(n/3*100)+"%";}
    if(aiSp)aiSp.innerHTML=aiLinesClean[n];
    if(brSp)brSp.innerHTML=brainLines[n];
    if(!st)return;
    if(n===3){
      box.classList.add("won");box.classList.add("winflash");
      setTimeout(function(){box.classList.remove("winflash")},500);
      st.className="thinkstatus done";st.innerHTML="🏆 ชนะแล้ว! สมองเธอเอาชนะ AI ตัวร้ายได้ — ตอนนี้แก้งานด้วยความคิดของเธอเองได้เลย! / You beat the AI — now revise with YOUR brain!";
    }else{
      box.classList.remove("won");
      st.className="thinkstatus";
      st.innerHTML=n>0?("⚡ สู้ต่อ! พลังสมอง "+n+"/3 — ติ๊กให้ครบเพื่อล้ม AI ตัวร้าย!"):"";
    }
  }
  chks.forEach(function(c){c.addEventListener("change",function(){upd();scheduleSave()})});
  upd();
})();

// ===== PRISM teacher scoring: 5 dims -> 9 binary -> Knowledge State =====
var DIMS=[
  {code:"TR",color:"#1b6e9b",nm:"Task Response",th:"ตอบโจทย์ครบ สองมุมมอง+ความเห็น"},
  {code:"CC",color:"#185fa5",nm:"Coherence & Cohesion",th:"การลำดับและตัวเชื่อม"},
  {code:"LR",color:"#c47a1a",nm:"Lexical Resource",th:"คลังคำศัพท์"},
  {code:"GRA",color:"#2f9e6b",nm:"Grammatical Range & Accuracy",th:"ความถูกต้องไวยากรณ์"},
  {code:"ME",color:"#b14b8e",nm:"Mechanical Accuracy",th:"สะกด/วรรคตอน/ตัวพิมพ์"}
];
var scores={TR:0,CC:0,LR:0,GRA:0,ME:0};

// ===== Practice Score (student self-rates, 25 pts) =====
var psScores={TR:0,CC:0,LR:0,GRA:0,ME:0};
var psRows=document.getElementById("psRows");
DIMS.forEach(function(d){
  var row=document.createElement("div");row.className="psdim";
  var btns="";for(var v=1;v<=5;v++)btns+='<button class="psbtn" data-code="'+d.code+'" data-v="'+v+'">'+v+'</button>';
  row.innerHTML='<div class="pslab"><span class="pscode" style="background:'+d.color+'">'+d.code+'</span><span class="psnm">'+d.nm+' <small>'+d.th+'</small></span></div><div class="psrow">'+btns+'</div>';
  psRows.appendChild(row);
});
psRows.querySelectorAll(".psbtn").forEach(function(b){b.onclick=function(){
  var code=b.dataset.code,v=+b.dataset.v;psScores[code]=v;
  psRows.querySelectorAll('.psbtn[data-code="'+code+'"]').forEach(function(x){
    var on=+x.dataset.v===v;x.classList.toggle("on",on);if(on)x.style.background=DIMS.find(function(d){return d.code===code}).color;else x.style.background=""});
  var tot=psScores.TR+psScores.CC+psScores.LR+psScores.GRA+psScores.ME;
  document.getElementById("psTotal").textContent=tot;
  scheduleSave();
}});
// ===== Diagnostic Report (student-facing) : psScores -> 9 binary -> K=14 state =====
// K=14 model (revised, p=.073). skills a=TR b=CC c=LR d=GRA e=ME
// prerequisites: e→d, c→b (relaxed d), e→c relaxed, a independent
// 4 groups: Beginner=∅, Structure OK={d,e}, Language Dev={c,d,e}, Mastery={a,b,c,d,e}
function classifyState(sk){
  // count mastered core skills; map to 4 reporting groups consistent with K=14 structure
  var langCore = sk.e && sk.c && sk.d;          // {c,d,e} core present
  var mastery  = sk.a && sk.b && sk.c && sk.d && sk.e;
  var structOK = sk.d && sk.e;                  // {d,e}
  if(mastery)        return {state:"Mastery",       color:"#7c5cc4", desc:"เชี่ยวชาญครบทุกมิติ / Mastered all skills"};
  if(langCore)       return {state:"Language Dev",  color:"#1b6e9b", desc:"พัฒนาภาษาได้ดี (LR+GRA+ME) / Language developed"};
  if(structOK)       return {state:"Structure OK",  color:"#c47a1a", desc:"โครงสร้าง+กลไกเริ่มมั่นคง / Structure & mechanics forming"};
  return {state:"Beginner", color:"#2f9e6b", desc:"ระยะเริ่มต้น เน้นพื้นฐาน / Beginner — build basics"};
}

var DIM_FULL={
  TR:{nm:"Task Response",th:"ตอบโจทย์: สองมุมมอง + ความเห็น",color:"#1b6e9b"},
  CC:{nm:"Coherence & Cohesion",th:"การลำดับและตัวเชื่อม",color:"#185fa5"},
  LR:{nm:"Lexical Resource",th:"คลังคำศัพท์",color:"#c47a1a"},
  GRA:{nm:"Grammar Range & Accuracy",th:"ความถูกต้องไวยากรณ์",color:"#2f9e6b"},
  ME:{nm:"Mechanics",th:"สะกด/วรรคตอน/ตัวพิมพ์",color:"#b14b8e"}
};

// practical improvement actions per dimension (drawn on by the plan)
var DIM_PLAN={
  TR:{focus:"ตอบโจทย์ให้ครบ (สองมุมมอง + ความเห็นของตัวเอง)",
      how:"อ่านงานตัวเองแล้วถามว่า ‘มีมุมมองโลก + มุมมองเฉพาะอะแลสกา + ความเห็นฉันครบไหม’ ถ้าขาดส่วนใด ให้กลับไปเติมจากกล่องในขั้น Write"},
  CC:{focus:"การลำดับและคำเชื่อม (On the one hand / However / In conclusion)",
      how:"ไฮไลต์คำเชื่อมในงานตัวเอง ถ้าแต่ละส่วนยังไม่มีคำเชื่อมเปิด ให้เพิ่มจากชุดคำเชื่อมในขั้น Write แล้วอ่านออกเสียงดูว่าลื่นไหม"},
  LR:{focus:"คลังคำศัพท์ (เลือกคำให้ตรงและหลากหลาย)",
      how:"หาคำซ้ำในงาน เช่น big/problem แล้วลองแทนด้วยคำที่เรียนจากบทอ่าน เช่น danger, crisis, warning, collapse, preview"},
  GRA:{focus:"ความถูกต้องไวยากรณ์ (ประธาน-กริยา, รูปกาล)",
      how:"อ่านทีละประโยค ตรวจ ‘ใคร + ทำอะไร’ ให้ครบ และดูว่า verb เติม s/ed ถูกไหม โดยเฉพาะ is/are และ make/makes"},
  ME:{focus:"กลไกการเขียน (ตัวพิมพ์ใหญ่ จุด เครื่องหมาย)",
      how:"ตรวจว่าทุกประโยคขึ้นต้นด้วยตัวพิมพ์ใหญ่และจบด้วยจุด . ชื่อเฉพาะเช่น Alaska ต้องขึ้นต้นตัวใหญ่เสมอ"}
};

function buildReport(){
  // ใช้คะแนนซ้อมที่นักเรียนให้ไว้ (psScores)
  if(Object.keys(psScores).some(function(k){return psScores[k]===0})){
    blockMsg("📊","ยังไม่ครบ / Not yet","ลงคะแนนซ้อมให้ครบ 5 มิติด้านบนก่อน แล้วค่อยสร้างรายงาน / Give your practice score (5 dims) first.");
    return;
  }
  var s=psScores;
  // cut-points -> q1..q9 (เหมือนระบบ PRISM)
  var q={q1:s.TR>=3?1:0,q2:s.TR>=4?1:0,q3:s.ME>=3?1:0,q4:s.LR>=3?1:0,q5:s.LR>=4?1:0,q6:s.GRA>=3?1:0,q7:s.GRA>=4?1:0,q8:s.CC>=3?1:0,q9:s.CC>=4?1:0};
  var qstr=[q.q1,q.q2,q.q3,q.q4,q.q5,q.q6,q.q7,q.q8,q.q9].join("");
  document.getElementById("qstring").innerHTML=qstr;
  var QINFO=[["q1","TR≥3","โครงสร้างครบ"],["q2","TR≥4","จุดยืนชัด"],["q3","ME≥3","กลไกพื้นฐาน"],
    ["q4","LR≥3","คำพื้นฐาน"],["q5","LR≥4","คำวิชาการ"],["q6","GRA≥3","ไวยากรณ์พื้นฐาน"],
    ["q7","GRA≥4","ประโยคซับซ้อน"],["q8","CC≥3","เชื่อมพื้นฐาน"],["q9","CC≥4","เชื่อมลื่นไหล"]];
  document.getElementById("qgrid").innerHTML=QINFO.map(function(qi){var v=q[qi[0]];
    return '<div class="qcell '+(v?"pass":"fail")+'"><span class="qn">'+qi[0]+'</span><span class="qd">'+qi[1]+'</span><span class="qv">'+(v?"✓ 1":"✗ 0")+'</span><span class="qd">'+qi[2]+'</span></div>'}).join('');

  // skills (>=3) for K=14 mapping
  var sk={a:s.TR>=3,b:s.CC>=3,c:s.LR>=3,d:s.GRA>=3,e:s.ME>=3};
  var total=s.TR+s.CC+s.LR+s.GRA+s.ME;
  var ks=classifyState(sk);
  document.getElementById("stateBox").style.background=ks.color;
  document.getElementById("stateBox").innerHTML='<div class="stt">Knowledge State (K=14 model)</div><div class="stn">'+ks.state+'</div><div class="sts">'+ks.desc+'</div><div class="sttotal">คะแนนซ้อมรวม: '+total+' / 25 · q1–q9: '+qstr+'</div>';

  // dashboard 5 dims
  var order=["TR","CC","LR","GRA","ME"];
  document.getElementById("dash").innerHTML=order.map(function(code){
    var v=s[code],pct=v/5*100,d=DIM_FULL[code];
    return '<div class="dashrow"><span class="dashcode" style="background:'+d.color+'">'+code+'</span><div class="dashbar"><div class="dashfill" style="width:'+pct+'%;background:'+d.color+'"></div></div><span class="dashval">'+v+'/5</span></div>';
  }).join('');

  // diagnostic signal (Flag) — based on lowest dim + prerequisite check
  var min=Math.min(s.TR,s.CC,s.LR,s.GRA,s.ME);
  var low=order.filter(function(c){return s[c]===min});
  var flagEl=document.getElementById("flagBox");
  // prerequisite violation flags (K=14): e before d; c before b
  var preWarn=[];
  if(s.CC>=3 && s.LR<3) preWarn.push("ใช้ตัวเชื่อม (CC) ได้ แต่คลังคำ (LR) ยังอ่อน — ปกติ LR ควรมาก่อน CC");
  if(s.GRA>=3 && s.ME<3) preWarn.push("ไวยากรณ์ (GRA) เริ่มดี แต่กลไกพื้นฐาน (ME) ยังอ่อน — ปกติ ME ควรมาก่อน GRA");
  var flagClass,flagTtl,flagBody;
  if(min>=4){flagClass="ok";flagTtl="🟢 สัญญาณ: แข็งแรงทุกมิติ";flagBody="ทุกมิติอยู่ในเกณฑ์ดี (≥4) เยี่ยมมาก! ลองท้าทายตัวเองด้วยคำเชื่อมหรือคำศัพท์ที่ซับซ้อนขึ้น";}
  else if(min>=3){flagClass="warn";flagTtl="🟡 สัญญาณ: มีจุดที่ควรพัฒนา";flagBody="มิติที่ควรดูแลเป็นพิเศษ: <b>"+low.join(", ")+"</b> (ต่ำสุด = "+min+"/5)";}
  else{flagClass="alert";flagTtl="🔴 สัญญาณ: มีจุดอ่อนที่ต้องเร่งพัฒนา";flagBody="มิติที่ต้องพัฒนาเร่งด่วน: <b>"+low.join(", ")+"</b> (ต่ำสุด = "+min+"/5)";}
  if(preWarn.length)flagBody+='<div style="margin-top:7px;font-size:.8rem">⚠️ '+preWarn.join("<br>⚠️ ")+'</div>';
  flagEl.className="flagbox "+flagClass;
  flagEl.innerHTML='<div class="flagttl">'+flagTtl+'</div>'+flagBody;

  // 3-step improvement plan (practical), anchored to AI Feedback Record
  var aiRec=(document.getElementById("aiRecord")||{}).value.trim();
  // rank dims by score asc → 3 lowest become the 3 steps (or fill from order)
  var ranked=order.slice().sort(function(a,b){return s[a]-s[b]});
  var top3=ranked.slice(0,3);
  var plan=top3.map(function(code,i){
    var d=DIM_FULL[code],p=DIM_PLAN[code];
    return '<div class="planstep"><span class="pstepnum">STEP '+(i+1)+'</span>'+
      '<div class="pstepttl">พัฒนา '+code+' — '+d.nm+' (ตอนนี้ '+s[code]+'/5)</div>'+
      '<div class="pstepbody"><b>เป้าหมาย:</b> '+p.focus+'</div>'+
      '<div class="pstephow"><b>วิธีฝึกแบบลงมือทำ:</b> '+p.how+'</div></div>';
  }).join('');
  var refHtml;
  if(aiRec){
    refHtml='<div class="planref">📌 <b>อิงจาก Feedback ของ AI Coach ที่คุณบันทึกไว้:</b><br>“'+esc(aiRec.slice(0,300))+(aiRec.length>300?'…':'')+'”<br><br>ลองนำจุดที่ AI ชี้ มาจับคู่กับ 3 ขั้นด้านบน แล้วแก้ใน Draft ถัดไปทีละขั้น</div>';
  }else{
    refHtml='<div class="planref">📌 เคล็ดลับ: ถ้าวาง Feedback จาก AI Coach ไว้ในช่อง “บันทึกหลักฐานจาก AI” ด้านบน ระบบจะดึงมาผูกกับแผนนี้ให้ เพื่อให้คุณรู้ว่าต้องแก้อะไรจริง ๆ</div>';
  }
  document.getElementById("planBox").innerHTML=plan+refHtml;

  document.getElementById("prismResult").classList.add("show");
  // stash for submission
  window.PRISM_RESULT={scores:Object.assign({},psScores),q:q,qstring:qstr,total:total,knowledgeState:ks.state,model:"K=14"};
}

function val(id){var el=document.getElementById(id);return el?(el.value||"").trim():""}
function chkBits(sel){return Array.prototype.map.call(document.querySelectorAll(sel),function(c){return c.checked?1:0})}

function collectSubmissionData(){
  var prism=window.PRISM_RESULT;
  return{
    student:{name:val("stuName"),class:val("stuClass"),no:val("stuNo"),email:val("stuEmail")},
    drafts:{first:val("draft1"),second:val("draft2"),final:val("draft3")},
    aiFeedbackRecord:val("aiRecord"),
    thinkBeforeTrust:{checks:chkBits(".thinkchk"),critique:val("aiCritique")},
    practiceScore:{scores:Object.assign({},psScores),total:psScores.TR+psScores.CC+psScores.LR+psScores.GRA+psScores.ME},
    selfCheck:chkBits(".selfchk"),
    reflect:{didWell:val("refl1"),toImprove:val("refl2")},
    teacher:prism?{
      scores:prism.scores,
      q1_q9:prism.qstring,
      knowledgeState:prism.knowledgeState,
      total:prism.total,
      model:prism.model,
      feedbackGood:val("tfb1"),
      feedbackNext:val("tfb2")
    }:null
  };
}

var SUBMIT_RULES=[
  {test:function(d){return!d.student.name},msg:"กรุณากรอกชื่อ-นามสกุล / Please fill your name."},
  {test:function(d){return!d.student.class},msg:"กรุณาเลือกชั้น / Please choose your class."},
  {test:function(d){return!d.student.no},msg:"กรุณากรอกเลขที่ / Please fill your number."},
  {test:function(d){return!d.student.email||d.student.email.indexOf("@")<0},msg:"กรุณากรอกอีเมลโรงเรียนให้ถูกต้อง / Please fill a valid school email."},
  {test:function(d){return!d.drafts.first},msg:"ยังไม่มีร่างแรก กลับไปขั้น Write ก่อน / First Draft is empty."},
  {test:function(d){return!d.drafts.second},msg:"กรุณาเขียน Second Draft (แก้ครั้งที่ 1) / Please write your Second Draft."},
  {test:function(d){return!d.drafts.final},msg:"กรุณาเขียน Final Draft (ฉบับสมบูรณ์) / Please write your Final Draft."},
  {test:function(d){return!d.aiFeedbackRecord},msg:"กรุณาวาง Feedback จาก AI / Please paste the AI feedback."},
  {test:function(d){return d.thinkBeforeTrust.checks.filter(Boolean).length<3},msg:"ก่อนแก้งาน: กรุณาอ่าน feedback แล้วติ๊ก \"หยุดคิดสักนิด\" ให้ครบ 3 ข้อ / Tick all 3 'Think Before You Trust' boxes."},
  {test:function(d){return!d.practiceScore.total},msg:"กรุณาลงคะแนนซ้อมให้ครบ 5 มิติ / Please give your practice score (5 dimensions)."},
  {test:function(d){return["TR","CC","LR","GRA","ME"].some(function(k){return!psScores[k]})},msg:"คะแนนซ้อมยังไม่ครบทุกมิติ / Practice score: rate all 5 dimensions."},
  {test:function(d){return d.selfCheck.filter(Boolean).length<5},msg:"กรุณาติ๊กตรวจสอบตนเองให้ครบ 5 ข้อ / Please tick all 5 self-check items."},
  {test:function(d){return!d.reflect.didWell},msg:"กรุณาเขียนสิ่งที่ทำได้ดี / Please fill 'one thing I did well'."},
  {test:function(d){return!d.reflect.toImprove},msg:"กรุณาเขียนสิ่งที่อยากพัฒนา / Please fill 'one thing to improve'."}
];

function validateSubmission(data){
  for(var i=0;i<SUBMIT_RULES.length;i++){
    if(SUBMIT_RULES[i].test(data))return SUBMIT_RULES[i].msg;
  }
  return null;
}

function toSupabaseRow(data){
  var t=data.teacher||{};
  return{
    student_name:data.student.name,
    student_class:data.student.class,
    student_no:data.student.no,
    student_email:data.student.email,
    draft_first:data.drafts.first,
    draft_second:data.drafts.second,
    draft_final:data.drafts.final,
    ai_feedback_record:data.aiFeedbackRecord,
    think_checks:data.thinkBeforeTrust.checks,
    think_critique:data.thinkBeforeTrust.critique||"",
    practice_tr:data.practiceScore.scores.TR,
    practice_cc:data.practiceScore.scores.CC,
    practice_lr:data.practiceScore.scores.LR,
    practice_gra:data.practiceScore.scores.GRA,
    practice_me:data.practiceScore.scores.ME,
    practice_total:data.practiceScore.total,
    self_check:data.selfCheck,
    reflect_did_well:data.reflect.didWell,
    reflect_to_improve:data.reflect.toImprove,
    prism_qstring:t.q1_q9||null,
    prism_knowledge_state:t.knowledgeState||null,
    prism_total:t.total!=null?t.total:null,
    prism_model:t.model||null,
    teacher_feedback_good:t.feedbackGood||null,
    teacher_feedback_next:t.feedbackNext||null,
    payload_json:data
  };
}

var submitBusy=false;
function submitSubmission(){
  if(submitBusy)return;
  var note=document.getElementById("submitNote");
  var btn=document.getElementById("submitBtn");
  var data=collectSubmissionData();
  var err=validateSubmission(data);
  if(err){note.className="submitnote";note.innerHTML="⚠️ "+err;return;}
  if(!workerUrl){
    note.className="submitnote";
    note.innerHTML="⚠️ ตั้งค่า Worker URL ใน config.js ก่อน / Set up config.js with your Cloudflare Worker URL.";
    return;
  }
  submitBusy=true;
  btn.disabled=true;
  btn.textContent="⏳ กำลังส่ง... / Sending...";
  note.className="submitnote";
  note.innerHTML="";

  // 1. Get JWT from Worker /auth using student's email
  fetch(workerUrl.replace(/\/$/, "") + "/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: data.student.email })
  })
  .then(function(authRes){
    if(!authRes.ok){
      return authRes.json().then(function(err){ throw new Error(err.error || "Auth failed") });
    }
    return authRes.json();
  })
  .then(function(authData){
    var token = authData.token;
    var row = toSupabaseRow(data);

    // 2. Submit payload with JWT Bearer Token to /submit
    return fetch(workerUrl.replace(/\/$/, "") + "/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(row)
    });
  })
  .then(function(submitRes){
    if(!submitRes.ok){
      return submitRes.json().then(function(err){ throw new Error(err.error || "Submission failed") });
    }
    return submitRes.json();
  })
  .then(function(res){
    note.className="submitnote ok";
    note.innerHTML="✅ ส่งงานแล้ว! ครูจะเห็นงานใน Supabase / Submitted successfully!";
    console.log("PRISM submission saved via Cloudflare Worker");
  }).catch(function(e){
    note.className="submitnote";
    note.innerHTML="⚠️ ส่งไม่สำเร็จ: "+(e.message||e)+". ตรวจ config.js และรัน Worker / Submit failed.";
    console.error(e);
  }).finally(function(){
    submitBusy=false;
    btn.disabled=false;
    btn.textContent="🚀 ส่งงาน / Submit";
  });
}

function getMcqSolved(id){
  var arr=[];
  document.querySelectorAll("#"+id+" .ex").forEach(function(ex,i){
    if(ex.querySelector(".opt.correct"))arr.push(i);
  });
  return arr;
}

function collectSaveState(){
  var warm=[];
  if(typeof warmEl!=="undefined"&&warmEl){
    Array.prototype.forEach.call(warmEl.querySelectorAll(".wusel"),function(s){
      warm.push({pi:s.dataset.pi,di:s.dataset.di,v:s.value});
    });
  }
  return{
    v:1,
    done:done.slice(),
    current:current,
    fields:{
      stuName:val("stuName"),stuClass:val("stuClass"),stuNo:val("stuNo"),stuEmail:val("stuEmail"),
      draft1:val("draft1"),draft2:val("draft2"),draft3:val("draft3"),
      aiRecord:val("aiRecord"),aiCritique:val("aiCritique"),refl1:val("refl1"),refl2:val("refl2")
    },
    boxVals:Object.assign({},boxVals),
    psScores:Object.assign({},psScores),
    thinkchk:chkBits(".thinkchk"),
    selfchk:chkBits(".selfchk"),
    botStep:botStep,botStance:botStance,taskBotDone:taskBotDone,
    botChosen:BOT_SCRIPT.map(function(n){return n.chosen||null}),
    taPlace:Object.assign({},taPlace),
    place:Object.assign({},place),
    matched:Object.assign({},matched),
    orderNs:orderPlaced.map(function(o){return o.n}),
    sortDone:sortDone.slice(),
    modelSeen:Object.assign({},modelSeen),
    warm:warm,
    mcqSolved:{p3q:getMcqSolved("p3q"),p3qB:getMcqSolved("p3qB")},
    prismResult:window.PRISM_RESULT||null
  };
}

function saveProgress(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(collectSaveState()))}catch(e){}
}

function scheduleSave(){
  if(saveTimer)clearTimeout(saveTimer);
  saveTimer=setTimeout(saveProgress,350);
}

function setField(id,v){
  var el=document.getElementById(id);
  if(el&&v!=null)el.value=v;
}

function restorePsUI(){
  DIMS.forEach(function(d){
    var v=psScores[d.code];
    if(!v)return;
    psRows.querySelectorAll('.psbtn[data-code="'+d.code+'"]').forEach(function(x){
      var on=+x.dataset.v===v;
      x.classList.toggle("on",on);
      x.style.background=on?d.color:"";
    });
  });
  var pt=document.getElementById("psTotal");
  if(pt)pt.textContent=psScores.TR+psScores.CC+psScores.LR+psScores.GRA+psScores.ME;
}

function setChkBits(sel,bits){
  document.querySelectorAll(sel).forEach(function(c,i){c.checked=!!(bits&&bits[i])});
}

function loadProgress(){
  var s=pendingRestore;
  if(!s||s.v!==1)return;
  if(s.done&&s.done.length===7)done=s.done.slice();
  if(s.fields)Object.keys(s.fields).forEach(function(k){setField(k,s.fields[k])});
  if(s.boxVals){
    Object.assign(boxVals,s.boxVals);
    Object.keys(boxVals).forEach(function(k){
      var ta=wb.querySelector('textarea[data-key="'+k+'"]');
      if(!ta)return;
      ta.value=boxVals[k];
      var n=boxVals[k].trim()?boxVals[k].trim().split(/\s+/).length:0;
      var st=document.getElementById("st-"+k);
      if(st){st.textContent=n+" words";st.classList.toggle("ok",n>=4)}
    });
  }
  if(s.psScores)Object.assign(psScores,s.psScores);
  if(s.thinkchk)setChkBits(".thinkchk",s.thinkchk);
  if(s.selfchk)setChkBits(".selfchk",s.selfchk);
  if(s.botStance!=null)botStance=s.botStance;
  if(s.botStep!=null)botStep=s.botStep;
  if(s.taskBotDone)taskBotDone=!!s.taskBotDone;
  if(s.botChosen)s.botChosen.forEach(function(ch,i){if(BOT_SCRIPT[i]&&ch)BOT_SCRIPT[i].chosen=ch});
  if(s.taPlace)taPlace=Object.assign({},s.taPlace);
  if(s.place)place=Object.assign({},s.place);
  if(s.matched)matched=Object.assign({},s.matched);
  if(s.orderNs)orderPlaced=s.orderNs.map(function(n){return ORDER.find(function(o){return o.n===n})}).filter(Boolean);
  if(s.sortDone)sortDone=s.sortDone.slice();
  if(s.modelSeen)modelSeen=Object.assign({},s.modelSeen);
  if(s.prismResult)window.PRISM_RESULT=s.prismResult;

  taRender();
  renderPool();
  renderMatch();
  renderOrder();
  renderChat();
  if(s.warm)s.warm.forEach(function(w){
    var sel=warmEl.querySelector('.wusel[data-pi="'+w.pi+'"][data-di="'+w.di+'"]');
    if(sel&&w.v!=null){sel.value=w.v;warmCheck(sel)}
  });
  restorePsUI();
  cwUpd(2);cwUpd(3);
  renderProgress();
  renderHub();
  if(typeof checkStance==="function")checkStance();
  document.querySelectorAll(".thinkchk").forEach(function(c){c.dispatchEvent(new Event("change"))});
  if(s.prismResult)try{buildReport()}catch(e){}

  var dest=s.current;
  if(dest==="hub"||dest==null)go("hub");
  else if(typeof dest==="number"&&dest>=0&&dest<7)go(dest);

  pendingRestore=null;
}

document.addEventListener("input",function(e){if(e.target.closest&&e.target.closest(".app"))scheduleSave()},true);
document.addEventListener("change",function(e){if(e.target.closest&&e.target.closest(".app"))scheduleSave()},true);

loadProgress();