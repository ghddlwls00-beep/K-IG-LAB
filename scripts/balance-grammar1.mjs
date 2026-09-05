import fs from 'fs';

function updateLessonSentences(id, updater) {
  const file = `content/lessons/grammar1/${id}.json`;
  if (!fs.existsSync(file)) return;
  const d = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const sBlock = d.blocks.find(b => b.type === 'sentences');
  if (sBlock) {
    updater(sBlock);
    fs.writeFileSync(file, JSON.stringify(d, null, 2), 'utf-8');
    console.log(`Updated ${id}`);
  }
}

// 1. gh1-031
updateLessonSentences('gh1-031', (sBlock) => {
  sBlock.items = [
    { n: '1', text: 'I love you.' },
    { n: '2', text: 'You love my sister.' },
    { n: '3', text: 'He loves me.' },
    { n: '4', text: 'She loves your brother.' },
    { n: '5', text: 'They love you.' },
    { n: '6', text: 'She loves his brother.' },
    { n: '7', text: 'I love him.' },
    { n: '8', text: 'He loves her sister.' },
    { n: '9', text: 'I love her.' },
    { n: '10', text: "I don't love you." },
    { n: '11', text: "You don't love my sister." },
    { n: '12', text: "He doesn't love me." },
    { n: '13', text: "She doesn't love your brother." },
    { n: '14', text: "They don't love you." },
    { n: '15', text: "She doesn't love his brother." },
    { n: '16', text: "I don't love him." },
    { n: '17', text: "He doesn't love her sister." },
    { n: '18', text: "I don't love her." },
    { n: '19', text: 'Do I love you?' },
    { n: '20', text: 'Do you love my sister?' },
    { n: '21', text: 'Does he love me?' },
    { n: '22', text: 'Does she love your brother?' },
    { n: '23', text: 'Do they love you?' },
    { n: '24', text: 'Does she love his brother?' },
    { n: '25', text: 'Do I love him?' }
  ];
});

// 2. gh1-033
updateLessonSentences('gh1-033', (sBlock) => {
  if (!sBlock.items.some(it => it.n === '24')) {
    sBlock.items.push({ n: '24', text: "Aren't they yours?" });
  }
  if (!sBlock.items.some(it => it.n === '25')) {
    sBlock.items.push({ n: '25', text: "Aren't these his?" });
  }
});

// 3. gh1-038
updateLessonSentences('gh1-038', (sBlock) => {
  if (!sBlock.items.some(it => it.n === '20')) {
    const idx19 = sBlock.items.findIndex(it => it.n === '19');
    sBlock.items.splice(idx19 + 1, 0, { n: '20', text: '그것들은 책들이지?' });
  }
});

// 4. gh1-041
updateLessonSentences('gh1-041', (sBlock) => {
  sBlock.items = [
    { n: '26', text: "I love you, don't I?" },
    { n: '27', text: "You love my sister, don't you?" },
    { n: '28', text: "He loves me, doesn't he?" },
    { n: '29', text: "She loves your brother, doesn't she?" },
    { n: '30', text: "They love you, don't they?" },
    { n: '31', text: "She loves his brother, doesn't she?" },
    { n: '32', text: "I love him, don't I?" },
    { n: '33', text: "He loves her sister, doesn't he?" },
    { n: '34', text: "I love her, don't I?" },
    { n: '35', text: "I don't love you, do I?" },
    { n: '36', text: "You don't love my sister, do you?" },
    { n: '37', text: "He doesn't love me, does he?" },
    { n: '38', text: "She doesn't love your brother, does she?" },
    { n: '39', text: "They don't love you, do they?" },
    { n: '40', text: "She doesn't love his brother, does she?" },
    { n: '41', text: "She loves your brother, doesn't she?" },
    { n: '42', text: "They love you, don't they?" },
    { n: '43', text: "She loves his brother, doesn't she?" },
    { n: '44', text: "He loves her sister, doesn't he?" },
    { n: '45', text: "You don't love my sister, do you?" },
    { n: '46', text: "He doesn't love me, does he?" },
    { n: '47', text: "She doesn't love your brother, does she?" },
    { n: '48', text: "They don't love you, do they?" },
    { n: '49', text: "She doesn't love his brother, does she?" },
    { n: '50', text: "Your sister doesn't love my brother, does she?" }
  ];
});

// 5. gh1-047
updateLessonSentences('gh1-047', (sBlock) => {
  if (!sBlock.items.some(it => it.n === '37')) {
    sBlock.items.push({ n: '37', text: "Your sister doesn't love my brother, does she?" });
  }
});

// 6. gh1-067
updateLessonSentences('gh1-067', (sBlock) => {
  if (!sBlock.items.some(it => it.n === '63')) {
    const idx62 = sBlock.items.findIndex(it => it.n === '62');
    sBlock.items.splice(idx62 + 1, 0, { n: '63', text: "She is happy, isn't she?" });
  }
});

// 7. gh1-080
updateLessonSentences('gh1-080', (sBlock) => {
  if (!sBlock.items.some(it => it.n === '39')) {
    sBlock.items.push({ n: '39', text: '너의 할머니는 이것을 찾지 않으셨지?' });
  }
});

// 8. gh1-090
updateLessonSentences('gh1-090', (sBlock) => {
  if (!sBlock.items.some(it => it.n === '20')) {
    sBlock.items.push({ n: '20', text: '왜 그것이 국경 밖에서 일어납니까?' });
  }
});

console.log('All 8 grammar1 pairs balanced.');
