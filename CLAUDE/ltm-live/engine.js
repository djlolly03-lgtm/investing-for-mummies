// LTM Live — Classroom Multiplayer Engine
// Phases: lobby → r1_picking → r1_reveal → inflation1 → r2_cutting →
//         r2_reveal → inflation2 → r3_cutting → r3_reveal →
//         r4_intro → r4_picking → ended

(function () {
  'use strict';

  const SUPABASE_URL      = 'https://gkfldkytzfngwnkrwrga.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZmxka3l0emZuZ3dua3J3cmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzI4NDksImV4cCI6MjA5NDUwODg0OX0.wwyFY0bhbGhCKCpAjgZ0oCS8gda21FHcvDdvlg9xCmU';
  const GAME_KEY          = 'ltm';

  // ── Items + constants ──────────────────────────────────────────────────────
  const ITEMS = [
    { id:'japan',     emoji:'✈️',  name:'Japan Trip',            price:250000  },
    { id:'study',     emoji:'🎓',  name:'Study Abroad',          price:1000000 },
    { id:'car',       emoji:'🚗',  name:'Dream Car Downpayment', price:500000  },
    { id:'lv',        emoji:'👜',  name:'Louis Vuitton Haul',    price:250000  },
    { id:'sneakers',  emoji:'👟',  name:'Sneaker Collection',    price:80000   },
    { id:'concerts',  emoji:'🎤',  name:'Backstage Passes',      price:80000   },
    { id:'vacation',  emoji:'🏝️', name:'Luxury Vacation',       price:400000  },
    { id:'biz',       emoji:'🚀',  name:'Start a Business',      price:400000  },
    { id:'iphone',    emoji:'📱',  name:'Latest iPhone',         price:100000  },
    { id:'bizclass',  emoji:'🛫',  name:'Business Class Flight', price:150000  },
    { id:'farmhouse', emoji:'🏡',  name:'Farmhouse Party',       price:150000  },
    { id:'iim',       emoji:'🏛️', name:'MBA from IIM',          price:800000  },
    { id:'ipl',       emoji:'🎪',  name:'IPL Box Seats',         price:120000  },
    { id:'rolex',     emoji:'⌚',  name:'Rolex Watch',           price:400000  },
    { id:'disney',    emoji:'🎠',  name:'Disney World Trip',     price:300000  },
    { id:'dubai',     emoji:'🧳',  name:'Dubai Mall Shopping',   price:250000  },
  ];

  const BUDGET      = 1500000;
  const INF1        = Math.pow(1.07, 5);   // 2031 → ×1.4026
  const INF2        = Math.pow(1.07, 10);  // 2036 → ×1.9672
  const SAVE_FACTOR = Math.pow(1.14, 10);  // 14% × 10 years ≈ ×3.707
  const ROUND_MS    = 120000;

  // ── Downgrade map ──────────────────────────────────────────────────────────
  const DOWNGRADE = {
    'japan':    { emoji:'🏕️', name:'Lonawala Weekend'     },
    'vacation': { emoji:'🏖️', name:'Alibaug Weekend'      },
    'lv':       { emoji:'👡', name:'Bata Shoes'            },
    'sneakers': { emoji:'🩴', name:'Hawai Chappals'        },
    'car':      { emoji:'🛵', name:'Second-hand Scooty'    },
    'study':    { emoji:'📚', name:'YouTube University'    },
    'concerts': { emoji:'🎧', name:'Spotify Free Tier'     },
    'biz':      { emoji:'🧺', name:'Sell Stuff on OLX'     },
    'iphone':   { emoji:'📟', name:'Refurbished Redmi'     },
    'bizclass': { emoji:'🚂', name:'Sleeper Class Train'   },
    'rolex':    { emoji:'⌚', name:'Fastrack (₹999)'       },
    'farmhouse':{ emoji:'🏘️', name:'Building Terrace'     },
    'iim':      { emoji:'📺', name:'MBA on YouTube'        },
    'ipl':      { emoji:'📡', name:'Watch on Hotstar Free' },
    'disney':   { emoji:'🎡', name:'Essel World'           },
    'dubai':    { emoji:'🛍️', name:'Linking Road, Bandra' },
  };

  // ── Sound system ───────────────────────────────────────────────────────────
  var _buySounds = [
    '../sounds/mario-coin.mp3',
    '../sounds/among-us.mp3',
    '../sounds/nana.mp3',
  ];
  var _dgSounds = [
    '../sounds/vine-boom.mp3',
    '../sounds/dry-fart.mp3',
    '../sounds/sad-meow.mp3',
    '../sounds/punch.mp3',
    '../sounds/nemesis.mp3',
    '../sounds/faaah.mp3',
    '../sounds/movie.mp3',
    '../sounds/six-seven.mp3',
  ];
  var _buyIdx = 0;
  var _dgIdx  = 0;

  function _playMp3(src) {
    try { var a = new Audio(src); a.volume = 0.8; a.play().catch(function(){}); } catch(e) {}
  }

  window.LTM_SOUNDS = {
    buy: function() { _playMp3(_buySounds[_buyIdx++ % _buySounds.length]); },
    cut: function() { _playMp3(_dgSounds[_dgIdx++   % _dgSounds.length]);  },
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function itemById(id) { return ITEMS.find(i => i.id === id); }

  function itemPrice(id, round) {
    const item = itemById(id);
    if (!item) return 0;
    if (round === 2) return Math.round(item.price * INF1);
    if (round === 3) return Math.round(item.price * INF2);
    return item.price;
  }

  function totalCost(picks, round) {
    return (picks || []).reduce(function(s, id) { return s + itemPrice(id, round); }, 0);
  }

  function fmtL(n) {
    if (n >= 100000) { var v = n / 100000; return '₹' + (v % 1 === 0 ? v : v.toFixed(1)) + 'L'; }
    if (n >= 1000) return '₹' + Math.round(n / 1000) + 'k';
    return '₹' + n;
  }

  function calcR1Spent(player) {
    return (player.r1picks || []).reduce(function(s, id) {
      var it = itemById(id); return s + (it ? it.price : 0);
    }, 0);
  }
  function calcSaved(player) { return Math.max(0, BUDGET - calcR1Spent(player)); }

  // Expose globals for views
  window.LTM_ITEMS       = ITEMS;
  window.LTM_BUDGET      = BUDGET;
  window.LTM_INF1        = INF1;
  window.LTM_INF2        = INF2;
  window.LTM_SAVE_FACTOR = SAVE_FACTOR;
  window.LTM_ROUND_MS    = ROUND_MS;
  window.LTM_DOWNGRADE   = DOWNGRADE;
  window.itemPrice       = itemPrice;
  window.totalCost       = totalCost;
  window.fmtL            = fmtL;

  // ── Room code ──────────────────────────────────────────────────────────────
  var _params  = new URLSearchParams(window.location.search);
  var _urlRoom = _params.get('room');
  var _urlRole = _params.get('role');

  var ROOM_CODE;
  if (_urlRoom) {
    ROOM_CODE = _urlRoom.toUpperCase();
  } else if (_urlRole === 'host') {
    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    ROOM_CODE = Array.from({ length: 4 }, function() {
      return alpha[Math.floor(Math.random() * 26)];
    }).join('');
    var p2 = new URLSearchParams(window.location.search);
    p2.set('room', ROOM_CODE);
    window.history.replaceState(null, '', '?' + p2.toString());
  }
  window.LTM_ROOM = ROOM_CODE;

  var NS_ROOM    = GAME_KEY + '-' + ROOM_CODE;
  var _isHostTab = (_urlRole === 'host');

  // ── Supabase ───────────────────────────────────────────────────────────────
  if (!window.supabase) {
    document.getElementById('root').innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#080a1a;color:#fff;font-family:sans-serif;text-align:center;padding:24px">' +
      '<div><div style="font-size:22px;margin-bottom:12px">⚠️ Connection error</div>' +
      '<div style="color:rgba(255,255,255,.6)">Could not reach game server. Check internet and refresh.</div></div></div>';
    return;
  }

  var db           = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  var MY_ID        = crypto.randomUUID();
  var listeners    = new Set();
  var isHost       = false;
  var currentState = freshState();
  var _channelReady = false;
  var _pendingSends = [];

  function freshState() {
    return { phase:'lobby', sessionId:null, hostId:null, timerStart:null, players:{}, r4meta:null };
  }

  function notify(s) {
    var snap = Object.assign({}, s);
    listeners.forEach(function(fn) { try { fn(snap); } catch(e) {} });
  }

  // ── DB save ────────────────────────────────────────────────────────────────
  var _saveQ = Promise.resolve();
  function saveToDB() {
    _saveQ = _saveQ.then(async function() {
      try {
        await db.from('games').upsert({
          room_code:  NS_ROOM,
          state:      currentState,
          host_id:    MY_ID,
          updated_at: new Date().toISOString(),
        });
      } catch(e) {}
    });
  }

  function channelSend(msg) {
    if (!_channelReady) { _pendingSends.push(msg); }
    else { try { channel.send(msg); } catch(e) {} }
  }

  function pushState() {
    saveToDB();
    channelSend({ type:'broadcast', event:'state', payload:{ state:currentState } });
    notify(currentState);
  }

  // ── Realtime channel ───────────────────────────────────────────────────────
  var channel = db.channel('room:' + NS_ROOM);

  channel
    .on('postgres_changes', {
      event:'*', schema:'public', table:'games',
      filter:'room_code=eq.' + NS_ROOM,
    }, function(payload) {
      if (_isHostTab) return;
      var s = payload.new && payload.new.state;
      if (s) { currentState = s; notify(s); }
    })
    .on('broadcast', { event:'action' }, function(payload) {
      if (isHost) handleAction(payload.payload);
    })
    .on('broadcast', { event:'state' }, function(payload) {
      if (_isHostTab) return;
      if (payload.payload && payload.payload.state) { currentState = payload.payload.state; notify(currentState); }
    })
    .on('broadcast', { event:'reset' }, function(payload) {
      if (_isHostTab) return;
      if (payload.payload && payload.payload.state) { currentState = payload.payload.state; notify(currentState); }
    })
    .subscribe(function(status) {
      if (status === 'SUBSCRIBED') {
        _channelReady = true;
        var q = _pendingSends.splice(0);
        q.forEach(function(msg) { try { channel.send(msg); } catch(e) {} });
      }
    });

  // ── Actions ────────────────────────────────────────────────────────────────
  function handleAction(msg) {
    if (!msg) return;
    switch (msg.t) {
      case 'join':      applyJoin(msg.player);                   break;
      case 'pick':      applyPick(msg.playerId, msg.picks);      break;
      case 'confirm':   applyConfirm(msg.playerId, msg.picks);   break;
      case 'r4pick':    applyR4Pick(msg.playerId, msg.picks);    break;
      case 'r4confirm': applyR4Confirm(msg.playerId, msg.picks); break;
      case 'start':     applyStart();                            break;
      case 'advance':   applyAdvance();                          break;
      case 'reset':     applyReset();                            break;
    }
  }

  function applyJoin(player) {
    if (!player) return;
    if (currentState.phase === 'ended') return;
    var existing = currentState.players[player.id];
    if (existing) {
      existing.name = player.name;
    } else {
      currentState.players[player.id] = {
        id:player.id, name:player.name,
        r1picks:[], r2picks:[], r3picks:[], r4picks:[],
        r1done:false, r2done:false, r3done:false, r4done:false,
      };
    }
    pushState();
  }

  function applyPick(playerId, picks) {
    var p = currentState.players[playerId];
    if (!p) return;
    var ph = currentState.phase;
    if (ph === 'r1_picking') { p.r1picks = picks || []; }
    else if (ph === 'r2_cutting') { p.r2picks = picks || []; }
    else if (ph === 'r3_cutting') { p.r3picks = picks || []; }
    pushState();
  }

  function applyConfirm(playerId, picks) {
    var p = currentState.players[playerId];
    if (!p) return;
    var ph = currentState.phase;
    if (ph === 'r1_picking') { p.r1picks = picks || []; p.r1done = true; }
    else if (ph === 'r2_cutting') { p.r2picks = picks || []; p.r2done = true; }
    else if (ph === 'r3_cutting') { p.r3picks = picks || []; p.r3done = true; }
    pushState();
  }

  function applyR4Pick(playerId, picks) {
    var p = currentState.players[playerId];
    if (!p || currentState.phase !== 'r4_picking') return;
    p.r4picks = picks || [];
    pushState();
  }

  function applyR4Confirm(playerId, picks) {
    var p = currentState.players[playerId];
    if (!p || currentState.phase !== 'r4_picking') return;
    p.r4picks = picks || [];
    p.r4done  = true;
    pushState();
  }

  function applyStart() {
    if (currentState.phase !== 'lobby') return;
    currentState.phase = 'r1_picking';
    currentState.timerStart = Date.now();
    pushState();
  }

  var PHASE_NEXT = {
    r1_picking: 'r1_reveal',
    r1_reveal:  'inflation1',
    inflation1: 'r2_cutting',
    r2_cutting: 'r2_reveal',
    r2_reveal:  'inflation2',
    inflation2: 'r3_cutting',
    r3_cutting: 'r3_reveal',
    r3_reveal:  'r4_intro',
    r4_intro:   'r4_picking',
    r4_picking: 'ended',
  };

  function applyAdvance() {
    var next = PHASE_NEXT[currentState.phase];
    if (!next) return;
    currentState.phase = next;
    currentState.timerStart = Date.now();

    var players = Object.values(currentState.players);

    if (next === 'r2_cutting') {
      players.forEach(function(p) { p.r2picks = (p.r1picks || []).slice(); p.r2done = false; });
    }
    if (next === 'r3_cutting') {
      players.forEach(function(p) { p.r3picks = (p.r2picks || []).slice(); p.r3done = false; });
    }

    if (next === 'r4_intro') {
      var r4meta = {};
      var allSpent = players.every(function(p) { return calcSaved(p) <= 0; });

      players.forEach(function(p) {
        var saved   = calcSaved(p);
        var corpus  = Math.round(saved * SAVE_FACTOR);
        var r1spent = calcR1Spent(p);
        var r4budget = Math.max(0, BUDGET + corpus - r1spent);
        r4meta[p.id] = { saved:saved, corpus:corpus, r4budget:r4budget, simulated:false };
      });

      // If nobody saved, simulate 1–2 random savers so the lesson lands
      if (allSpent && players.length >= 1) {
        var simAmounts = players.length >= 2 ? [400000, 300000] : [400000];
        var shuffled = players.map(function(p) { return p.id; });
        for (var k = shuffled.length - 1; k > 0; k--) {
          var j = Math.floor(Math.random() * (k + 1));
          var tmp = shuffled[k]; shuffled[k] = shuffled[j]; shuffled[j] = tmp;
        }
        simAmounts.forEach(function(amt, i) {
          var pid = shuffled[i];
          if (!pid) return;
          var corpus  = Math.round(amt * SAVE_FACTOR);
          var r1spent = BUDGET - amt;
          r4meta[pid] = { saved:amt, corpus:corpus, r4budget:Math.max(0, BUDGET + corpus - r1spent), simulated:true };
        });
      }

      currentState.r4meta = r4meta;
    }

    if (next === 'r4_picking') {
      players.forEach(function(p) { p.r4picks = (p.r3picks || []).slice(); p.r4done = false; });
    }

    pushState();
  }

  function applyReset() {
    var s = freshState();
    s.sessionId = crypto.randomUUID();
    s.hostId    = MY_ID;
    currentState = s;
    pushState();
    channelSend({ type:'broadcast', event:'reset', payload:{ state:s } });
  }

  // ── Join retry ─────────────────────────────────────────────────────────────
  var _joinRetryTimer  = null;
  var _joinRetryPlayer = null;

  function stopJoinRetry() {
    clearInterval(_joinRetryTimer);
    _joinRetryTimer = null; _joinRetryPlayer = null;
  }

  function startJoinRetry(player) {
    stopJoinRetry();
    _joinRetryPlayer = player;
    var attempts = 0;
    _joinRetryTimer = setInterval(function() {
      attempts++;
      if (attempts > 8 || currentState.phase !== 'lobby') { stopJoinRetry(); return; }
      channelSend({ type:'broadcast', event:'action', payload:{ t:'join', player:_joinRetryPlayer } });
    }, 4000);
  }

  listeners.add(function(s) {
    if (_joinRetryTimer && s.players && s.players[MY_ID] && s.phase !== 'lobby') stopJoinRetry();
  });

  // ── Public send ────────────────────────────────────────────────────────────
  function send(msg) {
    if (_isHostTab || isHost) {
      handleAction(msg);
    } else {
      if (msg.t === 'join')      { applyJoin(msg.player); startJoinRetry(msg.player); }
      if (msg.t === 'pick')      applyPick(msg.playerId, msg.picks);
      if (msg.t === 'confirm')   { stopJoinRetry(); applyConfirm(msg.playerId, msg.picks); }
      if (msg.t === 'r4pick')    applyR4Pick(msg.playerId, msg.picks);
      if (msg.t === 'r4confirm') applyR4Confirm(msg.playerId, msg.picks);
      channelSend({ type:'broadcast', event:'action', payload:msg });
    }
  }

  // ── Host init ──────────────────────────────────────────────────────────────
  async function initHost() {
    isHost = true; _isHostTab = true;
    var s = freshState();
    s.sessionId = crypto.randomUUID();
    s.hostId    = MY_ID;
    currentState = s;
    notify(s);
    saveToDB();
    channelSend({ type:'broadcast', event:'reset', payload:{ state:s } });
  }

  async function loadExistingState() {
    try {
      var res = await db.from('games').select('state').eq('room_code', NS_ROOM).single();
      if (res.data && res.data.state) { currentState = res.data.state; notify(currentState); }
    } catch(e) {}
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.LTM_ENGINE = {
    subscribe:   function(fn) { listeners.add(fn); fn(currentState); return function() { listeners.delete(fn); }; },
    getState:    function() { return currentState; },
    getMyId:     function() { return MY_ID; },
    getRoomCode: function() { return ROOM_CODE; },
    initHost,
    loadExistingState,
    send,
    actions: {
      start:     function()      { send({ t:'start' }); },
      advance:   function()      { send({ t:'advance' }); },
      reset:     function()      { send({ t:'reset' }); },
      join:      function(name)  { send({ t:'join', player:{ id:MY_ID, name:name } }); },
      pick:      function(picks) { send({ t:'pick',      playerId:MY_ID, picks:picks }); },
      confirm:   function(picks) { send({ t:'confirm',   playerId:MY_ID, picks:picks }); },
      r4pick:    function(picks) { send({ t:'r4pick',    playerId:MY_ID, picks:picks }); },
      r4confirm: function(picks) { send({ t:'r4confirm', playerId:MY_ID, picks:picks }); },
    },
  };

  if (!_isHostTab && ROOM_CODE) loadExistingState();

})();
