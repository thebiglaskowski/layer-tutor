// The 9-stage curriculum. Content rules:
// - Stages 1-4 use only base-layer (layer 0) characters.
// - Stage 5-6 exercise layer 1 (hold LEFT thumb / Fn).
// - Stage 7-8 exercise layer 2 (hold RIGHT thumb / Fn) mixed with letters.
// - Stage 9 mixes all three layers in realistic strings.
// Every character in every pool item must resolve via charToKey() — enforced
// by tests/lessons.test.js.

export const STAGES = [
  {
    id: 'home-row',
    name: 'Home Row',
    layerHint: 'Base layer · fingers rest here',
    roundSize: 15,
    pool: ['as', 'sad', 'dad', 'lad', 'fad', 'gas', 'has', 'had', 'gag', 'hall',
      'fall', 'glad', 'flag', 'flask', 'salad', 'dash', 'sash', 'gash', 'half',
      'lash', 'gall', 'alas', 'shall', 'flash', 'glass', 'asks', "dad's", "gal's"],
  },
  {
    id: 'top-row',
    name: 'Top Row',
    layerHint: 'Base layer · reach up',
    roundSize: 15,
    pool: ['the', 'there', 'where', 'quiet', 'tower', 'power', 'water', 'paper',
      'tiger', 'quote', 'request', 'require', 'typewriter', 'should', 'great',
      'eight', 'port', 'quest', 'guitar', 'shorter', 'father', 'yellow',
      'pretty', 'square', 'adequate', 'territory', 'loyal', 'usual', 'sugar',
      'outside'],
  },
  {
    id: 'bottom-row',
    name: 'Bottom Row',
    layerHint: 'Base layer · reach down',
    roundSize: 15,
    pool: ['zebra', 'cabin', 'move', 'buzz', 'exact', 'victim', 'jazz', 'mixed',
      'number', 'combo', 'zombie', 'carbon', 'vivid', 'maximum', 'banner',
      'comma,', 'end.', 'and/or', 'c/o', 'p.m.', 'next.', 'back,', 'zinc',
      'vex', 'climb'],
  },
  {
    id: 'all-letters',
    name: 'Full Sentences',
    layerHint: 'Base layer · everything together',
    roundSize: 4,
    pool: ['The quick brown fox jumps over the lazy dog.',
      'Pack my box with five dozen liquor jugs.',
      'Sphinx of black quartz, judge my vow.',
      'How vexingly quick daft zebras jump.',
      'Jackdaws love my big sphinx of quartz.',
      'Bright vixens jump; dozy fowl quack.'],
  },
  {
    id: 'numbers',
    name: 'Numbers',
    layerHint: 'Hold LEFT thumb (Fn) for digits',
    roundSize: 12,
    pool: ['42', '2024', '90210', '8675309', '1234', '0987', '31415', '2718',
      '1024', '4096', '365', '555', '789', '8080', '443', '1999', '2001',
      '112', '60', '13'],
  },
  {
    id: 'navigation',
    name: 'Navigation',
    layerHint: 'Hold LEFT thumb (Fn) · arrows on HJKL',
    roundSize: 10,
    pool: ['←←→→', '↑↑↓↓', '←↓↑→', '→→↑', '↓↓←', '↑→↓←', '←←←', '→↑→↓',
      '↓←↑→', '↑↓↑↓', '→↓↓→', '←↑←↑'],
  },
  {
    id: 'shifted-symbols',
    name: 'Shifted Symbols',
    layerHint: 'Hold RIGHT thumb (Fn) for !@#$%…',
    roundSize: 12,
    pool: ['wow!', '(ok)', 'a&b', '@home', '#tag', 'yes!', 'stop!', '$cash',
      'hash#', '(wow)', 'a*b', 'x^y', '%rate', 'one&two', 'go!', 'this&that',
      'ask@me', '(no)', 'win!', 'a^b'],
  },
  {
    id: 'punctuation',
    name: 'Brackets & Punctuation',
    layerHint: 'Hold RIGHT thumb (Fn) · right hand',
    roundSize: 12,
    pool: ['x=y', 'a-b', '[list]', '{key}', '`code`', 'a_b', 'c|d', '~home',
      'one+two', 're-do', 'snake_case', 'kebab-case', 'a=b', '[a]', '{x}',
      '`x`', 'x~y', 'pipe|pipe', 'path\\to', 'tag-line'],
  },
  {
    id: 'mixed',
    name: 'Mixed Mastery',
    layerHint: 'All layers · real-world text',
    roundSize: 6,
    pool: ['let x = 42;', '$19.99', '123 Main St.', '(555) 867-5309',
      '2 + 2 = 4', 'user@host.com', '#1 fan!', 'arr[0] + arr[1]',
      '100% done', 'tip: 20%', '3 * 3 = 9', 'a[1] = b[2];', 'x != y',
      'ship v2.0!'],
  },
];

export function buildRound(stage, rand = Math.random) {
  const pool = [...stage.pool];
  const items = [];
  while (items.length < stage.roundSize) {
    const i = Math.floor(rand() * pool.length);
    items.push(pool.splice(i, 1)[0]);
    if (pool.length === 0) pool.push(...stage.pool);
  }
  return items;
}
