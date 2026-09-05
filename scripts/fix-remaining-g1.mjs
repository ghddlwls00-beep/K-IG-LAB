import fs from 'fs';

// 1. Fix gh1-047-2 missing item 113
const d47_2 = JSON.parse(fs.readFileSync('content/lessons/grammar1/gh1-047-2.json', 'utf-8'));
const sBlock47 = d47_2.blocks.find(b => b.type === 'sentences');
const idx112 = sBlock47.items.findIndex(it => it.n === '112');
if (idx112 >= 0 && !sBlock47.items.some(it => it.n === '113')) {
  sBlock47.items.splice(idx112 + 1, 0, { n: '113', text: "He doesn't love me, does he?" });
  fs.writeFileSync('content/lessons/grammar1/gh1-047-2.json', JSON.stringify(d47_2, null, 2), 'utf-8');
  console.log('Added item 113 to gh1-047-2');
}

// 2. Create gh1-089.json as answer sheet for gh1-088
const g88 = JSON.parse(fs.readFileSync('content/lessons/grammar1/gh1-088.json', 'utf-8'));
const g89 = {
  id: 'gh1-089',
  course: 'grammar1',
  series: 'gh1',
  variant: 'main',
  pairId: 'gh1-088',
  title: '::: K-IG 교육 영어듣기훈련프로그램 | 기초2 | 제 001 회 강의 :::',
  label: '[ Page 089]',
  menuLabel: '[ gh1-089 ]',
  unit: 89,
  part: null,
  order: 135,
  audio: [
    {
      src: '/audio/grammar1/gh1-088.mp3',
      legacySrc: 'sounds/gh1-088.mp3',
      autoplay: true
    }
  ],
  video: [],
  blocks: [
    {
      type: 'heading',
      text: '[ Page 089]'
    },
    {
      type: 'instruction',
      text: '영작문제 1 답안'
    },
    {
      type: 'instruction',
      text: '다음 문제를 영작해주세요.'
    },
    {
      type: 'sentences',
      items: [
        { n: '1', text: 'Is this your homework (assignment)?' },
        { n: '2', text: 'Is this prize yours?' },
        { n: '3', text: 'Is your professor healthy?' },
        { n: '4', text: 'Whose employees are these girls?' },
        { n: '5', text: 'Are they police officers?' },
        { n: '6', text: 'Is your employer unhappy?' },
        { n: '7', text: 'Are these adults rich?' },
        { n: '8', text: 'Is this soldier brave?' },
        { n: '9', text: 'Whose enemies are they?' },
        { n: '10', text: 'Are those animals dangerous?' },
        { n: '11', text: 'Is your colleague honest?' },
        { n: '12', text: 'Are these plants rare?' },
        { n: '13', text: 'Is that ship big?' },
        { n: '14', text: 'Is this car convenient?' },
        { n: '15', text: 'Is your airplane safe?' },
        { n: '16', text: 'Is this road wide?' },
        { n: '17', text: 'Is that building tall?' },
        { n: '18', text: 'Is the weather clear today?' },
        { n: '19', text: 'What time is it now?' },
        { n: '20', text: 'It is eight thirty.' }
      ]
    },
    {
      type: 'choice',
      options: ['1 번', '2 번', '3 번', '4 번', '5 번']
    },
    {
      type: 'dictation',
      rows: 10
    }
  ],
  legacyPath: 'grammar1/gh1-089.htm',
  legacyEncoding: 'utf-8'
};
fs.writeFileSync('content/lessons/grammar1/gh1-089.json', JSON.stringify(g89, null, 2), 'utf-8');
console.log('Created gh1-089.json');

// Also update content/courses/grammar1.json to include gh1-089
const g1Course = JSON.parse(fs.readFileSync('content/courses/grammar1.json', 'utf-8'));
const idx88 = g1Course.lessons.findIndex(l => l.id === 'gh1-088');
if (idx88 >= 0 && !g1Course.lessons.some(l => l.id === 'gh1-089')) {
  g1Course.lessons.splice(idx88 + 1, 0, {
    id: 'gh1-089',
    title: g89.title,
    label: g89.label,
    series: 'gh1',
    variant: 'main',
    unit: 89,
    part: null,
    order: 135,
    hasAudio: true,
    menuLabel: '[ gh1-089 ]'
  });
  g1Course.lessonCount = g1Course.lessons.length;
  fs.writeFileSync('content/courses/grammar1.json', JSON.stringify(g1Course, null, 2), 'utf-8');
  console.log('Added gh1-089 to grammar1.json');
}
