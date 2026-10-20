// Browser QA. Uses installed Playwright, or PLAYWRIGHT_MODULE for a bundled runtime.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
const context = await browser.newContext({viewport:{width:1440,height:1050},deviceScaleFactor:1});
const page = await context.newPage();
const failures = [], checks = [];
const assert = (condition, message) => {if(!condition)failures.push(message);else checks.push(message);};
page.on("pageerror",error=>failures.push(`JavaScript error: ${error.message}`));
page.on("response",response=>{if(response.status()>=400)failures.push(`HTTP ${response.status()}: ${response.url()}`);});
await mkdir("tmp/qa",{recursive:true});
try {
  await page.goto("http://127.0.0.1:4173",{waitUntil:"networkidle"});
  assert(await page.title()==="CoLVR · Exploratory Latent Visual Reasoning","Page title");
  assert(await page.locator("h1").count()===1,"Single page heading");
  await page.evaluate(async()=>{await Promise.all([...document.images].filter(img=>img.getAttribute("src")).map(img=>{img.loading="eager";return img.decode();}));});
  await page.screenshot({path:"tmp/qa/desktop-top.png"});
  await page.screenshot({path:"tmp/qa/desktop-full.png",fullPage:true});
  await page.getByRole("tab",{name:"Out-of-domain",exact:true}).click();
  assert((await page.locator("#results-table").innerText()).includes("61.47"),"MMStar OOD value");
  assert((await page.locator("#result-note").innerText()).includes("+3.40"),"MMStar baseline context");
  await page.locator("#benchmark-select").selectOption("1");
  assert(await page.locator("#chart-title").textContent()==="Guided visual search","Benchmark selector");
  await page.getByRole("tab",{name:"Ablations",exact:true}).click();
  assert((await page.locator("#results-table").innerText()).includes("63.50"),"Ablation table");
  await page.getByRole("tab",{name:"Visual reasoning",exact:true}).click();
  assert(await page.locator("#results-table tbody tr").count()===9,"All main baseline rows");
  for(const label of ["Attention maps","Uniformity","Noise robustness","Latent space"]){
    await page.getByRole("tab",{name:label,exact:true}).click();
    await page.locator("#evidence-image").evaluate(img=>img.decode());
    assert(await page.locator("#evidence-image").evaluate(img=>img.naturalWidth>0),`${label} figure`);
  }
  await page.locator("#evidence-zoom").click();
  assert(await page.locator("#figure-dialog").evaluate(d=>d.open),"Figure lightbox opens");
  await page.keyboard.press("Escape");
  assert(!(await page.locator("#figure-dialog").evaluate(d=>d.open)),"Escape closes lightbox");
  assert(await page.locator("#evidence-zoom").evaluate(el=>el===document.activeElement),"Lightbox restores focus");
  await page.locator("#stage-1").click();
  assert((await page.locator("#stage-detail").innerText()).includes("InfoNCE"),"Contrastive SFT stage");
  await page.keyboard.press("ArrowDown");
  assert(await page.locator("#stage-2").getAttribute("aria-selected")==="true","Keyboard stage navigation");
  await page.locator("#stage-0").click();
  const animationBefore = await page.locator("#motion-toggle").getAttribute("aria-pressed");
  await page.locator("#motion-toggle").click();
  assert((await page.locator("#motion-toggle").getAttribute("aria-pressed"))!==animationBefore,"Animation toggle");
  await context.grantPermissions(["clipboard-read","clipboard-write"],{origin:"http://127.0.0.1:4173"});
  await page.locator("#copy-citation").click();
  const copiedCitation = await page.evaluate(()=>navigator.clipboard.readText());
  const citationFile = await context.request.get("http://127.0.0.1:4173/assets/colvr.bib");
  const normalizeNewlines = text => text.replace(/\r\n/g, "\n").trim();
  assert(normalizeNewlines(copiedCitation)===normalizeNewlines(await citationFile.text()),"Copied and downloaded BibTeX match");
  assert(copiedCitation.includes("@inproceedings{ding2026colvr") && copiedCitation.includes("author  = {Ding, Ziyang") && copiedCitation.includes("booktitle = {The Fortieth Annual Conference") && copiedCitation.includes("https://openreview.net/forum?id=FdggkQpSHq"),"Conference citation metadata");
  const requiredLinks=["https://arxiv.org/abs/2605.08802","https://github.com/Oscar-dzy/CoLVR/tree/main","https://huggingface.co/collections/Oscar-dzy/colvr-models","https://huggingface.co/datasets/Oscar-dzy/CoLVR-datasets"];
  for(const url of requiredLinks)assert(await page.locator(`a[href="${url}"]`).count()>0,`Resource link: ${url}`);
  const localResources=await page.evaluate(()=>[...new Set([...document.querySelectorAll("[src],a[href],link[href]")].map(el=>el.getAttribute("src")||el.getAttribute("href")).filter(url=>url&&!/^(https?:|mailto:|#)/.test(url)))]);
  for(const url of localResources){const response=await context.request.get(`http://127.0.0.1:4173/${url}`);assert(response.ok(),`Local asset: ${url}`);}
  for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>scrollTo(0,0));
    await page.waitForTimeout(250);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No page overflow at ${width}px`);
    if(width===390){await page.screenshot({path:"tmp/qa/mobile-top.png"});await page.screenshot({path:"tmp/qa/mobile-full.png",fullPage:true});}
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.reload({waitUntil:"networkidle"});
  assert(await page.locator("#motion-toggle").getAttribute("aria-pressed")==="true","Reduced motion starts paused");
  assert(await page.locator(".hero-wordmark > span").evaluate(el=>getComputedStyle(el).animationPlayState)==="paused","Decorative rotation respects pause");
  const hiddenResponse=await context.request.get("http://127.0.0.1:4173/.paper-source/neurips_2026.tex");
  assert(hiddenResponse.status()===404,"Local server does not expose source archive");
  await page.setViewportSize({width:1440,height:1050});
  await page.goto("http://127.0.0.1:4173/#results",{waitUntil:"networkidle"});
  await page.locator("#results-title").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({path:"tmp/qa/results.png"});
  await writeFile("tmp/qa/report.json",JSON.stringify({checks,failures},null,2));
  console.log(JSON.stringify({passed:checks.length,failures},null,2));
} finally {await browser.close();}
if(failures.length)process.exitCode=1;
