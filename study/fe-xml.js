/* DriveHUD's .xml exports, turned into PokerStars-style text so the same hand
   history reader (fe-parse.js) can read them.

   The files use the iPoker layout: one <session> holding a <game> per hand,
   rounds numbered 0 (blinds and antes) to 4 (river), and each <action> a
   numbered type with a `sum`. A raise's sum is the total it raises to on that
   street; a call's or an all-in's is what that action adds. Cards are suit
   first ("H6 CT"), and the hero is the session's <nickname>.

   DriveHUD also exports its own layout, seen from ClubGG: one <HandHistory>
   document per hand, joined in a single file that is often named .txt. Every
   action's Amount is the chips that action adds, so a raise's total has to be
   worked out. Cards are rank first ("Ac"), the board is one run of them, and
   <HeroName> is an id, matched to the nickname through <Player>.

   Kept free of DOMParser so it runs the same in a page and under Node. */
"use strict";
var FEXml = (() => {
  const TYPE = { 0: 'fold', 1: 'sb', 2: 'bb', 3: 'call', 4: 'check', 5: 'bet', 7: 'allin', 15: 'ante', 23: 'raise' };
  const STREET = { 2: 'FLOP', 3: 'TURN', 4: 'RIVER' };

  const looksLike = (text) => /^\s*(<\?xml[^>]*>\s*)?<(session|HandHistory)\b/.test(text);
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

  /** One <HandHistory> document. Its amounts are all chips added, so `put` and
      `top` track each street to give raises the total the text format wants. */
  function oneHandHistory(h) {
    const players = [...h.matchAll(/<Player\b([^>]*)\/>/g)].map((m) => attrs(m[1]))
      .map((p) => ({ id: p.PlayerName, name: unesc(p.PlayerNick || p.PlayerName), seat: +p.SeatNumber,
        chips: +p.StartingStack, cards: (p.Cards || '').match(/[2-9TJQKA][shdc]/g) || [] }));
    const who = {};
    players.forEach((p) => { who[p.id] = p.name; });
    const actions = [...h.matchAll(/<HandAction\b([^>]*)\/>/g)].map((m) => attrs(m[1]))
      .map((a) => ({ type: a.HandActionType, who: who[a.PlayerName] || unesc(a.PlayerName),
        amt: Math.abs(+a.Amount || 0), street: a.Street }));
    const sb = +tag(h, 'SmallBlind'), bb = +tag(h, 'BigBlind');
    const site = tag(h, 'Site') === 'ClubGG' ? 'ClubGG' : 'PokerStars';
    const date = tag(h, 'DateOfHandUtc').replace(/\.\d+Z?$/, '').replace('T', ' ').replace(/-/g, '/');
    const max = (h.match(/MaxPlayers="(\d+)"/) || [])[1] || 6;
    const board = tag(h, 'CommunityCards').match(/[2-9TJQKA][shdc]/g) || [];
    const hero = players.find((p) => p.id === tag(h, 'HeroName'));

    const L = [];
    L.push(`${site} Hand #${tag(h, 'HandId')}:  Hold'em No Limit (${money(sb)}/${money(bb)} USD) - ${date} UTC`);
    L.push(`Table '${unesc(tag(h, 'TableName')).replace(/'/g, '')}' ${max}-max Seat #${tag(h, 'DealerButtonPosition')} is the button`);
    players.forEach((p) => L.push(`Seat ${p.seat}: ${p.name} (${money(p.chips)} in chips)`));

    let put = {}, top = 0;
    const post = (a, what) => {
      L.push(`${a.who}: posts ${what} ${money(a.amt)}`);
      put[a.who] = (put[a.who] || 0) + a.amt;
      top = Math.max(top, put[a.who]);
    };
    actions.filter((a) => a.type === 'ANTE').forEach((a) => L.push(`${a.who}: posts the ante ${money(a.amt)}`));
    actions.filter((a) => a.type === 'SMALL_BLIND').forEach((a) => post(a, 'small blind'));
    actions.filter((a) => a.type === 'BIG_BLIND').forEach((a) => post(a, 'big blind'));
    // A player sitting back in posts a live big blind out of position.
    actions.filter((a) => a.type === 'POSTS').forEach((a) => post(a, 'big blind'));
    L.push('*** HOLE CARDS ***');
    if (hero && hero.cards.length === 2) L.push(`Dealt to ${hero.name} [${hero.cards.join(' ')}]`);

    const SETUP = new Set(['ANTE', 'SMALL_BLIND', 'BIG_BLIND', 'POSTS', 'WINS', 'CASHED_OUT']);
    const play = (street) => actions.filter((a) => a.street === street && !SETUP.has(a.type)).forEach((a) => {
      const had = put[a.who] || 0, to = had + a.amt;
      if (a.type === 'FOLD') L.push(`${a.who}: folds`);
      else if (a.type === 'CHECK') L.push(`${a.who}: checks`);
      else if (a.type === 'UNCALLED_BET') L.push(`Uncalled bet (${money(a.amt)}) returned to ${a.who}`);
      else if (a.type === 'CALL') { L.push(`${a.who}: calls ${money(a.amt)}`); put[a.who] = to; }
      else if (a.type === 'BET') { L.push(`${a.who}: bets ${money(a.amt)}`); put[a.who] = to; top = to; }
      else if (a.type === 'RAISE') { L.push(`${a.who}: raises ${money(to - top)} to ${money(to)}`); put[a.who] = to; top = to; }
      else if (a.type === 'ALL_IN') {
        if (to > top + 1e-9) {
          L.push(top === 0 ? `${a.who}: bets ${money(a.amt)} and is all-in` : `${a.who}: raises ${money(to - top)} to ${money(to)} and is all-in`);
          top = to;
        } else {
          L.push(`${a.who}: calls ${money(a.amt)} and is all-in`);
        }
        put[a.who] = to;
      }
      // Anything new goes through as written, so the reader refuses the hand
      // rather than judging it with an action quietly missing.
      else L.push(`${a.who}: ${a.type.toLowerCase()}`);
    });

    play('Preflop');
    [['Flop', 3], ['Turn', 4], ['River', 5]].forEach(([street, n]) => {
      if (board.length < n) return;
      put = {}; top = 0;
      L.push(street === 'Flop' ? `*** FLOP *** [${board.slice(0, 3).join(' ')}]`
        : `*** ${street.toUpperCase()} *** [${board.slice(0, n - 1).join(' ')}] [${board[n - 1]}]`);
      play(street);
    });

    const shows = players.filter((p) => p !== hero && p.cards.length === 2);
    if (shows.length) {
      L.push('*** SHOW DOWN ***');
      shows.forEach((p) => L.push(`${p.name}: shows [${p.cards.join(' ')}]`));
    }
    actions.filter((a) => a.type === 'WINS' || a.type === 'CASHED_OUT')
      .forEach((a) => L.push(`${a.who} collected ${money(a.amt)} from pot`));
    L.push('*** SUMMARY ***');
    // Run it twice: the second board lists only the cards it does not share.
    const second = (h.match(/<CommunityCardsMultipleRun>\s*<string>([^<]*)/) || [])[1];
    if (second) {
      const extra = second.match(/[2-9TJQKA][shdc]/g) || [];
      L.push(`FIRST Board [${board.join(' ')}]`);
      L.push(`SECOND Board [${[...board.slice(0, 5 - extra.length), ...extra].join(' ')}]`);
    }
    return L.join('\n');
  }

  /** Every hand in one exported file, as PokerStars-style text. */
  function toStars(text) {
    if (/^\s*(<\?xml[^>]*>\s*)?<HandHistory\b/.test(text)) {
      return [...text.matchAll(/<HandHistory>[\s\S]*?<\/HandHistory>/g)].map((m) => oneHandHistory(m[0])).join('\n\n\n');
    }
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
