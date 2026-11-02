import { chromium, devices } from '/home/ambr3/ambr3-dev/tools/pkg/playwright/load.mjs';

const BASE = 'http://127.0.0.1:8765/apps/blood-pressure/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 5'] });
const page = await ctx.newPage();
const errors = [], failed = [];
page.on('console', (m) => { if (m.type()==='error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => failed.push(r.url()+' '+r.failure()?.errorText));
await page.goto(BASE, { waitUntil: 'load', timeout: 20000 });
await new Promise(r=>setTimeout(r,3000));
await page.evaluate(() => { window.__bip = false; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__bip = true; }); });

const info = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  return {
    title: document.title,
    swRegs: regs.length,
    controlled: !!navigator.serviceWorker.controller,
    beforeInstallPrompt: window.__bip,
    userAgent: navigator.userAgent,
  };
});
console.log(JSON.stringify({ info, errors, failed }, null, 2));
const fs = await import('node:fs');
fs.mkdirSync('/home/ambr3/ambr3-dev/apps/blood-pressure/report', { recursive: true });
await page.screenshot({ path: '/home/ambr3/ambr3-dev/apps/blood-pressure/report/mobile.png' });
await browser.close();