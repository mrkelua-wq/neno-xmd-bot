const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");

const GEMINI_API_KEY = "AIzaSyC4chj4aorec4aX4UIO3STqEFXnsrJP6Cs";

const subjects = { "1": "Combined Maths", "2": "Physics", "3": "ICT", "4": "Chemistry", "5": "Biology", "6": "Other" };
let activePolls = {}; // chatId: { question, options, answer, explanation, answeredUsers }

cmd({
  pattern: "mcq start (\\d+)",
  react: "📚",
  desc: "Start A/L MCQ poll",
  category: "education",
  filename: __filename,
}, async (bot, mek, m, { from, q, reply }) => {
  try {
    const subjectNumber = q || mek.body.split(" ")[2];
    const subject = subjects[subjectNumber];
    if (!subject) return reply("❌ Unsupported subject.");

    await reply("🤖 Generating MCQ...");

    const prompt = `
Generate 1 multiple-choice question in Sinhala for A/L ${subject}.
Include 4 options (A-D).
Mark correct answer.
Provide short explanation.
Format: question|A|B|C|D|correct_option|explanation
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!data) return reply("❌ Failed to generate MCQ.");

    const [question, A, B, C, D, correct, explanation] = data.split("|");

    activePolls[from] = { subject, question, options: { A, B, C, D }, answer: correct, explanation, answeredUsers: {} };

    await bot.sendMessage(from, {
      text: `📌 MCQ - ${subject}\n${question}\nA) ${A}\nB) ${B}\nC) ${C}\nD) ${D}\n\nReply A/B/C/D to answer.`
    });

  } catch (err) {
    console.error(err);
    reply("❌ Error generating MCQ.");
  }
});

cmd({
  pattern: "^(A|B|C|D)$",
  react: "✏️",
  desc: "Answer MCQ",
  category: "education",
  filename: __filename,
}, async (bot, mek, m, { from }) => {
  const poll = activePolls[from];
  if (!poll) return;
  const userAnswer = mek.body.trim().toUpperCase();
  poll.answeredUsers[mek.sender] = userAnswer;

  if (userAnswer === poll.answer) await bot.sendMessage(from, { text: `✅ Correct!\n💡 ${poll.explanation}` });
  else await bot.sendMessage(from, { text: `❌ Wrong! Correct: ${poll.answer}\n💡 ${poll.explanation}` });
});

cmd({
  pattern: "mcq stop",
  react: "🛑",
  desc: "Stop MCQ poll",
  category: "education",
  filename: __filename,
}, async (bot, mek, m, { from, reply }) => {
  const poll = activePolls[from];
  if (!poll) return reply("❌ No active poll.");

  const total = Object.keys(poll.answeredUsers).length;
  const correct = Object.values(poll.answeredUsers).filter(a => a === poll.answer).length;
  const accuracy = total === 0 ? 0 : ((correct / total) * 100).toFixed(2);

  let resultMsg = `🛑 MCQ stopped!\nSubject: ${poll.subject}\nQuestion: ${poll.question}\nAnswer: ${poll.answer}\nTotal: ${total}\nCorrect: ${correct}\nAccuracy: ${accuracy}%`;
  delete activePolls[from];
  await bot.sendMessage(from, { text: resultMsg });
});
