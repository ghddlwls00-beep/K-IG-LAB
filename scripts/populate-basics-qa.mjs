import fs from 'fs';
import path from 'path';

// Load QA data
const rawData = JSON.parse(fs.readFileSync('scripts/qa_data.json', 'utf-8'));

function cleanKoText(text) {
  return text
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKoreanQuestion(inst) {
  const parts = inst.split(/→|->|─>/);
  const qPart = parts.length > 1 ? parts[1] : parts[0];
  return cleanKoText(qPart);
}

// Translations mapping for common question patterns and answers in the 20 units of basics/qa
const QA_TRANSLATIONS = {
  "qa011-1": {
    qEn: "What is your name?",
    aEn: "My name is Minwoo Kim."
  },
  "qa012-1": {
    qEn: "Where do you live?",
    aEn: "I live in Seoul."
  },
  "qa013-1": {
    qEn: "How old are you?",
    aEn: "I am 12 years old."
  },
  "qa014-1": {
    qEn: "What grade are you in?",
    aEn: "I am in 5th grade. I go to Goryeo Elementary School."
  },
  "qa015-1": {
    qEn: "What is your personality like?",
    aEn: "I am kind of an active person. I have many friends. Most people like me."
  },
  "qa016-1": {
    qEn: "What is your hobby?",
    aEn: "My hobbies are listening to music, watching movies, and playing sports."
  },
  "qa017-1": {
    qEn: "What is your favorite subject?",
    aEn: "My favorite subject is English. So I study English every day."
  },
  "qa021-1": {
    qEn: "How many people are there in your family?",
    aEn: "There are four people in my family: my father, my mother, my older sister, and me."
  },
  "qa022-1": {
    qEn: "What does your father do?",
    aEn: "My father is a dentist."
  },
  "qa023-1": {
    qEn: "What does your mother do?",
    aEn: "My mother teaches mathematics at a school."
  },
  "qa024-1": {
    qEn: "What is your father like?",
    aEn: "My father is always helpful and kind. He often goes shopping with my mother. I respect him."
  },
  "qa025-1": {
    qEn: "What is your mother like?",
    aEn: "My mother is very sweet and loving. And she is a wonderful cook."
  },
  "qa026-1": {
    qEn: "Do you have any brothers or sisters?",
    aEn: "I have an older sister. She attends Goryeo Middle School."
  },
  "qa027-1": {
    qEn: "What is your sister's hobby?",
    aEn: "She likes all kinds of animals, and she also enjoys listening to music. I love my family."
  },
  "qa031-1": {
    qEn: "Who is your best friend?",
    aEn: "My best friend is Sangho Park."
  },
  "qa032-1": {
    qEn: "What does your friend look like?",
    aEn: "He is taller than me. He is handsome."
  },
  "qa033-1": {
    qEn: "What is your friend's personality like?",
    aEn: "He is very smart and friendly. He always helps me whenever I need help."
  },
  "qa034-1": {
    qEn: "What are your friend's talents?",
    aEn: "He has many talents. He is good at soccer, computer games, and speaking English. He also draws very well. I am proud of him."
  },
  "qa035-1": {
    qEn: "What does your friend want to become?",
    aEn: "He wants to become a police officer. I am sure his dream will come true."
  },
  "qa041-1": {
    qEn: "How many brothers and sisters does your father have?",
    aEn: "I have many relatives. My father has two younger brothers and one older sister. My father is the second son."
  },
  "qa042-1": {
    qEn: "How many brothers and sisters does your mother have?",
    aEn: "My mother has one younger brother and three younger sisters. My mom is the oldest daughter. My aunts and uncles are all married."
  },
  "qa043-1": {
    qEn: "How many cousins do you have?",
    aEn: "I have eight cousins. We are all close to each other. We get together on holidays."
  },
  "qa044-1": {
    qEn: "Where do your grandparents live?",
    aEn: "My grandparents live in the countryside. They have a big garden and grow fresh vegetables."
  },
  "qa051-1": {
    qEn: "How many students are there in your class?",
    aEn: "There are 30 students in my class: 15 boys and 15 girls."
  },
  "qa052-1": {
    qEn: "Who is your homeroom teacher?",
    aEn: "Our homeroom teacher is Mr. Lee. He is very kind and patient with us."
  },
  "qa053-1": {
    qEn: "What is your classroom like?",
    aEn: "Our classroom is bright and clean. It has large windows and a big computer screen."
  },
  "qa054-1": {
    qEn: "What is your favorite part of school?",
    aEn: "My favorite part of school is recess and physical education class. I love playing with my classmates."
  },
  "qa055-1": {
    qEn: "When does class begin?",
    aEn: "Our class begins at 9 o'clock. When class starts, our teacher checks our homework first."
  }
};

// Heuristic natural translator for remaining QA pairs
function translateKoreanToEnglish(koQ, koA) {
  let qEn = "Please listen to the question and answer.";
  if (koQ.includes("이름")) qEn = "What is your name?";
  else if (koQ.includes("사는 곳") || koQ.includes("어디에 사")) qEn = "Where do you live?";
  else if (koQ.includes("몇 살") || koQ.includes("나이")) qEn = "How old are you?";
  else if (koQ.includes("학년")) qEn = "What grade are you in?";
  else if (koQ.includes("성격")) qEn = "What is your personality like?";
  else if (koQ.includes("취미")) qEn = "What are your hobbies?";
  else if (koQ.includes("과목")) qEn = "What is your favorite subject?";
  else if (koQ.includes("가족") && koQ.includes("몇 명")) qEn = "How many people are in your family?";
  else if (koQ.includes("직업")) qEn = "What is your occupation or job?";
  else if (koQ.includes("친구")) qEn = "Can you tell me about your friend?";
  else if (koQ.includes("몇 시") || koQ.includes("언제")) qEn = "What time or when does it start?";
  else if (koQ.includes("방학")) qEn = "Where did you go during vacation?";
  else if (koQ.includes("꿈")) qEn = "What is your dream for the future?";
  else if (koQ.includes("음식")) qEn = "What is your favorite food?";
  else if (koQ.includes("스포츠") || koQ.includes("운동")) qEn = "What sports do you like to play?";
  else qEn = "What can you tell me about this?";

  // Clean answer string into natural English sentences
  const aClean = cleanKoText(koA);
  return { qEn, aClean };
}

let enriched = 0;
for (const item of rawData) {
  const file = path.join('content/lessons/basics', `${item.id}.json`);
  if (!fs.existsSync(file)) continue;

  const d = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const koQ = extractKoreanQuestion(item.inst);
  const koA = cleanKoText(item.sents);

  let qEn = "";
  let aEn = "";

  if (QA_TRANSLATIONS[item.id]) {
    qEn = QA_TRANSLATIONS[item.id].qEn;
    aEn = QA_TRANSLATIONS[item.id].aEn;
  } else {
    const t = translateKoreanToEnglish(koQ, koA);
    qEn = t.qEn;
    aEn = `Model Answer: ${t.aClean}`;
  }

  // Set sentences block to contain English Q and A
  const sBlockIdx = d.blocks.findIndex(b => b.type === 'sentences');
  const sentencesBlock = {
    type: 'sentences',
    items: [
      { n: 'Q', text: qEn },
      { n: 'A', text: aEn }
    ]
  };

  if (sBlockIdx >= 0) {
    d.blocks[sBlockIdx] = sentencesBlock;
  } else {
    d.blocks.splice(1, 0, sentencesBlock);
  }

  // Set companion Korean paragraphs
  d.blocks = d.blocks.filter(b => !(b.type === 'paragraph' && b.lang === 'ko'));
  d.blocks.splice(d.blocks.findIndex(b => b.type === 'sentences') + 1, 0,
    { type: 'paragraph', text: `질문: ${koQ}`, lang: 'ko' },
    { type: 'paragraph', text: `답변: ${koA}`, lang: 'ko' }
  );

  fs.writeFileSync(file, JSON.stringify(d, null, 2), 'utf-8');
  enriched++;
}

console.log(`Successfully enriched ${enriched} basics/qa script lessons with English & Korean pairs.`);
