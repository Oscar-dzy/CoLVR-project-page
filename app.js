"use strict";

// Values are transcribed from the supplied LaTeX tables, not inferred from prose.
const experiments = {
  main: {
    labels: ["VSP · Total", "Jigsaw", "Tetris"],
    titles: ["Visual Spatial Planning", "Jigsaw reasoning", "Tetris spatial completion"],
    descriptions: ["Overall accuracy across seen and unseen VSP levels.", "Recover missing regions through visual understanding.", "Select pieces that complete a target shape without gaps or overlap."],
    rows: [
      ["GPT-4o", 28.50, 36.00, 30.67],
      ["Gemini-2.5-flash", 53.83, 43.33, 31.33],
      ["InternVL3.5-8B", 6.67, 19.33, 22.00],
      ["Qwen2.5-VL-7B", 4.50, 24.00, 24.00],
      ["Qwen2.5-VL-7B + CoT", 6.83, 24.67, 21.33],
      ["Qwen2.5-VL-7B + SFT", 59.17, 67.33, 42.67],
      ["Qwen2.5-VL-7B + SFT + GRPO", 55.33, 68.00, 41.33],
      ["Mirage", 60.00, 70.00, 43.33],
      ["CoLVR (Ours)", 65.83, 78.00, 44.67]
    ],
    chartRows: [0, 1, 5, 6, 7, 8],
    note: "Source: main results table. All scores are accuracy (%); improvements are absolute percentage points. CoLVR improves over Mirage by 5.83 pp on VSP and 8.00 pp on Jigsaw. “Tertis” in the paper is displayed as “Tetris”."
  },
  ood: {
    labels: ["VisPuzzle", "V*", "MMVP", "MMStar", "CV-Bench"],
    titles: ["Visual puzzles", "Guided visual search", "Fine-grained visual perception", "MMStar generalization", "Vision-centric understanding"],
    descriptions: Array(5).fill("Cross-task evaluation of models trained on Jigsaw; LVR uses official checkpoints."),
    rows: [["Mirage", 36.75, 75.92, 68.33, 55.27, 72.40], ["LVR (8 steps)", 37.00, 80.10, 69.33, 58.07, 75.51], ["CoLVR (Ours)", 37.00, 80.63, 72.00, 61.47, 76.95]],
    chartRows: [0, 1, 2],
    note: "Source: out-of-domain results table. CoLVR and Mirage are trained on Jigsaw; LVR uses official checkpoints. MMStar: 61.47% for CoLVR, +6.20 pp over Mirage and +3.40 pp over LVR. CoLVR ties LVR on VisPuzzle."
  },
  ablation: {
    labels: ["VSP · Total", "Jigsaw", "Tetris"],
    titles: ["What does each stage contribute?", "Ablations on Jigsaw", "Ablations on Tetris"],
    descriptions: Array(3).fill("Contrastive SFT and trajectory rewards make complementary contributions."),
    rows: [["Warm-up only", 60.17, 74.70, 40.00], ["Warm-up + trajectory GRPO", 60.17, 75.33, 40.00], ["Without trajectory GRPO", 63.50, 78.00, 42.67], ["With normal GRPO", 60.33, 76.00, 38.67], ["CoLVR (full)", 65.83, 78.00, 44.67]],
    chartRows: [0, 1, 2, 3, 4],
    note: "Source: component ablation table. “Without trajectory GRPO” retains warm-up and contrastive SFT. “With normal GRPO” replaces trajectory-reward GRPO with standard GRPO. Full CoLVR improves VSP Total by 2.33 pp over the model without the final stage."
  }
};
let experiment = "main";
const select = document.querySelector("#benchmark-select");
const table = document.querySelector("#results-table");
function renderResults() {
  const data = experiments[experiment];
  const index = Number(select.value);
  document.querySelector("#chart-title").textContent = data.titles[index];
  document.querySelector("#chart-subtitle").textContent = data.descriptions[index];
  document.querySelector("#result-note").textContent = data.note;
  document.querySelector("#bar-chart").innerHTML = data.chartRows.map((r, i) => {
    const row = data.rows[r], ours = row[0].startsWith("CoLVR");
    return `<div class="bar-row ${ours ? "ours" : ""}"><span class="bar-label">${row[0]}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${row[index+1]}%;animation-delay:${i*35}ms"></div></div><span class="bar-value">${row[index+1].toFixed(2)}<span class="sr-only"> percent</span></span></div>`;
  }).join("") + '<div class="chart-scale" aria-hidden="true"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100%</span></div>';
  table.innerHTML = `<caption class="sr-only">${experiment === "ood" ? "Out-of-domain" : experiment === "ablation" ? "Component ablation" : "Main benchmark"} results, accuracy in percent</caption><thead><tr><th scope="col">Model</th>${data.labels.map(x=>`<th scope="col">${x}</th>`).join("")}</tr></thead><tbody>${data.rows.map(row=>`<tr class="${row[0].startsWith("CoLVR") ? "ours" : ""}"><th scope="row">${row[0]}</th>${row.slice(1).map(n=>`<td>${n.toFixed(2)}</td>`).join("")}</tr>`).join("")}</tbody>`;
}
function activateTab(button) {
  const list = button.closest('[role="tablist"]');
  list.querySelectorAll('[role="tab"]').forEach(tab=>{
    const active = tab === button;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  document.getElementById(button.getAttribute("aria-controls")).setAttribute("aria-labelledby", button.id);
}
document.querySelectorAll("[data-results]").forEach(button=>button.addEventListener("click",()=>{
  activateTab(button);
  experiment = button.dataset.results;
  select.innerHTML = experiments[experiment].labels.map((label,i)=>`<option value="${i}">${label}</option>`).join("");
  // MMStar is the headline OOD comparison.
  select.value = experiment === "ood" ? "3" : "0";
  renderResults();
}));
select.addEventListener("change", renderResults);
renderResults();

const stages = [
  ["START WITH VISUAL SEMANTICS", "Align latent hidden states with the mean-pooled input image representation. An auxiliary answer loss preserves language generation while the model acquires an initial visual reasoning capability.", "L<sub>warmup</sub> = L<sub>cosine</sub> + λ₁ L<sub>CE</sub>"],
  ["GUIDE WITH RELATIVE RELATIONSHIPS", "Use result-hint images as positives. Construct structured negatives by rotating the input-to-hint semantic direction with an orthogonal perturbation. InfoNCE encourages discrimination without assigning a fixed target to each reasoning step.", "L<sub>SFT</sub> = λ₂ L<sub>InfoNCE</sub> + L<sub>CE</sub>"],
  ["OPTIMIZE THE REASONING TRAJECTORY", "Compare hidden-state trajectories from correct and incorrect rollouts. A case-wise contrastive reward supplies latent-level preferences, alongside format and answer-correctness rewards in GRPO.", "R<sub>total</sub> = R<sub>format</sub> + R<sub>correct</sub> + R<sub>latent</sub>"]
];
document.querySelectorAll("[data-stage]").forEach(button=>button.addEventListener("click",()=>{
  activateTab(button);
  document.querySelectorAll("[data-stage]").forEach(b=>b.classList.toggle("selected",b===button));
  const [title, description, formula] = stages[Number(button.dataset.stage)];
  document.querySelector("#stage-detail").innerHTML = `<span class="eyebrow">${title}</span><p>${description}</p><div class="formula">${formula}</div>`;
}));

const evidence = {
  "latent-space": ["UMAP visualization of latent tokens", "UMAP projections of the first four latent tokens on VSP levels 3 and 4.", "A more dispersed latent space.", "CoLVR’s latent states are more spread out in the paper’s UMAP visualizations, while Mirage’s states form compact clusters. These 2D projections illustrate representation diversity; they are complemented by measurements in the original latent space.", 2400, 838],
  attention: ["Attention maps across VSP levels", "Attention maps for the first four latent tokens, comparing Mirage and CoLVR on VSP levels 3–6.", "Attention that moves with the task.", "The paper’s attention maps show more varied spatial coverage across CoLVR’s latent reasoning steps. This qualitative evidence suggests that its representations explore a broader range of task-relevant visual regions.", 2400, 1153],
  uniformity: ["Hyperspherical uniformity of latent states", "Hyperspherical uniformity on VSP levels 3–8 and Jigsaw. Lower is more uniform.", "Diversity in the original latent space.", "Beyond 2D projections, the paper measures hyperspherical uniformity on normalized latent hidden states. CoLVR has lower values across the evaluated tasks, supporting reduced representation concentration in the original space.", 2400, 1350],
  robustness: ["VSP accuracy under Gaussian latent perturbations", "VSP accuracy under Gaussian perturbations of the propagated hidden state.", "Room to explore. Resilience to noise.", "When Gaussian noise is injected into latent reasoning states, CoLVR retains relatively stable performance across the tested noise levels, while Mirage degrades. This controlled stress test supports the robustness of CoLVR’s learned latent representations.", 2400, 1470]
};
document.querySelectorAll("[data-evidence]").forEach(button=>button.addEventListener("click",()=>{
  activateTab(button);
  const key = button.dataset.evidence, [title, caption, heading, text, width, height] = evidence[key];
  const img = document.querySelector("#evidence-image");
  img.src = `assets/figures/${key}.webp`;
  img.alt = title;
  img.width = width; img.height = height;
  document.querySelector("#evidence-caption").textContent = caption;
  document.querySelector("#evidence-title").textContent = heading;
  document.querySelector("#evidence-description").textContent = text;
  document.querySelector("#evidence-pdf").href = `assets/figures/${key}.pdf`;
  const zoom = document.querySelector("#evidence-zoom");
  zoom.dataset.image = img.getAttribute("src");
  zoom.dataset.title = title;
}));

// Roving tab focus: horizontal lists use left/right, training stages use up/down.
document.querySelectorAll('[role="tablist"]').forEach(list=>list.addEventListener("keydown",event=>{
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const vertical = list.getAttribute("aria-orientation") === "vertical";
  const next = vertical ? "ArrowDown" : "ArrowRight", prev = vertical ? "ArrowUp" : "ArrowLeft";
  if (![next,prev,"Home","End"].includes(event.key)) return;
  event.preventDefault();
  let index = tabs.indexOf(document.activeElement);
  index = event.key==="Home" ? 0 : event.key==="End" ? tabs.length-1 : (index+(event.key===next ? 1 : -1)+tabs.length)%tabs.length;
  tabs[index].focus();tabs[index].click();
}));

const dialog = document.querySelector("#figure-dialog");
let figureTrigger = null;
document.querySelectorAll("[data-image]").forEach(button=>button.addEventListener("click",()=>{
  figureTrigger = button;
  document.querySelector("#dialog-title").textContent = button.dataset.title;
  const img = document.querySelector("#dialog-image");
  img.src = button.dataset.image;img.alt = button.dataset.title;
  dialog.showModal();
  document.body.style.overflow = "hidden";
}));
document.querySelector("#close-dialog").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{ if(event.target===dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();} });
dialog.addEventListener("close",()=>{document.body.style.overflow="";figureTrigger?.focus({preventScroll:true});});

document.querySelector("#copy-citation").addEventListener("click",async()=>{
  const button = document.querySelector("#copy-citation");
  const citation = document.querySelector("#bibtex").textContent;
  let copied = false;
  try {await navigator.clipboard.writeText(citation); copied=true;} catch {
    const area=document.createElement("textarea");area.value=citation;area.style.position="fixed";area.style.top="-1000px";document.body.append(area);area.select();
    try {copied=document.execCommand("copy");} catch {copied=false;}
    area.remove();button.focus();
  }
  button.textContent = copied ? "Copied ✓" : "Select citation below";
  document.querySelector("#copy-status").textContent = copied ? "BibTeX citation copied to clipboard." : "Copy unavailable. Select the citation text to copy manually.";
  if(!copied){const range=document.createRange();range.selectNodeContents(document.querySelector("#bibtex"));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
  setTimeout(()=>{button.innerHTML='Copy citation <span aria-hidden="true">⧉</span>';},2500);
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let paused = reducedMotion.matches, visible = true, inView = true;
const motionButton = document.querySelector("#motion-toggle");
function syncMotionButton(){
  motionButton.innerHTML = paused ? 'Play animation <span aria-hidden="true">▷</span>' : 'Pause animation <span aria-hidden="true">Ⅱ</span>';
  motionButton.setAttribute("aria-pressed",String(paused));
  motionButton.setAttribute("aria-label",paused ? "Play animation" : "Pause animation");
  document.body.classList.toggle("motion-paused",paused);
}
motionButton.addEventListener("click",()=>{paused=!paused;syncMotionButton();requestDraw();});
reducedMotion.addEventListener("change",event=>{paused=event.matches;syncMotionButton();requestDraw();});
syncMotionButton();

// Deterministic conceptual artwork: not measured embeddings or model inference.
const canvases = [...document.querySelectorAll(".latent-panel canvas")];
let frame = null, time = 0, lastTime = 0;
function seeded(n){const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);}
function drawLatents(canvas, exploratory, t){
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext("2d");if(!ctx)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const scale=w/480;
  for(let x=16;x<w;x+=19)for(let y=8;y<h;y+=19){ctx.fillStyle="#9d8fb91b";ctx.beginPath();ctx.arc(x,y,.7,0,Math.PI*2);ctx.fill();}
  const nodes=Array.from({length:4},(_,i)=>({x:w*(.14+i*.235),y:h*(.52+Math.sin(i*1.8)*.12)}));
  const colors=["#9786c9","#7963bc","#bd9acf","#a896cc"];
  for(let trail=0;trail<(exploratory?9:5);trail++){
    ctx.beginPath();
    for(let step=0;step<=80;step++){
      const progress=step/80, x=w*(.12+progress*.75);
      const spread=exploratory?Math.sin(progress*Math.PI)*h*.37:h*.035;
      const y=h*.52+Math.sin(progress*6+t*.25+trail*.51)*spread*((trail-4)/4)+Math.sin(progress*15+trail)*h*.025;
      step===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.strokeStyle=exploratory?`rgba(130,101,185,${.09+trail*.009})`:"#a798bf22";ctx.lineWidth=1;ctx.stroke();
  }
  for(let i=0;i<92;i++){
    const group=i%4, anchor=nodes[group], phase=t*.37+seeded(i)*6.28;
    const spreadX=(exploratory?25:7)*Math.max(scale,.55),spreadY=exploratory?h*.27:h*.065;
    const x=anchor.x+Math.cos(phase+i)*spreadX*(.3+seeded(i+9))+(exploratory?Math.sin(t*.25+group)*w*.015:0);
    const y=anchor.y+Math.sin(phase*.7+i)*spreadY*(.2+seeded(i+17));
    ctx.fillStyle=colors[group];ctx.globalAlpha=.35+seeded(i+51)*.55;ctx.beginPath();ctx.arc(x,y,(1.6+seeded(i+22)*1.4)*Math.max(scale,.65),0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  nodes.forEach((point,i)=>{
    const x=point.x,y=point.y;
    ctx.strokeStyle=exploratory?"#c5b4e14d":"#bcaec57a";ctx.lineWidth=1;ctx.setLineDash(exploratory?[]:[3,3]);ctx.beginPath();ctx.ellipse(x,y,exploratory?30*scale:14*scale,exploratory?h*.30:h*.10,-.3,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.font=`${Math.max(8,9*scale)}px monospace`;ctx.fillStyle="#a393b1";ctx.textAlign="center";ctx.fillText(`h${i+1}`,x,h-10);
  });
  const px=w*.88,py=h*.32;
  ctx.beginPath();ctx.arc(px,py,11*scale,0,Math.PI*2);ctx.fillStyle="#e8b77c20";ctx.fill();
  ctx.beginPath();ctx.arc(px,py,4*Math.max(scale,.65),0,Math.PI*2);ctx.fillStyle="#dba06e";ctx.fill();
}
function renderFrame(now){
  frame=null;
  if(lastTime&&!paused&&visible&&inView)time+=Math.min(now-lastTime,50)/1000;
  lastTime=now;
  canvases.forEach((c,i)=>drawLatents(c,i===1,time));
  if(!paused&&visible&&inView)frame=requestAnimationFrame(renderFrame);
}
function requestDraw(){if(frame===null)frame=requestAnimationFrame(renderFrame);}
new ResizeObserver(requestDraw).observe(document.querySelector(".latent-comparison"));
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;lastTime=0;requestDraw();},{rootMargin:"100px"}).observe(document.querySelector(".exploration"));
document.addEventListener("visibilitychange",()=>{visible=!document.hidden;lastTime=0;requestDraw();});
requestDraw();
function scrollProgress(){
  const max=document.documentElement.scrollHeight-innerHeight;
  document.querySelector(".reading-progress").style.width=`${max>0?scrollY/max*100:0}%`;
}
window.addEventListener("scroll",scrollProgress,{passive:true});scrollProgress();
const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting)document.querySelectorAll(".nav-links a").forEach(a=>a.classList.toggle("active",a.getAttribute("href")===`#${entry.target.id}`));
}),{rootMargin:"-15% 0px -60% 0px"});
document.querySelectorAll("#overview,#method,#results,#analysis").forEach(s=>sectionObserver.observe(s));
