import { getUser, updateUser } from '../../models/User.js';

const activeQuizzes = new Map();
const quizQuestions = [
    {
        question: "What is the capital of France?",
        options: ["1. Berlin", "2. Madrid", "3. Paris", "4. Rome"],
        answer: 3,
        reward: 50
    },
    {
        question: "Which planet is known as the Red Planet?",
        options: ["1. Venus", "2. Mars", "3. Jupiter", "4. Saturn"],
        answer: 2,
        reward: 50
    },
    {
        question: "What is 15 × 8?",
        options: ["1. 100", "2. 110", "3. 120", "4. 130"],
        answer: 3,
        reward: 75
    },
    {
        question: "Who painted the Mona Lisa?",
        options: ["1. Van Gogh", "2. Picasso", "3. Da Vinci", "4. Monet"],
        answer: 3,
        reward: 100
    },
    {
        question: "What is the largest ocean on Earth?",
        options: ["1. Atlantic", "2. Indian", "3. Arctic", "4. Pacific"],
        answer: 4,
        reward: 50
    }
];

export default {
    name: 'quiz',
    aliases: ['trivia', 'question'],
    category: 'games',
    description: 'Test your knowledge with quiz questions',
    usage: 'quiz',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, sender, prefix }) {
        if (activeQuizzes.has(from)) {
            return sock.sendMessage(from, {
                text: `❌ A quiz is already active in this chat! Answer the current question first.`
            }, { quoted: message });
        }

        const randomQuestion = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
        
        activeQuizzes.set(from, {
            question: randomQuestion,
            sender: sender,
            startTime: Date.now()
        });

        const questionText = `🎯 *QUIZ TIME!*\n\n📝 ${randomQuestion.question}\n\n${randomQuestion.options.join('\n')}\n\n💰 Reward: ${randomQuestion.reward} coins\n⏰ You have 30 seconds to answer!\n\n✨ Reply with the option number (1-4)`;

        await sock.sendMessage(from, {
            text: questionText
        }, { quoted: message });

        setTimeout(() => {
            if (activeQuizzes.has(from)) {
                activeQuizzes.delete(from);
                sock.sendMessage(from, {
                    text: `⏰ Time's up! The quiz has expired.`
                }, { quoted: message });
            }
        }, 30000);
    },

    async onReply({ sock, message, from, sender, text }) {
        const quizData = activeQuizzes.get(from);
        
        if (!quizData) return false;
        
        if (sender !== quizData.sender) {
            await sock.sendMessage(from, {
                text: `❌ Only @${quizData.sender.split('@')[0]} can answer this quiz!`,
                mentions: [quizData.sender]
            }, { quoted: message });
            return true;
        }

        const userAnswer = parseInt(text.trim());
        
        if (isNaN(userAnswer) || userAnswer < 1 || userAnswer > 4) {
            await sock.sendMessage(from, {
                text: `❌ Invalid answer! Please reply with a number between 1-4.`
            }, { quoted: message });
            return true;
        }

        activeQuizzes.delete(from);

        if (userAnswer === quizData.question.answer) {
            const user = await getUser(sender);
            if (user) {
                await updateUser(sender, {
                    'economy.balance': (user.economy?.balance || 0) + quizData.question.reward,
                    xp: (user.xp || 0) + 25
                });
            }

            await sock.sendMessage(from, {
                text: `🎉 *CORRECT!*\n\n✅ That's the right answer!\n💰 +${quizData.question.reward} coins\n⭐ +25 XP\n\nType ${prefix}quiz to play again!`,
                mentions: [sender]
            }, { quoted: message });
        } else {
            await sock.sendMessage(from, {
                text: `❌ *WRONG!*\n\nThe correct answer was option ${quizData.question.answer}.\n\nBetter luck next time! Type ${prefix}quiz to try again.`,
                mentions: [sender]
            }, { quoted: message });
        }

        return true;
    }
};
