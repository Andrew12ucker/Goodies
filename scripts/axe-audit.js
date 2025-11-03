#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const axe = require('axe-core');

const publicDir = path.join(__dirname, '..', 'public');
const outDir = path.join(publicDir, 'axe-reports');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function listHtmlFiles(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.html'));
}

async function runAxeOnFile(filePath, fileName) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html, { url: 'http://localhost' });
  const { window } = dom;

  // Use axe-core's programmatic API directly against the JSDOM document
  // (axe-core supports being run in Node against a DOM implementation like jsdom)
  // Some axe-core helpers rely on globals; bind the jsdom window to globals
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;
  global.Element = window.Element;
  global.HTMLElement = window.HTMLElement;
  global.navigator = window.navigator;

  const results = await axe.run(document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'best-practice']
    }
  });

  const outPath = path.join(outDir, fileName.replace(/\.html$/, '.axe.json'));
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  return results;
}

async function main() {
  const files = listHtmlFiles(publicDir);
  const summary = [];

  for (const file of files) {
    const p = path.join(publicDir, file);
    process.stdout.write(`Auditing ${file}... `);
    try {
      const res = await runAxeOnFile(p, file);
      const violations = res.violations || [];
      summary.push({ file, violations: violations.length });
      console.log(`done — ${violations.length} violations`);
    } catch (err) {
      console.error(`error: ${err.message}`);
      summary.push({ file, error: err.message });
    }
  }

  const summaryPath = path.join(outDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log('\nAudit complete. Reports saved to:', outDir);
  console.log('Summary:');
  console.table(summary);
}

main().catch(err => { console.error(err); process.exit(1); });
