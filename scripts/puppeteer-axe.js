#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const axeSource = require('axe-core').source;

const publicDir = path.join(__dirname, '..', 'public');
const outDir = path.join(publicDir, 'axe-puppeteer-reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
const baseUrl = process.env.AUDIT_BASE || 'http://localhost:8000';

async function auditPage(browser, file) {
  const url = `${baseUrl}/${file}`;
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Inject axe
  await page.evaluate(axeSource);
  // Run axe in page context
  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] }
    });
  });

  const outPath = path.join(outDir, file.replace(/\.html$/, '.axe.json'));
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  await page.close();
  return { file, violations: results.violations.length };
}

async function main() {
  console.log('Launching headless Chrome (Puppeteer)...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const summary = [];
  for (const f of htmlFiles) {
    process.stdout.write(`Auditing ${f}... `);
    try {
      const res = await auditPage(browser, f);
      summary.push(res);
      console.log(`done — ${res.violations} violations`);
    } catch (err) {
      console.error(`error: ${err.message}`);
      summary.push({ file: f, error: err.message });
    }
  }
  await browser.close();
  const summaryPath = path.join(outDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log('\nAudit complete. Reports saved to:', outDir);
  console.table(summary);
}

main().catch(err => { console.error(err); process.exit(1); });
