// Solitaire（Pontifex）：54 张牌生成密钥流
const Solitaire = (() => {
  const A_JOKER = 53, B_JOKER = 54;
  const initialDeck = () => Array.from({ length: 54 }, (_, i) => i + 1);
  const value = card => card >= A_JOKER ? 53 : card;
  const letterValue = ch => ch.toUpperCase().charCodeAt(0) - 64;

  function moveDown(deck, card, n) {
    const i = deck.indexOf(card);
    if (i < 0) return;
    deck.splice(i, 1);
    let j = (i + n) % 54;
    if (j === 0) j = 1;
    deck.splice(j, 0, card);
  }

  function tripleCut(deck) {
    const a = deck.indexOf(A_JOKER), b = deck.indexOf(B_JOKER);
    const i = Math.min(a, b), j = Math.max(a, b);
    return deck.slice(j + 1).concat(deck.slice(i, j + 1), deck.slice(0, i));
  }

  function countCut(deck, n) {
    n = ((n - 1) % 53) + 1;
    return deck.slice(n, 53).concat(deck.slice(0, n), deck.slice(53));
  }

  function step(deck, cutValue) {
    moveDown(deck, A_JOKER, 1);
    moveDown(deck, B_JOKER, 2);
    let d = tripleCut(deck);
    d = countCut(d, value(d[53]));
    if (cutValue) d = countCut(d, cutValue);
    deck.length = 0;
    deck.push(...d);
    return deck;
  }

  function keyDeck(passphrase) {
    let deck = initialDeck();
    for (const ch of String(passphrase || '').toUpperCase().replace(/[^A-Z]/g, '')) {
      deck = step(deck, letterValue(ch));
    }
    return deck;
  }

  function nextOutput(deck) {
    while (true) {
      deck = step(deck, 0);
      const n = value(deck[0]);
      const card = deck[n];
      if (card === A_JOKER || card === B_JOKER) continue;
      return card > 26 ? card - 26 : card;
    }
  }

  function processText(text, key, decrypt) {
    let deck = key ? keyDeck(key) : initialDeck();
    const letters = String(text || '').toUpperCase().replace(/[^A-Z]/g, '');
    let out = '';
    for (const ch of letters) {
      const k = nextOutput(deck);
      const p = letterValue(ch);
      const v = decrypt ? ((p - k + 25) % 26) + 1 : ((p + k - 1) % 26) + 1;
      out += String.fromCharCode(64 + v);
    }
    return out;
  }

  return {
    process: (text, key) => `加密: ${processText(text, key, false)}\n解密: ${processText(text, key, true)}`,
    encrypt: (text, key) => processText(text, key, false),
    decrypt: (text, key) => processText(text, key, true)
  };
})();
