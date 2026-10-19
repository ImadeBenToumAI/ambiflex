// Full-frame stills for the HyperFrames film. Usage: node capture.js <outDir>
const { chromium } = require('playwright')
const path = require('node:path'); const fs = require('node:fs')
const out = process.argv[2] || path.join(__dirname, 'stills'); fs.mkdirSync(out, { recursive: true })
const here = p => 'file://' + path.join(__dirname, p); const sleep = ms => new Promise(r => setTimeout(r, ms))
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2, colorScheme: 'dark' })
  const page = await ctx.newPage()
  const shot = name => page.screenshot({ path: path.join(out, name + '.png') })
  const app = async () => { await page.goto(here('desktop.html')); await page.waitForSelector('#graph .node'); await page.addStyleTag({ content: '#sheet:not(.open){display:none} #world{transition:none!important}' }); await sleep(300) }
  const fit = (right = 0, pad = 24, box = null) => page.evaluate(([r, p, b]) => { const f = window.__fit(r, p, b);
    // Re-centre on what is actually drawn: the union of the node rectangles in viewport pixels.
    let x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9; document.querySelectorAll('#graph .node rect').forEach(n => { const c = n.getBoundingClientRect(); x1 = Math.min(x1, c.left); x2 = Math.max(x2, c.right); y1 = Math.min(y1, c.top); y2 = Math.max(y2, c.bottom) });
    const g = document.getElementById('graph').getBoundingClientRect(); const v = window.__view;
    v.x += ((window.innerWidth - r) / 2) - (x1 + x2) / 2; v.y += (g.top + g.height / 2) - (y1 + y2) / 2; window.__apply(); return f }, [right, pad, box])
  const open = async id => { await page.evaluate(i => window.__select(i), id); await sleep(400) }
  const close = async () => { await page.evaluate(() => document.getElementById('s-close').click()); await sleep(200) }

  await app(); await fit(); await shot('tree')
  // top of the tree: goal + first rows
  await page.evaluate(() => { const f = window.__fit(); window.__fit(0, 24, { x: f.b.x, y: f.b.y, width: f.b.width, height: f.b.height * 0.45 }) }); await shot('tracks')
  await app(); await fit(600); await open('n7')
  await page.evaluate(() => { document.getElementById('s-meta').id = 'hl' }); await shot('proof')
  await page.evaluate(() => { document.getElementById('hl').id = 's-meta' }); await close()
  await open('n16'); await shot('search'); await close()
  await fit(); await page.evaluate(() => { const h = document.querySelector('header'); h.style.outline = '3px solid var(--accent)'; h.style.outlineOffset = '-3px' }); await shot('cost')
  await page.evaluate(() => { document.querySelector('header').style.outline = '' })
  await fit(600); await open('n11')
  await page.evaluate(() => { const b = [...document.querySelectorAll('#s-actions .btn')].find(x => x.textContent === 'Validate'); b && b.classList.add('pressed') })
  await page.evaluate(() => { const t = document.createElement('div'); t.className = 'toast left'; t.textContent = 'Sent to Claude.'; document.querySelector('main').appendChild(t) })
  await sleep(300); await shot('steer')
  await browser.close(); console.log('stills in', out)
})()
