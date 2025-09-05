const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");

// Gemini API Key
const GEMINI_API_KEY = "AIzaSyCac8QLbUN0KbcXYkTmT3ume3W5MC1yAoc";

// Subjects mapping
const subjects = {
  "1": "Combined Maths",
  "2": "Physics",
  "3": "ICT",
  "4": "Chemistry",
  "5": "Biology",
  "6": "Other"
};

// Active continuous polls
let activePolls = {};

// Generate a new question
async function generateQuestion(chatId) {
  const poll = activePolls[chatId];
  if (!poll) return;

  const prompt = `Generate 1 multiple-choice question in Sinhala for A/L ${poll.subject}.
Include 4 options (A-D), mark correct option, provide short explanation.
Format: question|A|B|C|D|correct_option|explanation`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!data) return;

    const [question, A, B, C, D, correct, explanation] = data.split("|");

    const qObj = { question, options: { A, B, C, D }, answer: correct, explanation };
    poll.questions.push(qObj);
    if (poll.questions.length > 20) poll.questions.shift();

    // Send question
    await poll.bot.sendMessage(
      chatId,
      `📌 *MCQ - ${poll.subject}*\n\n${question}\nA) ${A}\nB) ${B}\nC) ${C}\nD) ${D}\n\nReply with A/B/C/D`
    );

  } catch (err) {
    console.error("MCQ Generation Error:", err);
    await poll.bot.sendMessage(chatId, "❌ Error generating MCQ. Try again!");
  }
}

// ===== Start Continuous MCQ Session =====
cmd({
  pattern: "mcq start (\\d+)",
  react: "📚",
  desc: "Start continuous MCQ session",
  category: "education",
  filename: __filename,
}, async (bot, mek, m, { from, q, reply }) => {
  const chatId = from;
  const subjectNumber = q || mek.body?.split(" ")[2];
  const subject = subjects[subjectNumber];
  if (!subject) return reply("❌ Unsupported subject");

  if (!activePolls[chatId]) {
    activePolls[chatId] = { subject, questions: [], answeredUsers: {}, bot };
  }

  await reply(`🤖 Starting continuous MCQ session for *${subject}*...`);
  generateQuestion(chatId);
});

// ===== Answer Handling =====
cmd({
  pattern: "^(A|B|C|D)$",
  react: "✏️",
  desc: "Answer MCQ",
  category: "education",
  filename: __filename,
}, async (bot, mek, m, { from }) => {
  const chatId = from;
  const userNumber = mek.sender;
  const userAnswer = mek.body.trim().toUpperCase();

  const poll = activePolls[chatId];
  if (!poll) return;

  const currentQuestion = poll.questions[poll.questions.length - 1];
  if (!currentQuestion) return;

  poll.answeredUsers[userNumber] = poll.answeredUsers[userNumber] || [];
  poll.answeredUsers[userNumber].push(userAnswer);

  // Send correct/wrong reply
  if (userAnswer === currentQuestion.answer) {
    await bot.sendMessage(chatId, `✅ Correct!\n💡 Explanation: ${currentQuestion.explanation}`);
  } else {
    await bot.sendMessage(chatId, `❌ Wrong! Correct: ${currentQuestion.answer}\n💡 Explanation: ${currentQuestion.explanation}`);
  }

  // Generate next question automatically
  generateQuestion(chatId);
});

// ===== Stop Poll =====
cmd({
  pattern: "mcq stop",
  react: "🛑",
  desc: "Stop current MCQ session",
  category: "education",
  filename: __filename,
}, async (bot, mek, m, { from, reply }) => {
  const chatId = from;
  const poll = activePolls[chatId];
  if (!poll) return reply("❌ No active MCQ session.");

  const fileName = `poll_${chatId}.json`;
  fs.writeFileSync(fileName, JSON.stringify(poll, null, 2));

  let totalAnswers = 0, correctAnswers = 0;
  for (const answers of Object.values(poll.answeredUsers)) {
    totalAnswers += answers.length;
    answers.forEach((ans, i) => {
      if (ans === poll.questions[i]?.answer) correctAnswers++;
    });
  }
  const incorrectAnswers = totalAnswers - correctAnswers;
  const accuracy = totalAnswers === 0 ? 0 : ((correctAnswers / totalAnswers) * 100).toFixed(2);

  let resultMsg = `🛑 MCQ session stopped!\n\n📌 Subject: ${poll.subject}\n`;
  resultMsg += `📊 Total Responses: ${totalAnswers}\n✅ Correct: ${correctAnswers}\n❌ Incorrect: ${incorrectAnswers}\n📈 Accuracy: ${accuracy}%`;

  delete activePolls[chatId];
  await bot.sendMessage(chatId, resultMsg);
});

// ===== Poll History =====
cmd({
  pattern: "mcq history",
  react: "📂",
  desc: "Check previous MCQ session",
  category: "education",
  filename: __filename,
}, async (bot, mek, m, { from, reply }) => {
  const chatId = from;
  const fileName = `poll_${chatId}.json`;

  if (!fs.existsSync(fileName)) return reply("❌ No previous session data.");

  const data = JSON.parse(fs.readFileSync(fileName, "utf-8"));
  let historyMsg = `📌 *Previous MCQ Session - ${data.subject}*\n\n`;

  data.questions.forEach((q, i) => {
    historyMsg += `${i + 1}) ${q.question}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}\n✅ Answer: ${q.answer}\n💡 Explanation: ${q.explanation}\n\n`;
  });

  historyMsg += `Answered Users:\n`;
  for (const [user, answers] of Object.entries(data.answeredUsers)) {
    historyMsg += `${user}: ${answers.join(", ")}\n`;
  }

  await bot.sendMessage(chatId, historyMsg);
});
