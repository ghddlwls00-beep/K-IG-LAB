import fs from 'fs';

const items22to42 = [
  { n: '22', text: 'Where is he?' },
  { n: '23', text: 'Who are you?' },
  { n: '24', text: 'What is he?' },
  { n: '25', text: 'Is she your girlfriend?' },
  { n: '26', text: 'Are they your friends?' },
  { n: '27', text: 'Are these boys your classmates?' },
  { n: '28', text: 'Whose pen is this?' },
  { n: '29', text: 'Is she beautiful?' },
  { n: '30', text: 'Is this pen yours?' },
  { n: '31', text: 'Are these yours?' },
  { n: '32', text: 'Is this mine?' },
  { n: '33', text: 'Where are they?' },
  { n: '34', text: 'Where is she?' },
  { n: '35', text: 'Where are we?' },
  { n: '36', text: 'How is your mother?' },
  { n: '37', text: 'Is he your boss?' },
  { n: '38', text: 'What time is it?' },
  { n: '39', text: "It is seven o'clock." },
  { n: '40', text: 'Is it cold?' },
  { n: '41', text: 'No, it is not cold.' },
  { n: '42', text: 'It is warm.' }
];

// Update gh1-007.json
const g7 = JSON.parse(fs.readFileSync('content/lessons/grammar1/gh1-007.json', 'utf-8'));
const sBlock = g7.blocks.find(b => b.type === 'sentences');
if (sBlock) {
  sBlock.items = sBlock.items.slice(0, 21).concat(items22to42);
}
fs.writeFileSync('content/lessons/grammar1/gh1-007.json', JSON.stringify(g7, null, 2), 'utf-8');

// Create gh1-007-1.json (items 1-21)
const g7_1 = JSON.parse(JSON.stringify(g7));
g7_1.id = 'gh1-007-1';
g7_1.variant = 'script';
g7_1.pairId = 'gh1-006-1';
g7_1.label = '[ Page 007-1 ]';
g7_1.menuLabel = '[ gh1-007-1 ]';
const h1 = g7_1.blocks.find(b => b.type === 'heading');
if (h1) h1.text = '[ Page 007-1 ]';
const s1 = g7_1.blocks.find(b => b.type === 'sentences');
if (s1) s1.items = sBlock.items.slice(0, 21);
fs.writeFileSync('content/lessons/grammar1/gh1-007-1.json', JSON.stringify(g7_1, null, 2), 'utf-8');

// Create gh1-007-2.json (items 22-42)
const g7_2 = JSON.parse(JSON.stringify(g7));
g7_2.id = 'gh1-007-2';
g7_2.variant = 'script';
g7_2.pairId = 'gh1-006-2';
g7_2.label = '[ Page 007-2 ]';
g7_2.menuLabel = '[ gh1-007-2 ]';
const h2 = g7_2.blocks.find(b => b.type === 'heading');
if (h2) h2.text = '[ Page 007-2 ]';
const s2 = g7_2.blocks.find(b => b.type === 'sentences');
if (s2) s2.items = items22to42;
fs.writeFileSync('content/lessons/grammar1/gh1-007-2.json', JSON.stringify(g7_2, null, 2), 'utf-8');

// Update content/courses/grammar1.json to include gh1-007-1 and gh1-007-2
const g1Course = JSON.parse(fs.readFileSync('content/courses/grammar1.json', 'utf-8'));
const idx7 = g1Course.lessons.findIndex(l => l.id === 'gh1-007');
if (idx7 >= 0) {
  if (!g1Course.lessons.some(l => l.id === 'gh1-007-1')) {
    g1Course.lessons.splice(idx7 + 1, 0, {
      id: 'gh1-007-1',
      title: g7_1.title,
      label: g7_1.label,
      series: 'gh1',
      variant: 'script',
      unit: 7,
      part: null,
      order: 4,
      hasAudio: true,
      menuLabel: '[ gh1-007-1 ]'
    });
  }
  if (!g1Course.lessons.some(l => l.id === 'gh1-007-2')) {
    g1Course.lessons.splice(idx7 + 2, 0, {
      id: 'gh1-007-2',
      title: g7_2.title,
      label: g7_2.label,
      series: 'gh1',
      variant: 'script',
      unit: 7,
      part: null,
      order: 5,
      hasAudio: true,
      menuLabel: '[ gh1-007-2 ]'
    });
  }
  g1Course.lessonCount = g1Course.lessons.length;
  fs.writeFileSync('content/courses/grammar1.json', JSON.stringify(g1Course, null, 2), 'utf-8');
}

console.log('Updated gh1-007, gh1-007-1, gh1-007-2 and grammar1.json');
