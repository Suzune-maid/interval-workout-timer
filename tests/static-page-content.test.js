import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const INDEX_HTML_PATH = new URL('../index.html', import.meta.url);

async function readIndexHtml() {
  return readFile(INDEX_HTML_PATH, 'utf8');
}

test('首頁會提供興奮度差異與分辨方式區塊', async () => {
  const html = await readIndexHtml();

  assert.match(html, /<h2>興奮度差異與分辨方式<\/h2>/);
  assert.match(html, /4 分：可重新開始的暖機區/);
  assert.match(html, /6 分：可控高原區/);
  assert.match(html, /7 分：需要立刻停手的邊界/);
  assert.match(html, /8 分：太晚才停的失守區/);
  assert.match(html, /如果你停下來後，興奮會在 10～20 秒內自己往上衝，通常已經超過 7 分/);
  assert.match(html, /真正要練的是「越接近 7 分，越能吐氣、下沉、減少多餘用力」/);
});
