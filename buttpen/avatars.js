// Original kid-friendly top-down avatars. Each faces UP; the pen tip is at (50, 114).
(function (root) {
  var VIEW = { w: 100, h: 120, penX: 50, penY: 114 };

  function crayon() {
    // Class names let the app recolor the crayon to match the current pen.
    return [
      '<g class="bp-crayon" stroke="#333" stroke-width="1.1" stroke-linejoin="round">',
      '  <rect class="buttpen-crayon" x="45" y="96" width="10" height="12" rx="2" fill="#ffb703"/>',
      '  <rect class="buttpen-crayon" x="45.8" y="97.2" width="3" height="9" rx="1" fill="#ffffff" stroke="none" opacity=".28"/>',
      '  <path d="M45 108 L50 114 L55 108 Z" fill="#ffe0a3"/>',
      '  <path class="buttpen-crayon-tip" d="M47.4 110.6 L50 114 L52.6 110.6 Z" fill="#ffb703"/>',
      '</g>'
    ].join('');
  }

  function wrap(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120" aria-hidden="true">' +
      crayon() + inner + '</svg>';
  }

  var AVATARS = [
    {
      id: 'turtle', name: 'Shelly', title: 'Turtle',
      svg: wrap([
        // legs
        '<ellipse cx="24" cy="40" rx="9" ry="6" fill="#7bc45a" stroke="#2f6d24" stroke-width="1.2"/>',
        '<ellipse cx="76" cy="40" rx="9" ry="6" fill="#7bc45a" stroke="#2f6d24" stroke-width="1.2"/>',
        '<ellipse cx="24" cy="76" rx="9" ry="6" fill="#7bc45a" stroke="#2f6d24" stroke-width="1.2"/>',
        '<ellipse cx="76" cy="76" rx="9" ry="6" fill="#7bc45a" stroke="#2f6d24" stroke-width="1.2"/>',
        // tail nub
        '<ellipse cx="50" cy="92" rx="6" ry="7" fill="#7bc45a" stroke="#2f6d24" stroke-width="1.2"/>',
        // shell
        '<ellipse cx="50" cy="60" rx="30" ry="26" fill="#3f8c2a" stroke="#2a5c1c" stroke-width="1.6"/>',
        '<ellipse cx="50" cy="60" rx="24" ry="20" fill="#5aad3a" stroke="#2a5c1c" stroke-width="1"/>',
        '<path d="M50 40 L50 80 M32 52 L68 68 M68 52 L32 68" stroke="#2a5c1c" stroke-width="1.2" fill="none" opacity=".7"/>',
        // head (front / top)
        '<ellipse cx="50" cy="24" rx="13" ry="12" fill="#7bc45a" stroke="#2f6d24" stroke-width="1.4"/>',
        '<circle cx="45" cy="22" r="2.4" fill="#222"/>',
        '<circle cx="55" cy="22" r="2.4" fill="#222"/>',
        '<circle cx="44.3" cy="21.3" r="0.8" fill="#fff"/>',
        '<circle cx="54.3" cy="21.3" r="0.8" fill="#fff"/>',
        '<ellipse cx="50" cy="28.5" rx="3" ry="1.6" fill="#2f6d24" opacity=".4"/>'
      ].join(''))
    },
    {
      id: 'puppy', name: 'Puddles', title: 'Puppy',
      svg: wrap([
        // body
        '<ellipse cx="50" cy="66" rx="24" ry="28" fill="#d4a06a" stroke="#7a4a22" stroke-width="1.5"/>',
        '<ellipse cx="50" cy="70" rx="14" ry="16" fill="#f0d3a8" stroke="none"/>',
        // back paws
        '<ellipse cx="32" cy="90" rx="8" ry="6" fill="#c48c58" stroke="#7a4a22" stroke-width="1.2"/>',
        '<ellipse cx="68" cy="90" rx="8" ry="6" fill="#c48c58" stroke="#7a4a22" stroke-width="1.2"/>',
        // tail nub over the crayon
        '<ellipse cx="50" cy="96" rx="6" ry="8" fill="#c48c58" stroke="#7a4a22" stroke-width="1.2"/>',
        // front paws
        '<ellipse cx="30" cy="46" rx="7" ry="6" fill="#c48c58" stroke="#7a4a22" stroke-width="1.2"/>',
        '<ellipse cx="70" cy="46" rx="7" ry="6" fill="#c48c58" stroke="#7a4a22" stroke-width="1.2"/>',
        // floppy ears behind head
        '<ellipse cx="28" cy="28" rx="9" ry="16" fill="#a86b38" stroke="#7a4a22" stroke-width="1.2" transform="rotate(-18 28 28)"/>',
        '<ellipse cx="72" cy="28" rx="9" ry="16" fill="#a86b38" stroke="#7a4a22" stroke-width="1.2" transform="rotate(18 72 28)"/>',
        // head
        '<ellipse cx="50" cy="30" rx="20" ry="18" fill="#d4a06a" stroke="#7a4a22" stroke-width="1.5"/>',
        '<ellipse cx="50" cy="36" rx="10" ry="8" fill="#f0d3a8"/>',
        '<ellipse cx="50" cy="38" rx="4.2" ry="3" fill="#333"/>',
        '<circle cx="42" cy="28" r="2.5" fill="#222"/>',
        '<circle cx="58" cy="28" r="2.5" fill="#222"/>',
        '<circle cx="41.3" cy="27.2" r="0.8" fill="#fff"/>',
        '<circle cx="57.3" cy="27.2" r="0.8" fill="#fff"/>',
        '<path d="M46 41 Q50 45 54 41" stroke="#7a4a22" stroke-width="1.2" fill="none" stroke-linecap="round"/>'
      ].join(''))
    },
    {
      id: 'kitty', name: 'Mochi', title: 'Kitty',
      svg: wrap([
        // body
        '<ellipse cx="50" cy="64" rx="22" ry="26" fill="#f4a259" stroke="#c56a1a" stroke-width="1.5"/>',
        '<ellipse cx="50" cy="70" rx="12" ry="14" fill="#ffe0bd"/>',
        // stripes
        '<path d="M38 54 Q50 50 62 54 M36 66 Q50 62 64 66 M40 78 Q50 74 60 78" stroke="#d97706" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>',
        // paws
        '<ellipse cx="32" cy="46" rx="7" ry="5.5" fill="#f4a259" stroke="#c56a1a" stroke-width="1.2"/>',
        '<ellipse cx="68" cy="46" rx="7" ry="5.5" fill="#f4a259" stroke="#c56a1a" stroke-width="1.2"/>',
        '<ellipse cx="33" cy="88" rx="7" ry="5.5" fill="#f4a259" stroke="#c56a1a" stroke-width="1.2"/>',
        '<ellipse cx="67" cy="88" rx="7" ry="5.5" fill="#f4a259" stroke="#c56a1a" stroke-width="1.2"/>',
        // tail beside the crayon
        '<path d="M60 90 Q78 86 80 70" stroke="#f4a259" stroke-width="7" fill="none" stroke-linecap="round"/>',
        '<path d="M60 90 Q78 86 80 70" stroke="#c56a1a" stroke-width="5" fill="none" stroke-linecap="round" opacity=".0"/>',
        '<path d="M60 90 Q78 86 80 70" stroke="#c56a1a" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
        // head + ears
        '<polygon points="28,22 34,6 44,20" fill="#f4a259" stroke="#c56a1a" stroke-width="1.3" stroke-linejoin="round"/>',
        '<polygon points="72,22 66,6 56,20" fill="#f4a259" stroke="#c56a1a" stroke-width="1.3" stroke-linejoin="round"/>',
        '<polygon points="32,20 35,10 41,20" fill="#ffb4c8"/>',
        '<polygon points="68,20 65,10 59,20" fill="#ffb4c8"/>',
        '<ellipse cx="50" cy="30" rx="20" ry="17" fill="#f4a259" stroke="#c56a1a" stroke-width="1.5"/>',
        '<circle cx="42" cy="30" r="2.5" fill="#222"/>',
        '<circle cx="58" cy="30" r="2.5" fill="#222"/>',
        '<circle cx="41.3" cy="29.2" r="0.8" fill="#fff"/>',
        '<circle cx="57.3" cy="29.2" r="0.8" fill="#fff"/>',
        '<path d="M50 32 L50 36" stroke="#c56a1a" stroke-width="1.2"/>',
        '<path d="M50 36 L46 38 M50 36 L54 38" stroke="#333" stroke-width="1.1" stroke-linecap="round"/>',
        '<path d="M32 34 L18 30 M32 36 L18 36 M32 38 L18 42 M68 34 L82 30 M68 36 L82 36 M68 38 L82 42" stroke="#333" stroke-width="1" stroke-linecap="round"/>'
      ].join(''))
    },
    {
      id: 'bunny', name: 'Clover', title: 'Bunny',
      svg: wrap([
        // ears pointing forward (up)
        '<ellipse cx="38" cy="18" rx="8" ry="22" fill="#f3e6d0" stroke="#b08968" stroke-width="1.3"/>',
        '<ellipse cx="62" cy="18" rx="8" ry="22" fill="#f3e6d0" stroke="#b08968" stroke-width="1.3"/>',
        '<ellipse cx="38" cy="18" rx="3.5" ry="14" fill="#ffb6c8"/>',
        '<ellipse cx="62" cy="18" rx="3.5" ry="14" fill="#ffb6c8"/>',
        // body
        '<ellipse cx="50" cy="68" rx="24" ry="26" fill="#f3e6d0" stroke="#b08968" stroke-width="1.5"/>',
        '<ellipse cx="50" cy="74" rx="14" ry="14" fill="#fff6ea"/>',
        // paws
        '<ellipse cx="30" cy="50" rx="7" ry="6" fill="#e9d4b3" stroke="#b08968" stroke-width="1.1"/>',
        '<ellipse cx="70" cy="50" rx="7" ry="6" fill="#e9d4b3" stroke="#b08968" stroke-width="1.1"/>',
        '<ellipse cx="32" cy="90" rx="7" ry="6" fill="#e9d4b3" stroke="#b08968" stroke-width="1.1"/>',
        '<ellipse cx="68" cy="90" rx="7" ry="6" fill="#e9d4b3" stroke="#b08968" stroke-width="1.1"/>',
        // cottontail over crayon
        '<circle cx="50" cy="96" r="8" fill="#fff" stroke="#b08968" stroke-width="1.1"/>',
        // head
        '<ellipse cx="50" cy="36" rx="20" ry="16" fill="#f3e6d0" stroke="#b08968" stroke-width="1.5"/>',
        '<ellipse cx="50" cy="40" rx="8" ry="6" fill="#fff6ea"/>',
        '<circle cx="42" cy="34" r="2.4" fill="#222"/>',
        '<circle cx="58" cy="34" r="2.4" fill="#222"/>',
        '<circle cx="41.3" cy="33.3" r="0.8" fill="#fff"/>',
        '<circle cx="57.3" cy="33.3" r="0.8" fill="#fff"/>',
        '<ellipse cx="41" cy="39" rx="3.2" ry="2" fill="#ffb6c8" opacity=".8"/>',
        '<ellipse cx="59" cy="39" rx="3.2" ry="2" fill="#ffb6c8" opacity=".8"/>',
        '<ellipse cx="50" cy="41" rx="3.2" ry="2.2" fill="#f4a0b5"/>'
      ].join(''))
    },
    {
      id: 'dino', name: 'Dot', title: 'Dino',
      svg: wrap([
        // back spikes (along the body toward the head)
        '<polygon points="50,36 55,22 45,22" fill="#7b2cbf" stroke="#4a1770" stroke-width="1"/>',
        '<polygon points="50,50 56,36 44,36" fill="#7b2cbf" stroke="#4a1770" stroke-width="1"/>',
        '<polygon points="50,64 56,50 44,50" fill="#9b5de5" stroke="#4a1770" stroke-width="1"/>',
        '<polygon points="50,78 55,66 45,66" fill="#9b5de5" stroke="#4a1770" stroke-width="1"/>',
        // body
        '<ellipse cx="50" cy="64" rx="24" ry="28" fill="#43aa8b" stroke="#1d6a56" stroke-width="1.5"/>',
        '<circle cx="38" cy="58" r="5" fill="#f9c74f"/>',
        '<circle cx="60" cy="70" r="4" fill="#f9c74f"/>',
        '<circle cx="48" cy="80" r="3.5" fill="#f9c74f"/>',
        // legs
        '<ellipse cx="32" cy="48" rx="7" ry="6" fill="#2d9b7a" stroke="#1d6a56" stroke-width="1.2"/>',
        '<ellipse cx="68" cy="48" rx="7" ry="6" fill="#2d9b7a" stroke="#1d6a56" stroke-width="1.2"/>',
        '<ellipse cx="32" cy="88" rx="8" ry="6" fill="#2d9b7a" stroke="#1d6a56" stroke-width="1.2"/>',
        '<ellipse cx="68" cy="88" rx="8" ry="6" fill="#2d9b7a" stroke="#1d6a56" stroke-width="1.2"/>',
        // tail over crayon
        '<ellipse cx="50" cy="96" rx="8" ry="10" fill="#43aa8b" stroke="#1d6a56" stroke-width="1.3"/>',
        // head + snout at the front
        '<ellipse cx="50" cy="26" rx="16" ry="14" fill="#43aa8b" stroke="#1d6a56" stroke-width="1.5"/>',
        '<ellipse cx="50" cy="16" rx="9" ry="7" fill="#2d9b7a" stroke="#1d6a56" stroke-width="1.2"/>',
        '<circle cx="44" cy="24" r="2.5" fill="#222"/>',
        '<circle cx="56" cy="24" r="2.5" fill="#222"/>',
        '<circle cx="43.3" cy="23.2" r="0.8" fill="#fff"/>',
        '<circle cx="55.3" cy="23.2" r="0.8" fill="#fff"/>',
        '<ellipse cx="50" cy="30" rx="5" ry="2" fill="#1d6a56" opacity=".4"/>'
      ].join(''))
    },
    {
      id: 'robot', name: 'Beep', title: 'Robot',
      svg: wrap([
        // antenna (front)
        '<line x1="50" y1="16" x2="50" y2="4" stroke="#4cc9f0" stroke-width="2.2" stroke-linecap="round"/>',
        '<circle cx="50" cy="4" r="3.2" fill="#ff4d6d" stroke="#333" stroke-width="1"/>',
        // arms
        '<rect x="16" y="48" width="12" height="8" rx="3" fill="#90e0ef" stroke="#333" stroke-width="1.2"/>',
        '<rect x="72" y="48" width="12" height="8" rx="3" fill="#90e0ef" stroke="#333" stroke-width="1.2"/>',
        // body
        '<rect x="26" y="40" width="48" height="50" rx="8" fill="#4895ef" stroke="#333" stroke-width="1.6"/>',
        '<rect x="32" y="48" width="36" height="18" rx="4" fill="#caf0f8" stroke="#333" stroke-width="1.1"/>',
        '<circle cx="40" cy="57" r="3" fill="#8ac926"/>',
        '<circle cx="50" cy="57" r="3" fill="#ffca3a"/>',
        '<circle cx="60" cy="57" r="3" fill="#e63946"/>',
        '<rect x="36" y="72" width="28" height="6" rx="2" fill="#166088" stroke="#333" stroke-width="1"/>',
        // treads / feet
        '<rect x="28" y="88" width="16" height="10" rx="3" fill="#222" stroke="#111" stroke-width="1"/>',
        '<rect x="56" y="88" width="16" height="10" rx="3" fill="#222" stroke="#111" stroke-width="1"/>',
        // head
        '<rect x="30" y="16" width="40" height="26" rx="6" fill="#4cc9f0" stroke="#333" stroke-width="1.6"/>',
        '<rect x="36" y="22" width="28" height="14" rx="4" fill="#14213d" stroke="#333" stroke-width="1"/>',
        '<circle cx="44" cy="29" r="3.2" fill="#8ac926"/>',
        '<circle cx="56" cy="29" r="3.2" fill="#8ac926"/>',
        '<circle cx="43.4" cy="28.3" r="1" fill="#fff"/>',
        '<circle cx="55.4" cy="28.3" r="1" fill="#fff"/>'
      ].join(''))
    },
    {
      id: 'unicorn', name: 'Sparkle', title: 'Unicorn',
      svg: wrap([
        // mane tufts
        '<path d="M36 28 Q28 18 34 8 Q44 16 40 28" fill="#ff70a6" stroke="#c9184a" stroke-width="1"/>',
        '<path d="M44 24 Q40 10 50 4 Q58 12 52 26" fill="#9b5de5" stroke="#5a189a" stroke-width="1"/>',
        '<path d="M56 28 Q62 14 70 10 Q68 24 60 30" fill="#4cc9f0" stroke="#0077b6" stroke-width="1"/>',
        // body
        '<ellipse cx="50" cy="66" rx="23" ry="26" fill="#fff7fb" stroke="#c9a0b0" stroke-width="1.5"/>',
        '<ellipse cx="50" cy="72" rx="12" ry="12" fill="#ffe5f1"/>',
        // hooves / legs
        '<ellipse cx="32" cy="48" rx="6.5" ry="5.5" fill="#fff7fb" stroke="#c9a0b0" stroke-width="1.2"/>',
        '<ellipse cx="68" cy="48" rx="6.5" ry="5.5" fill="#fff7fb" stroke="#c9a0b0" stroke-width="1.2"/>',
        '<ellipse cx="32" cy="90" rx="6.5" ry="5.5" fill="#fff7fb" stroke="#c9a0b0" stroke-width="1.2"/>',
        '<ellipse cx="68" cy="90" rx="6.5" ry="5.5" fill="#fff7fb" stroke="#c9a0b0" stroke-width="1.2"/>',
        // tail over crayon, rainbow-ish
        '<path d="M54 94 Q70 100 74 84" stroke="#ff70a6" stroke-width="4" fill="none" stroke-linecap="round"/>',
        '<path d="M52 92 Q66 98 70 80" stroke="#9b5de5" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
        '<path d="M50 92 Q62 96 66 78" stroke="#4cc9f0" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
        // head
        '<ellipse cx="50" cy="32" rx="18" ry="16" fill="#fff7fb" stroke="#c9a0b0" stroke-width="1.5"/>',
        // horn (front)
        '<polygon points="50,2 54,20 46,20" fill="#ffd60a" stroke="#c9a227" stroke-width="1.1" stroke-linejoin="round"/>',
        '<path d="M48 16 L52 14 M47.5 11 L52.5 9" stroke="#c9a227" stroke-width="0.8"/>',
        '<ellipse cx="50" cy="36" rx="7" ry="5" fill="#ffe5f1"/>',
        '<circle cx="43" cy="30" r="2.3" fill="#222"/>',
        '<circle cx="57" cy="30" r="2.3" fill="#222"/>',
        '<circle cx="42.4" cy="29.3" r="0.8" fill="#fff"/>',
        '<circle cx="56.4" cy="29.3" r="0.8" fill="#fff"/>',
        '<ellipse cx="50" cy="37.5" rx="3" ry="2" fill="#ff8fab"/>',
        '<path d="M46 41 Q50 44 54 41" stroke="#c9a0b0" stroke-width="1.1" fill="none" stroke-linecap="round"/>'
      ].join(''))
    }
  ];

  function get(id) {
    for (var i = 0; i < AVATARS.length; i++) if (AVATARS[i].id === id) return AVATARS[i];
    return AVATARS[0];
  }

  var api = { AVATARS: AVATARS, get: get, VIEW: VIEW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ButtPenAvatars = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
