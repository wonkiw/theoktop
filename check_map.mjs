import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.setViewportSize({ width: 1280, height: 900 });

const logs = [];
p.on('console', m => logs.push(m.type() + ': ' + m.text()));
p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));

await p.goto('http://localhost:4321/', { waitUntil: 'networkidle', timeout: 20000 });
await p.waitForTimeout(2000);

// 지도 섹션 스크롤
await p.evaluate(() => {
  const el = document.getElementById('map-search');
  if (el) el.scrollIntoView({ behavior: 'instant' });
});
await p.waitForTimeout(3000);
await p.screenshot({ path: 'map_01_section.png' });
console.log('map_01: map section captured');

// naver 객체 존재 여부 확인
const naverStatus = await p.evaluate(() => {
  return {
    hasNaver:   typeof window.naver !== 'undefined',
    hasMaps:    typeof window.naver?.maps !== 'undefined',
    hasMapCtor: typeof window.naver?.maps?.Map !== 'undefined',
    scriptSrc:  document.getElementById('naver-maps-script')?.src
              ?? [...document.querySelectorAll('script')]
                   .find(s => s.src && s.src.includes('maps.js'))?.src
              ?? 'not found',
  };
});
console.log('Naver SDK status:', JSON.stringify(naverStatus, null, 2));

// 주소 검색
const addressInput = await p.$('[id="addressInput"]');
if (addressInput) {
  await addressInput.fill('서울시 성동구 성수동');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(4000);
  await p.screenshot({ path: 'map_02_after_search.png' });
  console.log('map_02: after address search');

  // naverMap canvas 존재 여부
  const mapCanvas = await p.evaluate(() => {
    const mapEl = document.getElementById('naverMap');
    return {
      exists:    !!mapEl,
      hasCanvas: !!mapEl?.querySelector('canvas'),
      innerHTML: mapEl?.innerHTML?.substring(0, 100) ?? '',
    };
  });
  console.log('naverMap element:', JSON.stringify(mapCanvas, null, 2));
} else {
  console.log('addressInput not found');
}

// 에러 로그만 출력
const errLogs = logs.filter(l => /error|fail|auth|인증/i.test(l));
if (errLogs.length) {
  console.log('Error logs:', errLogs.slice(0, 10));
} else {
  console.log('No error logs detected');
}

await b.close();
