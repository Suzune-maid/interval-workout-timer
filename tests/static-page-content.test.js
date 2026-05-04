import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const INDEX_HTML_PATH = new URL('../index.html', import.meta.url);

async function readIndexHtml() {
  return readFile(INDEX_HTML_PATH, 'utf8');
}

test('首頁會把日程表移到今日流程預覽下方，並提供週切換容器', async () => {
  const html = await readIndexHtml();
  const planIndex = html.indexOf('<h2>今日流程預覽</h2>');
  const scheduleIndex = html.indexOf('<h2>日程表</h2>');
  const scoreIndex = html.indexOf('<h2>分數口訣</h2>');

  assert.ok(planIndex >= 0, '應包含今日流程預覽');
  assert.ok(scheduleIndex > planIndex, '日程表應位於今日流程預覽之後');
  assert.ok(scoreIndex > scheduleIndex, '分數口訣應位於日程表之後');
  assert.match(html, /id="schedule-week-tabs"/);
});

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
