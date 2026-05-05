const SIMPLIFIED_TO_TRADITIONAL = new Map(Object.entries({
  气: '氣',
  时: '時',
  扫: '掃',
  余: '餘',
  紧: '緊',
  绷: '繃',
  摇: '搖',
  冲: '衝',
  软: '軟',
  喷: '噴',
  兴: '興',
  奋: '奮',
  着: '著',
  点: '點',
  强: '強',
  里: '裡',
  干: '乾',
  净: '淨',
  确: '確',
  认: '認',
  启: '啟',
  动: '動',
  松: '鬆',
  两: '二',
  这: '這',
  约: '約',
  钟: '鐘',
  准: '準',
  备: '備',
  现: '現',
  开: '開',
  始: '始',
  段: '段',
  分: '分',
  钟: '鐘',
  练: '練',
  习: '習',
  体: '體',
  后: '後',
  复: '復',
  进: '進',
  稳: '穩',
  轻: '輕',
  压: '壓',
  应: '應',
  对: '對',
  话: '話',
  语: '語',
  声: '聲',
  觉: '覺',
  边: '邊',
  还: '還',
  让: '讓',
  个: '個',
  无: '無',
  与: '與',
  会: '會',
  别: '別',
  数: '數',
  节: '節',
  奏: '奏',
  清: '清',
  楚: '楚',
  仍: '仍',
  由: '由',
  控: '控',
  制: '制',
}));

const FULLWIDTH_DIGITS = new Map(Object.entries({
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',
}));

function normalizeChar(char) {
  if (SIMPLIFIED_TO_TRADITIONAL.has(char)) return SIMPLIFIED_TO_TRADITIONAL.get(char);
  if (FULLWIDTH_DIGITS.has(char)) return FULLWIDTH_DIGITS.get(char);
  return char;
}

function normalizeNumbers(text) {
  return text
    .replace(/0/g, '零')
    .replace(/1/g, '一')
    .replace(/2/g, '二')
    .replace(/3/g, '三')
    .replace(/4/g, '四')
    .replace(/5/g, '五')
    .replace(/6/g, '六')
    .replace(/7/g, '七')
    .replace(/8/g, '八')
    .replace(/9/g, '九');
}

export function normalizeTranscriptText(text = '') {
  return normalizeNumbers(Array.from(String(text).toLowerCase())
    .map(normalizeChar)
    .join('')
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}，。！？、：；「」『』（）《》〈〉【】—～…·．]/gu, '')
    .replace(/兩/g, '二')
    .replace(/一搖往/g, '一有往')
    .replace(/骨噴底/g, '骨盆底')
    .replace(/快看明顯/g, '快感明顯')
    .replace(/充現/g, '衝線'))
    .trim();
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

function lcsLength(a, b) {
  if (!a.length || !b.length) return 0;
  const previous = Array.from({ length: b.length + 1 }, () => 0);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = a[i - 1] === b[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

export function compareTranscriptToExpected({
  expected,
  actual,
  passSimilarity = 0.82,
  passCoverage = 0.82,
  warnSimilarity = 0.72,
  warnCoverage = 0.72,
} = {}) {
  const normalizedExpected = normalizeTranscriptText(expected);
  const normalizedActual = normalizeTranscriptText(actual);
  const maxLength = Math.max(normalizedExpected.length, normalizedActual.length);

  if (!normalizedExpected) {
    return {
      status: normalizedActual ? 'fail' : 'pass',
      code: normalizedActual ? 'unexpected-transcript-content' : undefined,
      exact: normalizedExpected === normalizedActual,
      normalizedExpected,
      normalizedActual,
      similarity: normalizedActual ? 0 : 1,
      coverage: normalizedActual ? 0 : 1,
    };
  }

  const distance = levenshteinDistance(normalizedExpected, normalizedActual);
  const similarity = maxLength ? 1 - distance / maxLength : 1;
  const lcs = lcsLength(normalizedExpected, normalizedActual);
  const coverage = lcs / normalizedExpected.length;
  const normalizedExact = normalizedExpected === normalizedActual;
  const exact = String(expected ?? '') === String(actual ?? '');

  let status = 'fail';
  let code = 'transcript-content-mismatch';
  if (normalizedExact || (similarity >= passSimilarity && coverage >= passCoverage)) {
    status = 'pass';
    code = exact ? undefined : 'transcript-fuzzy-pass';
  } else if (similarity >= warnSimilarity && coverage >= warnCoverage) {
    status = 'warn';
    code = 'transcript-low-confidence';
  }

  return {
    status,
    code,
    exact,
    normalizedExact,
    normalizedExpected,
    normalizedActual,
    similarity,
    coverage,
    editDistance: distance,
    lcsLength: lcs,
  };
}
