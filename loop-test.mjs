import puppeteer from '/Users/maxshillam/Projects/ignite-education/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1000 })
await page.goto('http://localhost:3000/jobs', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 1000))

const box = await (await page.$('article')).boundingBox()
const sampling = page.evaluate(() => new Promise(resolve => {
  const g = document.querySelector('article button svg g')
  const s = []
  const t0 = performance.now()
  const tick = () => {
    s.push({ t: Math.round(performance.now() - t0), y: +new DOMMatrixReadOnly(getComputedStyle(g).transform).f.toFixed(2) })
    if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else resolve(s)
  }
  requestAnimationFrame(tick)
}))
await new Promise(r => setTimeout(r, 30))
await page.mouse.move(box.x + 200, box.y + box.height / 2)
const s = await sampling

// Count distinct lift cycles: transitions into "near peak".
let cycles = 0, up = false
for (const p of s) {
  if (!up && p.y <= -3.5) { cycles++; up = true }
  if (up && p.y >= -0.2) up = false
}
console.log('peak lift        :', Math.min(...s.map(p => p.y)), 'user units (=', (Math.min(...s.map(p => p.y)) * 16/24).toFixed(2), 'screen px )')
console.log('cycles in 3s     :', cycles)
console.log('duration/iteration:', await page.$eval('article button svg g', el => {
  const c = getComputedStyle(el); return c.animationDuration + ' / ' + c.animationIterationCount
}))
await browser.close()
