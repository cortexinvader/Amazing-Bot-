import { createCanvas } from '@napi-rs/canvas';
import axios from 'axios';

const userScores = new Map();
const userStreaks = new Map();
const activeSessions = new Map();
const AI_TIMEOUT = 30000;

async function getAIExplanation(question, correctAnswer, userAnswer, subject, isCorrect) {
    try {
        const prompt = `You are a UTME/JAMB exam tutor. A student just answered a ${subject} question.

Question: ${question}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}
Result: ${isCorrect ? 'CORRECT' : 'WRONG'}

${isCorrect 
    ? 'Provide a brief encouraging explanation (2-3 sentences) of why this answer is correct and reinforce the key concept.' 
    : 'Provide a clear, concise explanation (3-4 sentences) of: 1) Why their answer is wrong, 2) Why the correct answer is right, 3) Key concept to remember.'}

Keep it simple, educational, and encouraging. Use Nigerian educational context where relevant.`;

        const apiUrl = `https://ab-blackboxai.abrahamdw882.workers.dev/?q=${encodeURIComponent(prompt)}`;
        
        const { data } = await axios.get(apiUrl, { 
            timeout: AI_TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const aiResponse = data.content || data.response || data.reply || data.answer || data.text;
        
        if (!aiResponse || aiResponse.length < 10) {
            return null;
        }

        return aiResponse.substring(0, 500);
    } catch (error) {
        console.error('AI explanation error:', error);
        return null;
    }
}

export default {
    name: 'utme',
    aliases: ['jamb', 'exam', 'quiz'],
    category: 'games',
    description: 'Practice UTME/JAMB exam questions with AI-powered explanations',
    usage: 'utme <subject>',
    example: 'utme mathematics\nutme english\nutme physics',
    cooldown: 2,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    subjects: {
        'mathematics': 'Mathematics',
        'further-math': 'Further Mathematics',
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
        'history': 'History',
        'french': 'French',
        'igbo': 'Igbo',
        'yoruba': 'Yoruba',
        'hausa': 'Hausa',
        'marketing': 'Marketing',
        'insurance': 'Insurance',
        'office-practice': 'Office Practice',
        'typewriting': 'Typewriting',
        'technical-drawing': 'Technical Drawing',
        'fine-arts': 'Fine Arts',
        'music': 'Music',
        'physical-education': 'Physical Education',
        'health-education': 'Health Education',
        'home-economics': 'Home Economics',
        'food-nutrition': 'Food and Nutrition'
    },

    departments: {
        '🏥 Medical Sciences': {
            'Medicine & Surgery': ['biology', 'chemistry', 'physics'],
            'Pharmacy': ['biology', 'chemistry', 'physics'],
            'Nursing': ['biology', 'chemistry', 'physics'],
            'Physiotherapy': ['biology', 'chemistry', 'physics']
        },
        '⚙️ Engineering & Tech': {
            'Engineering': ['mathematics', 'physics', 'chemistry'],
            'Computer Science': ['mathematics', 'physics', 'english'],
            'Architecture': ['mathematics', 'physics', 'technical-drawing']
        },
        '💼 Social Sciences': {
            'Accounting': ['accounting', 'economics', 'mathematics'],
            'Economics': ['economics', 'mathematics', 'government'],
            'Law': ['english', 'literature', 'government'],
            'Mass Communication': ['english', 'literature', 'government']
        },
        '📚 Arts & Humanities': {
            'English': ['english', 'literature', 'government'],
            'History': ['history', 'government', 'literature'],
            'Theatre Arts': ['literature', 'english', 'music']
        },
        '🌾 Agriculture & Sciences': {
            'Agriculture': ['agriculture', 'chemistry', 'biology'],
            'Food Science': ['chemistry', 'biology', 'agriculture'],
            'Geography': ['geography', 'mathematics', 'economics']
        },
        '🎓 Education & Others': {
            'Physical Education': ['physical-education', 'biology', 'health-education'],
            'Home Economics': ['home-economics', 'chemistry', 'biology']
        }
    },

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            if (args.length === 0) {
                return this.showSubjects({ sock, message, from, prefix, sender });
            }

            const input = args[0].toLowerCase();

            if (input === 'score' || input === 'stats') {
                return this.showStats({ sock, message, from, sender });
            }

            if (input === 'reset') {
                userScores.delete(sender);
                userStreaks.delete(sender);
                activeSessions.delete(sender);
                return await sock.sendMessage(from, {
                    text: '🔄 Stats Reset\n\nYour score and streak have been reset to zero.'
                }, { quoted: message });
            }

            const subject = input;
            const subjectName = this.subjects[subject];

            if (!subjectName) {
                return this.showSubjects({ sock, message, from, prefix, sender });
            }

            await this.loadQuestion({ sock, message, from, sender, subject, subjectName, prefix });

        } catch (error) {
            console.error('UTME command error:', error);
            await sock.sendMessage(from, {
                text: '❌ Failed to load question\n\n⚠️ ' + error.message + '\n💡 Try again later'
            }, { quoted: message });
        }
    },

    async loadQuestion({ sock, message, from, sender, subject, subjectName, prefix }) {
        await sock.sendMessage(from, {
            react: { text: '📚', key: message.key }
        });

        const statusMsg = await sock.sendMessage(from, {
            text: '📚 Loading ' + subjectName + ' question...'
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
                text: '❌ No questions found for ' + subjectName + '\n\n💡 Try another subject'
            }, { quoted: message });
            return;
        }

        const questionData = response.data.data[0];
        const correctAnswer = questionData.answer;

        if (!userScores.has(sender)) {
            userScores.set(sender, { total: 0, correct: 0, subjects: {} });
        }
        if (!userStreaks.has(sender)) {
            userStreaks.set(sender, 0);
        }

        const userScore = userScores.get(sender);
        if (!userScore.subjects[subject]) {
            userScore.subjects[subject] = { total: 0, correct: 0 };
        }

        const canvas = await this.createQuestionCanvas(questionData, subjectName, sender);

        await sock.sendMessage(from, { delete: statusMsg.key });

        const stats = userScore.subjects[subject];
        const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        const streak = userStreaks.get(sender);

        let caption = '📚 ' + subjectName + ' Quiz\n\n';
        caption += '📊 Your Stats: ' + stats.correct + '/' + stats.total + ' (' + percentage + '%)\n';
        if (streak > 0) {
            caption += '🔥 Streak: ' + streak + '\n';
        }
        caption += '\n💡 Reply with: A, B, C, or D';

        const sentMsg = await sock.sendMessage(from, {
            image: canvas,
            caption: caption
        }, { quoted: message });

        if (sentMsg && sentMsg.key) {
            const sessionKey = `${sender}_${sentMsg.key.id}`;
            activeSessions.set(sessionKey, {
                messageId: sentMsg.key.id,
                sender: sender,
                subject: subject,
                subjectName: subjectName,
                correctAnswer: correctAnswer,
                questionData: questionData,
                timestamp: Date.now()
            });

            this.setupReplyHandler(sock, from, sentMsg.key.id, correctAnswer, questionData, subjectName, sender, subject, prefix);
        }

        await sock.sendMessage(from, {
            react: { text: '✅', key: message.key }
        });
    },

    async showStats({ sock, message, from, sender }) {
        const userScore = userScores.get(sender);
        const streak = userStreaks.get(sender) || 0;

        if (!userScore || userScore.total === 0) {
            return await sock.sendMessage(from, {
                text: '📊 No Stats Yet\n\nStart practicing to see your statistics!'
            }, { quoted: message });
        }

        const overallPercentage = Math.round((userScore.correct / userScore.total) * 100);
        let statsText = '📊 Your UTME Stats\n\n';
        statsText += '🎯 Overall: ' + userScore.correct + '/' + userScore.total + ' (' + overallPercentage + '%)\n';
        statsText += '🔥 Current Streak: ' + streak + '\n';
        statsText += '⭐ Best Streak: ' + (userScore.bestStreak || 0) + '\n\n';
        statsText += '📚 By Subject:\n\n';

        const sortedSubjects = Object.entries(userScore.subjects)
            .sort((a, b) => b[1].correct - a[1].correct)
            .slice(0, 10);

        sortedSubjects.forEach(([subject, stats]) => {
            const percentage = Math.round((stats.correct / stats.total) * 100);
            const subjectName = this.subjects[subject] || subject;
            statsText += '  ' + subjectName + '\n';
            statsText += '  ' + stats.correct + '/' + stats.total + ' (' + percentage + '%)\n\n';
        });

        await sock.sendMessage(from, {
            text: statsText
        }, { quoted: message });
    },

    async showSubjects({ sock, message, from, prefix, sender }) {
        const userScore = userScores.get(sender);
        const hasStats = userScore && userScore.total > 0;

        let subjectsText = '📚 UTME SUBJECTS BY DEPARTMENT\n\n';
        
        for (const [category, depts] of Object.entries(this.departments)) {
            subjectsText += category + '\n';
            for (const [dept, subjects] of Object.entries(depts)) {
                subjectsText += '  📌 ' + dept + '\n';
                subjects.forEach(sub => {
                    if (this.subjects[sub]) {
                        subjectsText += '    ✧ ' + prefix + 'utme ' + sub + '\n';
                    }
                });
            }
            subjectsText += '\n';
        }

        subjectsText += '💡 Example: ' + prefix + 'utme mathematics\n';
        if (hasStats) {
            subjectsText += '📊 View stats: ' + prefix + 'utme score\n';
        }
        subjectsText += '🔄 Reset stats: ' + prefix + 'utme reset\n\n';
        subjectsText += '🤖 AI-Powered: Get instant explanations for every answer!';

        await sock.sendMessage(from, {
            text: subjectsText
        }, { quoted: message });
    },

    setupReplyHandler(sock, from, messageId, correctAnswer, questionData, subjectName, sender, subject, prefix) {
        const sessionKey = `${sender}_${messageId}`;
        
        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers && global.replyHandlers[messageId]) {
                delete global.replyHandlers[messageId];
            }
            activeSessions.delete(sessionKey);
        }, 180000);

        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        const commandInstance = this;

        global.replyHandlers[messageId] = {
            command: this.name,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                const session = activeSessions.get(sessionKey);

                if (!session) {
                    return;
                }

                if (replySender !== sender) {
                    return await sock.sendMessage(from, {
                        text: '❌ This is not your quiz!\n\n💡 Start your own quiz with: ' + prefix + 'utme <subject>'
                    }, { quoted: replyMessage });
                }

                const input = replyText.toUpperCase().trim();

                if (input === 'NEXT' || input === 'N') {
                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                    activeSessions.delete(sessionKey);
                    
                    return await commandInstance.loadQuestion({
                        sock,
                        message: replyMessage,
                        from,
                        sender,
                        subject,
                        subjectName,
                        prefix
                    });
                }

                if (input === 'STOP' || input === 'END' || input === 'QUIT') {
                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                    activeSessions.delete(sessionKey);
                    
                    const userScore = userScores.get(sender);
                    const stats = userScore?.subjects[subject];
                    
                    if (stats && stats.total > 0) {
                        const percentage = Math.round((stats.correct / stats.total) * 100);
                        return await sock.sendMessage(from, {
                            text: '✋ Quiz Stopped\n\n📊 Session Stats:\n' + stats.correct + '/' + stats.total + ' (' + percentage + '%)\n\n💡 Use ' + prefix + 'utme ' + subject + ' to continue!'
                        }, { quoted: replyMessage });
                    }
                    
                    return await sock.sendMessage(from, {
                        text: '✋ Quiz stopped. Use ' + prefix + 'utme to start again!'
                    }, { quoted: replyMessage });
                }

                const answer = input;

                if (!['A', 'B', 'C', 'D'].includes(answer)) {
                    return await sock.sendMessage(from, {
                        text: '⚠️ Invalid answer\n\nReply with:\n• A, B, C, or D to answer\n• NEXT for next question\n• STOP to end quiz'
                    }, { quoted: replyMessage });
                }

                await sock.sendMessage(from, {
                    react: { text: '🤖', key: replyMessage.key }
                });

                const aiProcessMsg = await sock.sendMessage(from, {
                    text: '🤖 AI is analyzing your answer...'
                }, { quoted: replyMessage });

                const isCorrect = answer === correctAnswer.toUpperCase();
                
                const userScore = userScores.get(sender);
                userScore.total++;
                userScore.subjects[subject].total++;
                
                if (isCorrect) {
                    userScore.correct++;
                    userScore.subjects[subject].correct++;
                    
                    const currentStreak = userStreaks.get(sender) + 1;
                    userStreaks.set(sender, currentStreak);
                    
                    if (!userScore.bestStreak || currentStreak > userScore.bestStreak) {
                        userScore.bestStreak = currentStreak;
                    }
                } else {
                    userStreaks.set(sender, 0);
                }

                const aiExplanation = await getAIExplanation(
                    questionData.question,
                    questionData.option[correctAnswer.toLowerCase()],
                    questionData.option[answer.toLowerCase()],
                    subjectName,
                    isCorrect
                );

                await sock.sendMessage(from, { delete: aiProcessMsg.key });
                
                const resultCanvas = await commandInstance.createResultCanvas(
                    isCorrect, 
                    correctAnswer, 
                    questionData, 
                    subjectName,
                    sender
                );

                const stats = userScore.subjects[subject];
                const percentage = Math.round((stats.correct / stats.total) * 100);
                const streak = userStreaks.get(sender);

                let resultText = (isCorrect ? '✅ CORRECT!' : '❌ WRONG!') + '\n\n';
                resultText += '📖 Subject: ' + subjectName + '\n';
                resultText += '💡 Your Answer: ' + answer + '\n';
                resultText += '✅ Correct Answer: ' + correctAnswer.toUpperCase() + '\n';
                resultText += '\n📊 Score: ' + stats.correct + '/' + stats.total + ' (' + percentage + '%)';
                
                if (streak > 0) {
                    resultText += '\n🔥 Streak: ' + streak;
                }

                if (aiExplanation) {
                    resultText += '\n\n🤖 AI Tutor Explains:\n' + aiExplanation;
                } else if (questionData.solution) {
                    const shortSolution = questionData.solution.substring(0, 150);
                    resultText += '\n\n💭 Explanation:\n' + shortSolution + (questionData.solution.length > 150 ? '...' : '');
                }
                
                resultText += '\n\n💡 Reply NEXT for another question';

                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
                activeSessions.delete(sessionKey);

                const resultMsg = await sock.sendMessage(from, {
                    image: resultCanvas,
                    caption: resultText,
                    mentions: [sender]
                }, { quoted: replyMessage });

                await sock.sendMessage(from, {
                    react: { text: isCorrect ? '✅' : '❌', key: replyMessage.key }
                });

                if (resultMsg && resultMsg.key) {
                    const newSessionKey = `${sender}_${resultMsg.key.id}`;
                    activeSessions.set(newSessionKey, {
                        messageId: resultMsg.key.id,
                        sender: sender,
                        subject: subject,
                        subjectName: subjectName,
                        correctAnswer: correctAnswer,
                        questionData: questionData,
                        timestamp: Date.now()
                    });

                    commandInstance.setupReplyHandler(sock, from, resultMsg.key.id, correctAnswer, questionData, subjectName, sender, subject, prefix);
                }
            }
        };
    },

    async createQuestionCanvas(questionData, subjectName, sender) {
        const canvas = createCanvas(1200, 850);
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

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#00ff88';
        ctx.fillText(subjectName, canvas.width / 2, 160);

        const userScore = userScores.get(sender);
        if (userScore) {
            const streak = userStreaks.get(sender);
            ctx.font = '24px Arial';
            ctx.fillStyle = '#ffd700';
            let statsText = 'Score: ' + userScore.correct + '/' + userScore.total;
            if (streak > 0) {
                statsText += ' | Streak: ' + streak + ' 🔥';
            }
            ctx.fillText(statsText, canvas.width / 2, 195);
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, 80, 220, canvas.width - 160, 530, 20);
        ctx.fill();

        ctx.font = 'bold 26px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('Question:', 100, 260);

        const questionText = questionData.question;
        ctx.font = '24px Arial';
        ctx.fillStyle = '#e0e0e0';
        const wrappedQuestion = this.wrapText(ctx, questionText, canvas.width - 200);
        let questionY = 295;
        wrappedQuestion.slice(0, 3).forEach(line => {
            ctx.fillText(line, 100, questionY);
            questionY += 32;
        });

        const optionsY = questionY + 25;
        const options = [
            { label: 'A', text: questionData.option.a, color: '#00ff88' },
            { label: 'B', text: questionData.option.b, color: '#ffd700' },
            { label: 'C', text: questionData.option.c, color: '#ff6b9d' },
            { label: 'D', text: questionData.option.d, color: '#8a87fa' }
        ];

        let currentY = optionsY;
        options.forEach((opt) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            this.roundRect(ctx, 100, currentY, canvas.width - 220, 65, 10);
            ctx.fill();

            ctx.font = 'bold 30px Arial';
            ctx.fillStyle = opt.color;
            ctx.fillText(opt.label + '.', 120, currentY + 42);

            ctx.font = '22px Arial';
            ctx.fillStyle = '#ffffff';
            const wrappedOption = this.wrapText(ctx, opt.text, canvas.width - 340);
            const displayText = wrappedOption[0].substring(0, 80) + (wrappedOption[0].length > 80 ? '...' : '');
            ctx.fillText(displayText, 170, currentY + 42);

            currentY += 80;
        });

        ctx.font = '20px Arial';
        ctx.fillStyle = '#a0a0a0';
        ctx.textAlign = 'center';
        ctx.fillText('Reply: A, B, C, D | NEXT for next question | STOP to end', canvas.width / 2, canvas.height - 50);

        return canvas.toBuffer('image/png');
    },

    async createResultCanvas(isCorrect, correctAnswer, questionData, subjectName, sender) {
        const canvas = createCanvas(1200, 650);
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

        ctx.font = 'bold 70px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(isCorrect ? '✅ CORRECT!' : '❌ WRONG!', canvas.width / 2, 120);

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(subjectName, canvas.width / 2, 175);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, 80, 215, canvas.width - 160, 110, 15);
        ctx.fill();

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('✅ Correct Answer: ' + correctAnswer.toUpperCase(), 100, 260);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#e0e0e0';
        const correctOption = questionData.option[correctAnswer.toLowerCase()];
        const wrappedCorrect = this.wrapText(ctx, correctOption, canvas.width - 200);
        const displayCorrect = wrappedCorrect[0].substring(0, 90) + (wrappedCorrect[0].length > 90 ? '...' : '');
        ctx.fillText(displayCorrect, 100, 300);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, 80, 355, canvas.width - 160, 150, 15);
        ctx.fill();

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('🤖 AI Tutor is Preparing...', 100, 395);

        ctx.font = '22px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Your personalized explanation is being generated!', 100, 430);
        ctx.fillText('Check the message caption for AI insights...', 100, 465);

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