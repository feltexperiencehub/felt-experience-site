/* DriveHUD's .xml exports, turned into PokerStars-style text so the same hand
   history reader (fe-parse.js) can read them.

   The files use the iPoker layout: one <session> holding a <game> per hand,
   rounds numbered 0 (blinds and antes) to 4 (river), and each <action> a
   numbered type with a `sum`. A raise's sum is the total it raises to on that
   street; a call's or an all-in's is what that action adds. Cards are suit
   first ("H6 CT"), and the hero is the session's <nickname>.

   Kept free of DOMParser so it runs the same in a page and under Node. */
"use strict";
var FEXml = (() => {
  const TYPE = { 0: 'fold', 1: 'sb', 2: 'bb', 3: 'call', 4: 'check', 5: 'bet', 7: 'allin', 15: 'ante', 23: 'raise' };
  const STREET = { 2: 'FLOP', 3: 'TURN', 4: 'RIVER' };

  const looksLike = (text) => /^\s*(<\?xml[^>]*>\s*)?<session\b/.test(text);
  const tag = (src, name) => { const m = src.match(new RegExp(`<${name}>([^<]*)</${name}>`)); return m ? m[1].trim() : ''; };
  const attrs = (s) => { const o = {}; s.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { o[k] = v; }); return o; };
  const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const money = (n) => '$' + (Math.round(n * 100) / 100).toFixed(2);
  /** "H6" to "6h", "CT" to "Tc"; hidden cards ("X") come back empty. */
  const card = (c) => (c && c.length >= 2 && c[0] !== 'X' ? (c.slice(1) === '10' ? 'T' : c.slice(1)) + c[0].toLowerCase() : '');
  const cards = (s) => (s || '').trim().split(/\s+/).map(card).filter(Boolean);

  function oneGame(g, head) {
    const code = (g.match(/<game\b[^>]*gamecode="([^"]*)"/) || [])[1] || '';
    const players = [...g.matchAll(/<player\b([^>]*)\/?>/g)].map((m) => attrs(m[1]))
      .map((p) => ({ seat: +p.seat, name: unesc(p.name), chips: +p.chips, dealer: p.dealer === '1', win: +p.win || 0 }));
    const button = (players.find((p) => p.dealer) || players[0] || {}).seat;
    const L = [];
    L.push(`PokerStars Hand #${code}:  Hold'em No Limit (${money(head.sb)}/${money(head.bb)} USD) - ${tag(g, 'startdate') || head.date} ET`);
    L.push(`Table '${head.table}' ${head.max}-max Seat #${button} is the button`);
    players.forEach((p) => L.push(`Seat ${p.seat}: ${p.name} (${money(p.chips)} in chips)`));

    const rounds = [...g.matchAll(/<round\s+no="(\d+)">([\s\S]*?)<\/round>/g)].map((m) => ({ no: +m[1], body: m[2] }));
    const pocket = {}, board = [];
    rounds.forEach((r) => {
      for (const m of r.body.matchAll(/<cards\s+type="(\w+)"(?:\s+player="([^"]*)")?\s*>([^<]*)<\/cards>/g)) {
        if (m[1] === 'Pocket') pocket[unesc(m[2])] = cards(m[3]);
        else board.push(...cards(m[3]));
      }
    });

    let put = {}, top = 0;
    const out = (r) => {
      for (const m of r.body.matchAll(/<action\b([^>]*)\/?>/g)) {
        const a = attrs(m[1]), who = unesc(a.player), sum = +a.sum || 0, kind = TYPE[a.type];
        const had = put[who] || 0;
        if (kind === 'ante') L.push(`${who}: posts the ante ${money(sum)}`);
        else if (kind === 'sb') { L.push(`${who}: posts small blind ${money(sum)}`); put[who] = had + sum; top = Math.max(top, put[who]); }
        else if (kind === 'bb') { L.push(`${who}: posts big blind ${money(sum)}`); put[who] = had + sum; top = Math.max(top, put[who]); }
        else if (kind === 'fold') L.push(`${who}: folds`);
        else if (kind === 'check') L.push(`${who}: checks`);
        else if (kind === 'call') { L.push(`${who}: calls ${money(sum)}`); put[who] = had + sum; }
        else if (kind === 'bet') { L.push(`${who}: bets ${money(sum)}`); put[who] = had + sum; top = put[who]; }
        else if (kind === 'raise') { L.push(`${who}: raises ${money(sum - top)} to ${money(sum)}`); put[who] = sum; top = sum; }
        else if (kind === 'allin') {
          const to = had + sum;
          if (to > top + 1e-9) {
            L.push(top === 0 ? `${who}: bets ${money(sum)} and is all-in` : `${who}: raises ${money(to - top)} to ${money(to)} and is all-in`);
            top = to;
          } else {
            L.push(`${who}: calls ${money(sum)} and is all-in`);
          }
          put[who] = to;
        }
      }
    };

    rounds.forEach((r) => {
      if (r.no === 1) {
        L.push('*** HOLE CARDS ***');
        if (pocket[head.hero] && pocket[head.hero].length === 2) L.push(`Dealt to ${head.hero} [${pocket[head.hero].join(' ')}]`);
      } else if (STREET[r.no]) {
        put = {}; top = 0;
        const shown = board.slice(0, r.no + 1);
        L.push(r.no === 2 ? `*** FLOP *** [${shown.join(' ')}]`
          : `*** ${STREET[r.no]} *** [${shown.slice(0, -1).join(' ')}] [${shown[shown.length - 1]}]`);
      }
      out(r);
    });

    const shows = players.filter((p) => p.name !== head.hero && pocket[p.name] && pocket[p.name].length === 2);
    if (shows.length) {
      L.push('*** SHOW DOWN ***');
      shows.forEach((p) => L.push(`${p.name}: shows [${pocket[p.name].join(' ')}]`));
    }
    players.filter((p) => p.win > 0).forEach((p) => L.push(`${p.name} collected ${money(p.win)} from pot`));
    L.push('*** SUMMARY ***');
    return L.join('\n');
  }

  /** Every hand in one exported file, as PokerStars-style text. */
  function toStars(text) {
    const general = (text.match(/<general>([\s\S]*?)<\/general>/) || [])[1] || '';
    const stakes = tag(general, 'gametype').match(/([\d.]+)\s*\/\s*\D*([\d.]+)/) || [];
    const head = {
      sb: +stakes[1] || 0, bb: +stakes[2] || 0, hero: unesc(tag(general, 'nickname')),
      table: unesc(tag(general, 'tablename')).replace(/'/g, '') || 'Table', max: +tag(general, 'maxplayers') || 6,
      date: tag(general, 'startdate'),
    };
    return [...text.matchAll(/<game\b[\s\S]*?<\/game>/g)].map((m) => oneGame(m[0], head)).join('\n\n\n');
  }

  return { looksLike, toStars };
})();
if (typeof module !== 'undefined') module.exports = FEXml;
