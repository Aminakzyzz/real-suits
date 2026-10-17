import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto('http://127.0.0.1:5174/');assert.equal(response.status(),200);
  await page.getByRole('heading',{name:'Every match has a story.'}).waitFor();
  await page.locator('.event-goal').click();await page.getByRole('button',{name:'Confirm moment'}).click();
  await page.waitForFunction(()=>document.querySelector('.scorebug .score-team b')?.textContent==='3');
  const auth=await page.request.get('http://127.0.0.1:5174/api/matches');assert.equal(auth.status(),401);
  await page.screenshot({path:'test-results/production.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Production Worker smoke passed: page, assets, interactive event and unauthenticated write boundary.');
} finally {await browser.close();}
