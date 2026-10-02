// End-to-end check on a simulated phone (headless Chrome, no extra dependencies): onboarding, home, food diary,
// workout. Starts its own dev server unless BASE is given. Screenshots go to .ui-shots/ for a quick visual review.
//   npm run test:ui              → local dev server on port 3210
//   BASE=https://… npm run test:ui
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OUT = path.resolve('.ui-shots');
const W = 390, H = 844;
const CHROME = process.env.CHROME ?? ({ win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe', darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }[process.platform] ?? 'google-chrome');
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

let server = null, BASE = process.env.BASE;
if (!BASE) {
  BASE = 'http://localhost:3210';
  // No Supabase or Gemini variables: the app runs without login and the AI routes answer "not configured".
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/SUPABASE|GEMINI|VAPID/.test(k)));
  server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', '-p', '3210'], { env, stdio: 'ignore', shell: process.platform === 'win32' });
  for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* starting */ } await sleep(1000); }
}
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tempra-ui-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9351', `--user-data-dir=${profile}`, '--hide-scrollbars', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 100 && !ws; i++) { try { const t = await (await fetch('http://127.0.0.1:9351/json')).json(); const pg = t.find(x => x.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch { /* starting */ } await sleep(300); }
if (ws.readyState !== WebSocket.OPEN) await new Promise(r => ws.addEventListener('open', r));
let n = 0; const pending = new Map(), errors = [], dialogs = [];
const send = (method, params = {}) => new Promise(r => { const id = ++n; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Page.javascriptDialogOpening') { dialogs.push(m.params.message); send('Page.handleJavaScriptDialog', { accept: true, promptText: 'Colazione test' }); }
});
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const has = text => ev(`document.body.textContent.includes(${JSON.stringify(text)})`);
const click = async (text, sel = 'button') => { const ok = await ev(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.offsetParent!==null&&x.textContent.trim().startsWith(${JSON.stringify(text)}));if(!b)return false;b.click();return true})()`); assert.ok(ok, 'button not found: ' + text); await sleep(400); };
const type = async (sel, value) => { await ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});const set=Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(200); };
const typeNth = async (i, value) => { await ev(`(()=>{const el=document.querySelectorAll('.numwrap input')[${i}];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(el,${JSON.stringify(String(value))});el.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(150); };
const waitFor = async (expr, ms = 20000) => { for (let t = 0; t < ms; t += 300) { if (await ev(expr)) return true; await sleep(300); } return false; };
const shot = async (name, full = false) => {
  await sleep(300);
  const height = full ? Math.min(6000, Math.ceil((await send('Page.getLayoutMetrics')).result.cssContentSize.height)) : H;
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height, scale: 1 }, captureBeyondViewport: full });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64'));
};
const tab = async t => { await ev(`[...document.querySelectorAll('.tabbar button')].find(b=>b.textContent.includes(${JSON.stringify(t)})).click()`); await sleep(700); };
const step = async (name, fn) => { try { await fn(); console.log('✓', name); } catch (e) { await shot('FAIL-' + name.replace(/\W+/g, '-')); throw e; } };

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: BASE + '/' }); await waitFor(`!!document.querySelector('button')`);

  await step('onboarding', async () => {
    await click('Crea il mio piano');
    await type('.biginput', 'Test'); await click('Consigliami tu'); await click('Avanti');
    await click('Uomo'); await typeNth(0, 25); await typeNth(1, 180); await typeNth(2, 80); await typeNth(3, 88); await click('Avanti');
    await click('Con regolarità'); await click('Palestra'); await click('Avanti');
    for (const d of ['Lun', 'Mer', 'Ven']) await click(d);
    await click('60 min'); await click('Avanti');
    await click('Seduto'); await click('4–7.000'); await click('Camminata'); await click('Avanti');
    await click('7 ore'); await click('Avanti'); await click('Avanti');
    await click('Vedermi cambiare'); await click('Crea il mio piano'); await sleep(800);
    await click('Iniziamo');
    assert.ok(await has('La settimana in breve'), 'weekly summary on home');
    await shot('1-home', true);
  });

  await step('food: search, raw/cooked, add', async () => {
    await tab('Dieta');
    assert.ok(await has('Giornata tipo'));
    await click('Cerca un alimento');
    await type('.picker input', 'pasta di semola');
    await click('Pasta di semola (cruda)');
    assert.ok(await has('Pesato cotto'), 'raw/cooked toggle');
    await click('Pesato cotto');
    assert.ok(await has('Pasta di semola (cotta)'), 'switched to the cooked entry');
    await click('Aggiungi', '.qty button');
    assert.ok(await waitFor(`[...document.querySelectorAll('.foodrow')].some(r=>r.textContent.includes('Pasta di semola (cotta)'))`), 'entry in the diary');
  });

  await step('food: second item, save meal, saved meal in recents', async () => {
    await ev(`[...document.querySelectorAll('.mealcard')].find(c=>c.textContent.includes(document.querySelector('.foodrow').closest('.mealcard').querySelector('h3').textContent)).querySelector('.addfood').click()`); await sleep(500);
    await type('.picker input', 'olio extra'); await click('Olio extravergine'); await click('Aggiungi', '.qty button');
    await ev(`document.querySelector('.mealcard header .iconbtn').click()`); await sleep(500);
    assert.ok(dialogs.some(d => d.includes('Nome del pasto')), 'save-meal prompt');
    await click('Aggiungi', '.addfood'); await click('Recenti');
    assert.ok(await has('Pasti salvati') && await has('Colazione test'), 'saved meal listed');
    await shot('2-recent');
    await ev(`document.querySelector('.modal .close, [aria-label="Chiudi"]')?.click()`); await sleep(400);
    await shot('2b-diary', true);
  });

  await step('food: barcode lookup by typed code', async () => {
    await click('Scansiona il codice a barre'); await sleep(1500);
    await type('.codeinput input', '8076800195057'); await ev(`document.querySelector('.codeinput button').click()`);
    assert.ok(await waitFor(`document.body.textContent.includes('Spaghetti') || document.body.textContent.includes('non raggiungibile')`), 'barcode answer');
    await shot('3-barcode');
    await ev(`document.querySelector('[aria-label="Chiudi"]')?.click()`); await sleep(400);
  });

  await step('workout opens with load targets', async () => {
    await tab('Oggi');
    await click('Inizia l’allenamento'); await sleep(600);
    assert.ok(await ev(`document.querySelectorAll('.setrow').length > 3`), 'set rows');
    await shot('4-workout');
  });

  await step('own plan from the exercise library', async () => {
    await ev(`document.querySelector('[aria-label="Chiudi"]')?.click()`); await sleep(300);
    await tab('Allenamento');
    await click('Crea il tuo piano');
    assert.ok(await ev(`document.querySelectorAll('.bday').length > 0`), 'builder starts from the current plan');
    await ev(`document.querySelector('.bexrow').click()`); await sleep(300);
    await shot('5a-builder');
    const before = await ev(`document.querySelector('.bex.editing .stepper b').textContent`);
    await ev(`document.querySelector('[aria-label="Serie più"]').click()`); await sleep(200);
    assert.equal(Number(await ev(`document.querySelector('.bex.editing .stepper b').textContent`)), Number(before) + 1, 'stepper adds a set');
    await click('Aggiungi esercizio');
    assert.ok(await waitFor(`document.querySelectorAll('.xrow').length > 0`), 'library loaded');
    await type('.xpicker input', 'multipower squat');
    assert.ok(await waitFor(`[...document.querySelectorAll('.xrow b')].some(b => /multipower/i.test(b.textContent))`), 'search by Italian name');
    await ev(`document.querySelector('.xrow .xmain').click()`); await sleep(400);
    await ev(`document.querySelector('.bex.editing')?.scrollIntoView({ block: 'center' })`);
    await shot('5-builder');
    await click('Salva il mio piano'); await sleep(600);
    assert.ok(await has('Il tuo piano · settimana'), 'own plan active');
    await click('Piano del coach', '.planswitch button');
    assert.ok(await has('Blocco ') && !(await has('Il tuo piano · settimana')), 'switched to the coach plan');
    await click('Il mio piano', '.planswitch button');
    assert.ok(await has('Il tuo piano · settimana'), 'switched back to the own plan');
    await shot('5b-plan');
  });

  await step('own diet targets', async () => {
    await tab('Dieta');
    await click('Personalizza');
    await shot('6a-targets');
    await click('Giornata tipo', '[role=tab]');
    assert.ok(await ev(`document.querySelectorAll('.mymeal .myitem').length > 0`), 'sample day starts from the coach');
    await shot('6b-myday');
    await click('Calorie e macro', '[role=tab]');
    await click('Salva'); await sleep(500);
    assert.ok(await has('La tua dieta.'), 'own targets active');
    await shot('6-diet', true);
  });

  assert.deepEqual(errors.filter(e => !/Failed to load resource|favicon|404/.test(e)), [], 'no console errors');
  console.log(`UI test passed. Screenshots in ${OUT}`);
} finally {
  chrome.kill(); server?.kill();
  if (server && process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
}
process.exit(0);
