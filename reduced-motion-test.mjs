import puppeteer from '/Users/maxshillam/Projects/ignite-education/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js'
const browser = await puppeteer.launch({ headless: true })

for (const pref of ['no-preference', 'reduce']) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1000 })
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: pref }])
  await page.goto('http://localhost:3000/jobs', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 900))

  const box = await (await page.$('article')).boundingBox()
  const sampling = page.evaluate(() => new Promise(resolve => {
    const g = document.querySelector('article button svg g')
    const s = []
    const t0 = performance.now()
    const tick = () => {
      s.push(+new DOMMatrixReadOnly(getComputedStyle(g).transform).f.toFixed(2))
      if (performance.now() - t0 < 700) requestAnimationFrame(tick); else resolve(s)
    }
    requestAnimationFrame(tick)
  }))
  await new Promise(r => setTimeout(r, 30))
  await page.mouse.move(box.x + 200, box.y + box.height / 2)
  const s = await sampling

  const dur = await page.$eval('article button svg g', el => getComputedStyle(el).animationDuration)
  console.log(`prefers-reduced-motion: ${pref.padEnd(14)} peak ${String(Math.min(...s)).padStart(6)}   animation-duration ${dur}`)
  await page.close()
}
await browser.close()
