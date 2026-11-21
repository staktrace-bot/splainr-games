(function (root) {
  var EXAMPLES = [
    {
      id: 'square',
      name: 'Square',
      hint: 'Uses a repeat loop',
      code: [
        '; A square — repeat the same two steps 4 times!',
        'color green',
        'repeat 4 [',
        '  forward 80',
        '  right 90',
        ']'
      ].join('\n')
    },
    {
      id: 'star',
      name: 'Star',
      hint: 'Uses a repeat loop',
      code: [
        '; A 5-pointed star. 144 is a special turning number!',
        'color gold',
        'width 4',
        'repeat 5 [',
        '  forward 90',
        '  right 144',
        ']'
      ].join('\n')
    },
    {
      id: 'flower',
      name: 'Flower',
      hint: 'A loop inside a loop',
      code: [
        '; A flower of hexagons — one loop inside another!',
        'color pink',
        'repeat 12 [',
        '  repeat 6 [',
        '    forward 40',
        '    right 60',
        '  ]',
        '  right 30',
        ']'
      ].join('\n')
    },
    {
      id: 'house',
      name: 'House',
      hint: 'A recipe (subroutine) you can reuse',
      code: [
        '; A house. The "box" recipe uses a loop, then we add a roof.',
        'to box :size',
        '  repeat 4 [',
        '    forward :size',
        '    right 90',
        '  ]',
        'end',
        '',
        'pen up',
        'back 60',
        'left 90',
        'forward 40',
        'right 90',
        'pen down',
        '',
        'color brown',
        'width 4',
        'box 80',
        'forward 80',
        'right 30',
        'color red',
        'forward 80',
        'right 120',
        'forward 80'
      ].join('\n')
    }
  ];

  var DEFAULT_PROGRAM = [
    '; Welcome to ButtPen!',
    '; Your character holds the pen in their butt,',
    '; so they draw as they walk.',
    '; Tap Repeat or try an example, then press Run.',
    '',
    'color green',
    'repeat 4 [',
    '  forward 80',
    '  right 90',
    ']'
  ].join('\n');

  var api = { EXAMPLES: EXAMPLES, DEFAULT_PROGRAM: DEFAULT_PROGRAM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ButtPenExamples = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
