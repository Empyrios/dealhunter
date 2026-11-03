"""Chromium browser checks using in-memory ES module rewriting. No network navigation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
ROOT=Path(__file__).resolve().parents[1]
def dataurl(text):
    return 'data:text/javascript;base64,'+base64.b64encode(text.encode()).decode()
engine=dataurl((ROOT/'site/engine.mjs').read_text())
demo=dataurl((ROOT/'site/demo.mjs').read_text().replace("'./engine.mjs'",repr(engine)))
app=(ROOT/'site/app.mjs').read_text().replace("'./engine.mjs'",repr(engine)).replace("'./demo.mjs'",repr(demo))
index=(ROOT/'site/index.html').read_text().replace('<link rel="manifest" href="./manifest.webmanifest"/>','')
index=index.replace('<link rel="stylesheet" href="./styles.css"/>','<style>'+(ROOT/'site/styles.css').read_text()+'</style>')
storage="""<script>window.__dealhunterMemory={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(window.__dealhunterMemory,k)?window.__dealhunterMemory[k]:null},setItem(k,v){window.__dealhunterMemory[k]=String(v)},removeItem(k){delete window.__dealhunterMemory[k]}}});</script>"""
index=index.replace('<script type="module" src="./app.mjs"></script>',storage+'<script type="module">'+app+'</script>')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for mode,viewport in [('mobile',{'width':390,'height':844}),('desktop',{'width':1440,'height':900})]:
        ctx=browser.new_context(viewport=viewport,device_scale_factor=1,accept_downloads=True,service_workers='block')
        
        page=ctx.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content(index,wait_until='load')
        page.locator('.hero').wait_for(timeout=10000)
        assert page.locator('h1').count()==1
        assert 'Good decisions' in page.locator('h1').inner_text()
        assert page.get_by_text('No products tracked yet').count()==1
        assert page.get_by_text('Your saved data could not be read').count()==0
        page.get_by_role('button',name='Add product').first.click()
        page.locator('input[name="title"]').fill('Real Example Laptop')
        page.locator('input[name="brand"]').fill('Sample')
        page.locator('input[name="model"]').fill('32GB RAM')
        page.locator('input[name="target"]').fill('900')
        page.get_by_role('button',name='Add to watchlist').click()
        assert page.locator('.detail-hero h2').inner_text()=='Real Example Laptop'
        assert 'Real Example Laptop' in page.evaluate("localStorage.getItem('empyrios-dealhunter-v1')")
        page.get_by_role('button',name='Log a price').first.click()
        page.locator('input[name="retailer"]').fill('Test Merchant')
        page.locator('input[name="price"]').fill('950')
        page.locator('input[name="shipping"]').fill('9.99')
        page.get_by_role('button',name='Save observation').click()
        assert '£959.99' in page.locator('.detail-kpis').inner_text()
        page.get_by_role('button',name='Log a price').first.click()
        page.locator('input[name="retailer"]').fill('Test Merchant')
        page.locator('input[name="price"]').fill('875')
        page.locator('input[name="date"]').fill('2026-10-29')
        page.get_by_role('button',name='Save observation').click()
        assert page.locator('table tbody tr').count()==2
        assert page.locator('.history-svg circle').count()==2
        page.get_by_role('button',name='Back to watchlist').click()
        assert page.locator('.product-card').count()==1
        page.locator('#search').fill('wrong-name')
        assert page.get_by_text('No matches found').count()==1
        page.locator('#search').fill('Laptop')
        assert page.locator('.product-card').count()==1
        # Navigate via active UI, not URL-only.
        if mode=='mobile':page.locator('.mobile-nav a[href="#/analytics"]').click()
        else:page.locator('.sidebar a[href="#/analytics"]').click()
        page.get_by_text('What you are tracking').wait_for(timeout=5000)
        if mode=='mobile':page.locator('.mobile-nav a[href="#/settings"]').click()
        else:page.locator('.sidebar a[href="#/settings"]').click()
        page.get_by_text('Your data is yours').wait_for(timeout=5000)
        with page.expect_download() as download_info:page.get_by_role('button',name='Export full JSON backup').click()
        down=download_info.value
        assert down.suggested_filename.endswith('.json')
        assert errors==[],errors
        dim=page.evaluate('({scroll: document.documentElement.scrollWidth, viewport:window.innerWidth})')
        assert dim['scroll']<=dim['viewport'],f'{mode} horizontal overflow {dim}'
        # Sample loaded explicitly and labelled.
        page.get_by_role('button',name='Load fictional sample data').click()
        assert page.get_by_text('DEMO MODE').count()==1
        if mode=='mobile':page.locator('.mobile-nav a[href="#/overview"]').click()
        else:page.locator('.sidebar .nav-link[href="#/overview"]').click()
        page.get_by_text('Recently tracked').wait_for(timeout=5000)
        path=ROOT/f'preview-{mode}.png';page.screenshot(path=str(path),full_page=True)
        print(f'{mode}: PASS, screenshot={path}, pageErrors={len(errors)}, width={dim}')
        ctx.close()
    browser.close()
