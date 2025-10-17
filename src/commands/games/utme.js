import { createCanvas } from '@napi-rs/canvas';
import axios from 'axios';
import config from '../../config.js';

const activeQuizzes = new Map();

export default {
    name: 'utme',
    aliases: ['jamb', 'exam'],
    category: 'games',
    description: 'Practice UTME/JAMB exam questions with interactive quiz',
    usage: 'utme <subject>',
    example: 'utme mathematics\nutme english\nutme physics',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,

    subjects: {
        'mathematics': 'Mathematics',
        'english': 'English Language',
        'physics': 'Physics',
        'chemistry': 'Chemistry',
        'biology': 'Biology',
        'literature': 'Literature in English',
        'government': 'Government',
        'economics': 'Economics',
        'commerce': 'Commerce',
        'accounting': 'Accounting',
        'crk': 'Christian Religious Studies',
        'irk': 'Islamic Religious Studies',
        'geography': 'Geography',
        'civics': 'Civic Education',
        'agriculture': 'Agricultural Science',
        'computer': 'Computer Studies',
        'history': 'History'
    },

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            if (args.length === 0) {
                return this.showSubjects({ sock, message, from, prefix });
            }

            const subject = args[0].toLowerCase();
            const subjectName = this.subjects[subject];

            if (!subjectName) {
                return this.showSubjects({ sock, message, from, prefix });
            }

            await sock.sendMessage(from, {
                react: { text: '📚', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: '╭──⦿【 📚 LOADING 】\n│ 📖 𝗦𝘂𝗯𝗷𝗲𝗰𝘁: ' + subjectName + '\n│ ⏳ 𝗦𝘁𝗮𝘁𝘂𝘀: Fetching question...\n╰────────⦿'
            }, { quoted: message });

            const apiUrl = 'https://questions.aloc.com.ng/api/v2/q/1?subject=' + subject;
            const response = await axios.get(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'AccessToken': 'QB-1e5c5f1553ccd8cd9e11'
                },
                timeout: 15000
            });

            if (!response.data || !response.data.data || response.data.data.length === 0) {
                await sock.sendMessage(from, { delete: statusMsg.key });
                await sock.sendMessage(from, {
                    text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: No questions found\n│\n│ 📖 𝗦𝘂𝗯𝗷𝗲𝗰𝘁: ' + subjectName + '\n│ 💡 𝗧𝗶𝗽: Try another subject\n╰────────⦿'
                }, { quoted: message });
                return;
            }

            const questionData = response.data.data[0];
            const correctAnswer = questionData.answer;

            const canvas = await this.createQuestionCanvas(questionData, subjectName);

            await sock.sendMessage(from, { delete: statusMsg.key });

            await sock.sendMessage(from, {
                image: canvas,
                caption: '╭──⦿【 📚 UTME QUIZ 】\n│ 📖 𝗦𝘂𝗯𝗷𝗲𝗰𝘁: ' + subjectName + '\n│ ❓ 𝗤𝘂𝗲𝘀𝘁𝗶𝗼𝗻: Ready!\n│\n│ 💡 𝗛𝗼𝘄 𝘁𝗼 𝗮𝗻𝘀𝘄𝗲𝗿:\n│ Reply to this message with your answer\n│ Example: A, B, C, or D\n╰────────⦿\n\n╭─────────────⦿\n│💫 | [ ' + config.botName + ' 🍀 ]\n╰────────────⦿'
            }, { quoted: message });

            activeQuizzes.set(from, {
                correctAnswer,
                questionData,
                subjectName,
                sender,
                startTime: Date.now()
            });

            setTimeout(() => {
                if (activeQuizzes.has(from)) {
                    activeQuizzes.delete(from);
                }
            }, 120000);

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('UTME command error:', error);
            await sock.sendMessage(from, {
                text: '╭──⦿【 ❌ ERROR 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Failed to load question\n│\n│ ⚠️ 𝗗𝗲𝘁𝗮𝗶𝗹𝘀: ' + error.message + '\n│ 💡 𝗧𝗶𝗽: Try again later\n╰────────⦿'
            }, { quoted: message });
        }
    },

    async showSubjects({ sock, message, from, prefix }) {
        const subjectList = Object.keys(this.subjects);
        let subjectsText = '╭──⦿【 📚 UTME SUBJECTS 】\n│\n';
        
        const categories = {
            'Sciences': ['mathematics', 'physics', 'chemistry', 'biology'],
            'Arts': ['literature', 'government', 'history', 'crk', 'irk'],
            'Commercial': ['economics', 'commerce', 'accounting'],
            'Social Sciences': ['geography', 'civics'],
            'Others': ['english', 'agriculture', 'computer']
        };

        for (const [category, subjects] of Object.entries(categories)) {
            subjectsText += '│ 📖 ' + category + ':\n';
            subjects.forEach(sub => {
                if (this.subjects[sub]) {
                    subjectsText += '│   ✧ ' + prefix + 'utme ' + sub + '\n';
                }
            });
            subjectsText += '│\n';
        }

        subjectsText += '╰────────⦿\n\n';
        subjectsText += '💡 Example: ' + prefix + 'utme mathematics\n\n';
        subjectsText += '╭─────────────⦿\n│💫 | [ ' + config.botName + ' 🍀 ]\n╰────────────⦿';

        await sock.sendMessage(from, {
            text: subjectsText
        }, { quoted: message });
    },

    async createQuestionCanvas(questionData, subjectName) {
        const canvas = createCanvas(1200, 800);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2 + 1;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 25);
        ctx.fill();

        ctx.font = 'bold 60px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText('📚 UTME QUIZ', canvas.width / 2, 110);

        ctx.font = 'bold 35px Arial';
        ctx.fillStyle = '#00ff88';
        ctx.fillText(subjectName, canvas.width / 2, 160);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, 80, 190, canvas.width - 160, 520, 20);
        ctx.fill();

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('❓ QUESTION:', 100, 235);

        const questionText = questionData.question;
        ctx.font = '26px Arial';
        ctx.fillStyle = '#e0e0e0';
        const wrappedQuestion = this.wrapText(ctx, questionText, canvas.width - 200);
        let questionY = 275;
        wrappedQuestion.forEach(line => {
            ctx.fillText(line, 100, questionY);
            questionY += 35;
        });

        const optionsY = questionY + 30;
        const options = [
            { label: 'A', text: questionData.option.a, color: '#00ff88' },
            { label: 'B', text: questionData.option.b, color: '#ffd700' },
            { label: 'C', text: questionData.option.c, color: '#ff6b9d' },
            { label: 'D', text: questionData.option.d, color: '#8a87fa' }
        ];

        let currentY = optionsY;
        options.forEach((opt, index) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            this.roundRect(ctx, 100, currentY, canvas.width - 220, 70, 10);
            ctx.fill();

            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = opt.color;
            ctx.fillText(opt.label + '.', 120, currentY + 45);

            ctx.font = '24px Arial';
            ctx.fillStyle = '#ffffff';
            const wrappedOption = this.wrapText(ctx, opt.text, canvas.width - 340);
            ctx.fillText(wrappedOption[0], 170, currentY + 45);

            currentY += 90;
        });

        ctx.font = '22px Arial';
        ctx.fillStyle = '#a0a0a0';
        ctx.textAlign = 'center';
        ctx.fillText('Reply with your answer: A, B, C, or D', canvas.width / 2, canvas.height - 50);

        return canvas.toBuffer('image/png');
    },

    async onReply({ sock, message, from, sender, text }) {
        const quizData = activeQuizzes.get(from);
        
        if (!quizData) return false;
        
        if (sender !== quizData.sender) {
            await sock.sendMessage(from, {
                text: '╭──⦿【 ⚠️ NOT YOUR QUIZ 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Only the quiz starter can answer\n╰────────⦿'
            }, { quoted: message });
            return true;
        }

        const answer = text.toUpperCase().trim();

        if (!['A', 'B', 'C', 'D'].includes(answer)) {
            await sock.sendMessage(from, {
                text: '╭──⦿【 ⚠️ INVALID 】\n│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Invalid answer format\n│\n│ 💡 𝗩𝗮𝗹𝗶𝗱 𝗮𝗻𝘀𝘄𝗲𝗿𝘀: A, B, C, or D\n╰────────⦿'
            }, { quoted: message });
            return true;
        }

        activeQuizzes.delete(from);

        const isCorrect = answer === quizData.correctAnswer.toUpperCase();
        const resultCanvas = await this.createResultCanvas(isCorrect, quizData.correctAnswer, quizData.questionData, quizData.subjectName);

        let resultText = '╭──⦿【 ' + (isCorrect ? '✅ CORRECT' : '❌ WRONG') + ' 】\n';
        resultText += '│ 📖 𝗦𝘂𝗯𝗷𝗲𝗰𝘁: ' + quizData.subjectName + '\n';
        resultText += '│ 💡 𝗬𝗼𝘂𝗿 𝗔𝗻𝘀𝘄𝗲𝗿: ' + answer + '\n';
        resultText += '│ ✅ 𝗖𝗼𝗿𝗿𝗲𝗰𝘁 𝗔𝗻𝘀𝘄𝗲𝗿: ' + quizData.correctAnswer.toUpperCase() + '\n';
        if (quizData.questionData.solution) {
            resultText += '│\n│ 📝 𝗘𝘅𝗽𝗹𝗮𝗻𝗮𝘁𝗶𝗼𝗻:\n│ ' + quizData.questionData.solution + '\n';
        }
        resultText += '╰────────⦿\n\n';
        resultText += '╭─────────────⦿\n│💫 | [ ' + config.botName + ' 🍀 ]\n╰────────────⦿';

        await sock.sendMessage(from, {
            image: resultCanvas,
            caption: resultText,
            mentions: [sender]
        }, { quoted: message });

        return true;
    },

    async createResultCanvas(isCorrect, correctAnswer, questionData, subjectName) {
        const canvas = createCanvas(1200, 700);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (isCorrect) {
            gradient.addColorStop(0, '#00ff88');
            gradient.addColorStop(0.5, '#00d4ff');
            gradient.addColorStop(1, '#667eea');
        } else {
            gradient.addColorStop(0, '#ff6b9d');
            gradient.addColorStop(0.5, '#ff0844');
            gradient.addColorStop(1, '#764ba2');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 25);
        ctx.fill();

        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(isCorrect ? '✅ CORRECT!' : '❌ WRONG!', canvas.width / 2, 130);

        ctx.font = 'bold 35px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(subjectName, canvas.width / 2, 190);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, 80, 230, canvas.width - 160, 120, 15);
        ctx.fill();

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('✅ Correct Answer: ' + correctAnswer.toUpperCase(), 100, 280);

        ctx.font = '28px Arial';
        ctx.fillStyle = '#e0e0e0';
        const correctOption = questionData.option[correctAnswer.toLowerCase()];
        const wrappedCorrect = this.wrapText(ctx, correctOption, canvas.width - 200);
        ctx.fillText(wrappedCorrect[0], 100, 325);

        if (questionData.solution) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.roundRect(ctx, 80, 380, canvas.width - 160, 230, 15);
            ctx.fill();

            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#00ff88';
            ctx.fillText('📝 Explanation:', 100, 425);

            ctx.font = '24px Arial';
            ctx.fillStyle = '#ffffff';
            const wrappedSolution = this.wrapText(ctx, questionData.solution, canvas.width - 200);
            let solutionY = 465;
            wrappedSolution.slice(0, 5).forEach(line => {
                ctx.fillText(line, 100, solutionY);
                solutionY += 32;
            });
        }

        return canvas.toBuffer('image/png');
    },

    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    },

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
};