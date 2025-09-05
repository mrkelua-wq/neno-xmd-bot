const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");

// ⚠️ Replace with your real Gemini API key
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

// Active polls memory
let activePolls = {}; // { chatId: { subject, question, options, answer, explanation, answeredUsers } }

// ====== Start MCQ Poll ======
cmd(
  {
    pattern: "mcq start (\\d+)",
    react: "📚",
    desc: "Start A/L MCQ poll",
    category: "education",
    filename: __filename,
  },
  async (bot, mek, m, { from, q, reply }) => {
    try {
      const subjectNumber = q || mek.body?.split(" ")[2];
      const subject = subjects[subjectNumber];
      if (!subject) return reply("❌ මේ subject එක support නොවේ.");

      const chatId = from;

      await reply("🤖 Gemini is generating MCQ...");

      // Gemini API prompt
      const prompt = `Generate 1 multiple-choice question in Sinhala for A/L ${subject}. 
Include 4 options (A-D). 
Mark the correct answer. 
Provide a short explanation for the correct answer. 
Format: question|A|B|C|D|correct_option|explanation`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!data) return reply("❌ Gemini did not return a valid MCQ.");

      const [question, A, B, C, D, correct, explanation] = data.split("|");

      activePolls[chatId] = {
        subject,
        question,
        options: { A, B, C, D },
        answer: correct,
        explanation,
        answeredUsers: {}
      };

      await bot.sendMessage(
        chatId,
        `📌 *MCQ Poll - ${subject}*\n\n${question}\nA) ${A}\nB) ${B}\nC) ${C}\nD) ${D}\n\nReply with A/B/C/D to answer.`
      );

    } catch (err) {
      console.error(err);
      reply("❌ MCQ generate කිරීමේ දෝෂයක් වෙලා ඇත!");
    }
  }
);

// ====== Answer Handling ======
cmd(
  {
    pattern: "^(A|B|C|D)$",
    react: "✏️",
    desc: "Answer MCQ",
    category: "education",
    filename: __filename,
  },
  async (bot, mek, m, { from }) => {
    const chatId = from;
    const userNumber = mek.sender;
    const userAnswer = mek.body.trim().toUpperCase();

    if (!activePolls[chatId]) return;

    const poll = activePolls[chatId];
    poll.answeredUsers[userNumber] = userAnswer;

    if (userAnswer === poll.answer) {
      await bot.sendMessage(chatId, `✅ හරි පිළිතුර!\n💡 විස්තර: ${poll.explanation}`);
    } else {
      await bot.sendMessage(chatId, `❌ වැරදි පිළිතුර! හරි පිළිතුර: ${poll.answer}\n💡 විස්තර: ${poll.explanation}`);
    }
  }
);

// ====== Stop Poll with Stats ======
cmd(
  {
    pattern: "mcq stop",
    react: "🛑",
    desc: "Stop current MCQ poll and show results",
    category: "education",
    filename: __filename,
  },
  async (bot, mek, m, { from, reply }) => {
    const chatId = from;
    if (!activePolls[chatId]) return reply("❌ ක්‍රියාත්මක MCQ poll එකක් නැත.");

    const poll = activePolls[chatId];
    const fileName = `poll_${chatId}.json`;

    fs.writeFileSync(fileName, JSON.stringify(poll, null, 2));

    const totalAnswers = Object.keys(poll.answeredUsers).length;
    const correctAnswers = Object.values(poll.answeredUsers).filter(ans => ans === poll.answer).length;
    const incorrectAnswers = totalAnswers - correctAnswers;
    const accuracy = totalAnswers === 0 ? 0 : ((correctAnswers / totalAnswers) * 100).toFixed(2);

    let resultMsg = `🛑 MCQ poll නවත්වන ලදි!\n\n`;
    resultMsg += `📌 Subject: ${poll.subject}\n`;
    resultMsg += `💡 Question: ${poll.question}\n`;
    resultMsg += `✅ Correct Answer: ${poll.answer}\n`;
    resultMsg += `📊 Total Responses: ${totalAnswers}\n`;
    resultMsg += `✅ Correct: ${correctAnswers}\n`;
    resultMsg += `❌ Incorrect: ${incorrectAnswers}\n`;
    resultMsg += `📈 Accuracy: ${accuracy}%`;

    delete activePolls[chatId];
    await bot.sendMessage(chatId, resultMsg);
  }
);

// ====== Poll History ======
cmd(
  {
    pattern: "mcq history",
    react: "📂",
    desc: "Check previous MCQ poll",
    category: "education",
    filename: __filename,
  },
  async (bot, mek, m, { from, reply }) => {
    const chatId = from;
    const fileName = `poll_${chatId}.json`;

    if (!fs.existsSync(fileName)) return reply("❌ පරණ poll data එකක් නැත.");

    const data = JSON.parse(fs.readFileSync(fileName, "utf-8"));
    let historyMsg = `📌 *Previous MCQ - ${data.subject}*\n\n${data.question}\n`;
    for (const [key, val] of Object.entries(data.options)) {
      historyMsg += `${key}) ${val}\n`;
    }
    historyMsg += `\n✅ Correct Answer: ${data.answer}\n💡 Explanation: ${data.explanation}\n`;
    historyMsg += `Answered Users:\n`;
    for (const [user, ans] of Object.entries(data.answeredUsers)) {
      historyMsg += `${user}: ${ans}\n`;
    }

    await bot.sendMessage(chatId, historyMsg);
  }
);
