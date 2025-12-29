import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

const userScores = new Map();
const userStreaks = new Map();
const activeSessions = new Map();
const AI_TIMEOUT = 30000;

const client = new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY || "csk-prcc628w42cc6jhjn48n5pe8xwhyyd26tteyek8x4dy8dpf6",
    warmTCPConnection: false
});

async function getAIExplanation(question, correctAnswer, userAnswer, subject, isCorrect, options) {
    try {
        const prompt = `You are a UTME/JAMB exam tutor. A student just answered a ${subject} question.

Question: ${question}

Options:
A. ${options.a}
B. ${options.b}
C. ${options.c}
D. ${options.d}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}
Result: ${isCorrect ? 'CORRECT' : 'WRONG'}

${isCorrect 
    ? 'Provide a brief encouraging explanation (2-3 sentences) of why this answer is correct and reinforce the key concept.' 
    : 'Provide a clear, concise explanation (3-4 sentences) of: 1) Why their answer is wrong, 2) Why the correct answer is right, 3) Key concept to remember.'}

Keep it simple, educational, and encouraging. Use Nigerian educational context where relevant. Maximum 400 characters.`;

        const response = await client.chat.completions.create({
            model: "llama-3.3-70b",
            messages: [
                { role: "user", content: prompt }
            ],
            stream: false
        });

        const aiResponse = response?.choices?.[0]?.message?.content || "";
        
        if (!aiResponse || aiResponse.length < 10) {
            return null;
        }

        return aiResponse.substring(0, 400);
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
    example: 'utme mathematics',
    cooldown: 2,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,

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
                'AccessToken': 'QB-e1bc44df0c670fa0b972'
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

        let caption = '📚 ' + subjectName + '\n\n';
        caption += '📊 Stats: ' + stats.correct + '/' + stats.total + ' (' + percentage + '%)\n';
        if (streak > 0) {
            caption += '🔥 Streak: ' + streak + '\n';
        }
        caption += '\n💡 Reply: A, B, C, or D\n';
        caption += '⏭️ Type NEXT for next question\n';
        caption += '🛑 Type STOP to end quiz';

        const sentMsg = await sock.sendMessage(from, {
            image: canvas,
            caption: caption
        }, { quoted: message });

        if (sentMsg && sentMsg.key) {
            const commandInstance = this;
            
            if (!global.replyHandlers) {
                global.replyHandlers = {};
            }

            const replyHandler = async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;

                if (replySender !== sender) {
                    return await sock.sendMessage(from, {
                        text: '❌ This is not your quiz!\n\n💡 Start your own: ' + prefix + 'utme <subject>'
                    }, { quoted: replyMessage });
                }

                const input = replyText.toUpperCase().trim();

                if (input === 'NEXT' || input === 'N') {
                    delete global.replyHandlers[sentMsg.key.id];
                    
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
                    delete global.replyHandlers[sentMsg.key.id];
                    
                    const userScore = userScores.get(sender);
                    const stats = userScore?.subjects[subject];
                    
                    if (stats && stats.total > 0) {
                        const percentage = Math.round((stats.correct / stats.total) * 100);
                        return await sock.sendMessage(from, {
                            text: '✋ Quiz Stopped\n\n📊 Session Stats:\n' + stats.correct + '/' + stats.total + ' (' + percentage + '%)\n\n💡 Continue: ' + prefix + 'utme ' + subject
                        }, { quoted: replyMessage });
                    }
                    
                    return await sock.sendMessage(from, {
                        text: '✋ Quiz stopped\n\n💡 Start again: ' + prefix + 'utme'
                    }, { quoted: replyMessage });
                }

                const answer = input;

                if (!['A', 'B', 'C', 'D'].includes(answer)) {
                    return await sock.sendMessage(from, {
                        text: '⚠️ Invalid answer\n\n✅ Reply: A, B, C, or D\n⏭️ Type NEXT\n🛑 Type STOP'
                    }, { quoted: replyMessage });
                }

                await sock.sendMessage(from, {
                    react: { text: '🤖', key: replyMessage.key }
                });

                const aiProcessMsg = await sock.sendMessage(from, {
                    text: '🤖 AI Tutor analyzing your answer...'
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
                    isCorrect,
                    questionData.option
                );

                await sock.sendMessage(from, { delete: aiProcessMsg.key });
                
                const resultCanvas = await commandInstance.createResultCanvas(
                    isCorrect, 
                    correctAnswer, 
                    questionData, 
                    subjectName,
                    sender,
                    answer
                );

                const stats = userScore.subjects[subject];
                const percentage = Math.round((stats.correct / stats.total) * 100);
                const streak = userStreaks.get(sender);

                let resultText = isCorrect ? '✅ CORRECT!\n\n' : '❌ WRONG!\n\n';
                resultText += '📖 Subject: ' + subjectName + '\n';
                resultText += '💡 Your Answer: ' + answer + '\n';
                resultText += '✅ Correct: ' + correctAnswer.toUpperCase() + '\n';
                resultText += '\n📊 Score: ' + stats.correct + '/' + stats.total + ' (' + percentage + '%)';
                
                if (streak > 0) {
                    resultText += '\n🔥 Streak: ' + streak;
                }

                if (aiExplanation) {
                    resultText += '\n\n🤖 AI Tutor Explains:\n';
                    resultText += aiExplanation;
                } else if (questionData.solution) {
                    const shortSolution = questionData.solution.substring(0, 200);
                    resultText += '\n\n💭 Explanation:\n' + shortSolution + (questionData.solution.length > 200 ? '...' : '');
                }
                
                resultText += '\n\n⏭️ Reply NEXT for another question';

                delete global.replyHandlers[sentMsg.key.id];

                const resultMsg = await sock.sendMessage(from, {
                    image: resultCanvas,
                    caption: resultText,
                    mentions: [sender]
                }, { quoted: replyMessage });

                await sock.sendMessage(from, {
                    react: { text: isCorrect ? '✅' : '❌', key: replyMessage.key }
                });

                if (resultMsg && resultMsg.key) {
                    global.replyHandlers[resultMsg.key.id] = {
                        command: commandInstance.name,
                        handler: replyHandler
                    };
                }
            };

            global.replyHandlers[sentMsg.key.id] = {
                command: this.name,
                handler: replyHandler
            };
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
            statsText += '📌 ' + subjectName + '\n';
            statsText += '   ' + stats.correct + '/' + stats.total + ' (' + percentage + '%)\n\n';
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
                        subjectsText += '    • ' + prefix + 'utme ' + sub + '\n';
                    }
                });
            }
            subjectsText += '\n';
        }

        subjectsText += '💡 Commands:\n';
        subjectsText += '📝 Start: ' + prefix + 'utme mathematics\n';
        if (hasStats) {
            subjectsText += '📊 Stats: ' + prefix + 'utme score\n';
        }
        subjectsText += '🔄 Reset: ' + prefix + 'utme reset\n\n';
        subjectsText += '🤖 Powered by Cerebras AI for instant explanations!';

        await sock.sendMessage(from, {
            text: subjectsText
        }, { quoted: message });
    },

    async createQuestionCanvas(questionData, subjectName, sender) {
        const canvas = createCanvas(1400, 1000);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        this.roundRect(ctx, 50, 50, canvas.width - 100, canvas.height - 100, 30);
        ctx.fill();

        ctx.strokeStyle = 'rgba(83, 211, 156, 0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
        this.roundRect(ctx, 70, 70, canvas.width - 140, 180, 20);
        ctx.fill();

        ctx.font = 'bold 56px Arial';
        const headerGradient = ctx.createLinearGradient(0, 100, canvas.width, 100);
        headerGradient.addColorStop(0, '#53d38c');
        headerGradient.addColorStop(1, '#4fa3d8');
        ctx.fillStyle = headerGradient;
        ctx.textAlign = 'center';
        ctx.fillText('📚 UTME QUIZ', canvas.width / 2, 130);

        ctx.font = 'bold 38px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(subjectName, canvas.width / 2, 190);

        const userScore = userScores.get(sender);
        if (userScore) {
            const streak = userStreaks.get(sender);
            ctx.font = '28px Arial';
            ctx.fillStyle = '#b8b8b8';
            let statsText = 'Score: ' + userScore.correct + '/' + userScore.total;
            if (streak > 0) {
                statsText += ' | 🔥 Streak: ' + streak;
            }
            ctx.fillText(statsText, canvas.width / 2, 230);
        }

        ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
        this.roundRect(ctx, 90, 280, canvas.width - 180, 620, 20);
        ctx.fill();

        ctx.strokeStyle = 'rgba(83, 211, 156, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#53d38c';
        ctx.textAlign = 'left';
        ctx.fillText('QUESTION:', 120, 330);

        let questionText = questionData.question;
        if (questionData.instruction) {
            questionText = questionData.instruction + '\n\n' + questionText;
        }

        ctx.font = '26px Arial';
        ctx.fillStyle = '#ffffff';
        const wrappedQuestion = this.wrapText(ctx, questionText, canvas.width - 240);
        let questionY = 375;
        wrappedQuestion.slice(0, 5).forEach(line => {
            ctx.fillText(line, 120, questionY);
            questionY += 36;
        });

        if (questionData.image) {
            try {
                const imgResponse = await axios.get(questionData.image, { responseType: 'arraybuffer' });
                const img = await loadImage(Buffer.from(imgResponse.data));
                
                const maxImgWidth = 400;
                const maxImgHeight = 200;
                let imgWidth = img.width;
                let imgHeight = img.height;
                
                if (imgWidth > maxImgWidth) {
                    imgHeight = (maxImgWidth / imgWidth) * imgHeight;
                    imgWidth = maxImgWidth;
                }
                if (imgHeight > maxImgHeight) {
                    imgWidth = (maxImgHeight / imgHeight) * imgWidth;
                    imgHeight = maxImgHeight;
                }
                
                const imgX = (canvas.width - imgWidth) / 2;
                const imgY = questionY + 10;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.roundRect(ctx, imgX - 10, imgY - 10, imgWidth + 20, imgHeight + 20, 10);
                ctx.fill();
                
                ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
                questionY = imgY + imgHeight + 30;
            } catch (error) {
                console.error('Error loading question image:', error);
            }
        }

        const optionsY = Math.max(questionY + 20, 550);
        const options = [
            { label: 'A', text: questionData.option.a, color: '#53d38c', bg: 'rgba(83, 211, 156, 0.15)' },
            { label: 'B', text: questionData.option.b, color: '#ffd700', bg: 'rgba(255, 215, 0, 0.15)' },
            { label: 'C', text: questionData.option.c, color: '#ff6b9d', bg: 'rgba(255, 107, 157, 0.15)' },
            { label: 'D', text: questionData.option.d, color: '#4fa3d8', bg: 'rgba(79, 163, 216, 0.15)' }
        ];

        let currentY = optionsY;
        options.forEach((opt) => {
            ctx.fillStyle = opt.bg;
            this.roundRect(ctx, 120, currentY, canvas.width - 240, 70, 12);
            ctx.fill();

            ctx.strokeStyle = opt.color + '80';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = opt.color;
            this.roundRect(ctx, 130, currentY + 10, 50, 50, 8);
            ctx.fill();

            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = '#1a1a2e';
            ctx.textAlign = 'center';
            ctx.fillText(opt.label, 155, currentY + 46);

            ctx.font = '24px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            const wrappedOption = this.wrapText(ctx, opt.text, canvas.width - 420);
            const displayText = wrappedOption[0].substring(0, 90) + (wrappedOption[0].length > 90 ? '...' : '');
            ctx.fillText(displayText, 200, currentY + 46);

            currentY += 85;
        });

        ctx.font = '24px Arial';
        ctx.fillStyle = '#b8b8b8';
        ctx.textAlign = 'center';
        ctx.fillText('Reply: A, B, C, D | NEXT for next | STOP to end', canvas.width / 2, canvas.height - 50);

        return canvas.toBuffer('image/png');
    },

    async createResultCanvas(isCorrect, correctAnswer, questionData, subjectName, sender, userAnswer) {
        const canvas = createCanvas(1400, 850);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (isCorrect) {
            gradient.addColorStop(0, '#0f3460');
            gradient.addColorStop(0.5, '#16213e');
            gradient.addColorStop(1, '#1a5e3a');
        } else {
            gradient.addColorStop(0, '#3d1010');
            gradient.addColorStop(0.5, '#16213e');
            gradient.addColorStop(1, '#0f3460');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        this.roundRect(ctx, 50, 50, canvas.width - 100, canvas.height - 100, 30);
        ctx.fill();

        ctx.strokeStyle = isCorrect ? 'rgba(83, 211, 156, 0.4)' : 'rgba(255, 107, 157, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
        this.roundRect(ctx, 70, 70, canvas.width - 140, 200, 20);
        ctx.fill();

        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = isCorrect ? '#53d38c' : '#ff6b9d';
        ctx.textAlign = 'center';
        ctx.fillText(isCorrect ? '✅ CORRECT!' : '❌ WRONG!', canvas.width / 2, 145);

        ctx.font = 'bold 38px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(subjectName, canvas.width / 2, 210);

        const userScore = userScores.get(sender);
        if (userScore) {
            const streak = userStreaks.get(sender);
            ctx.font = '28px Arial';
            ctx.fillStyle = '#b8b8b8';
            let statsText = 'Score: ' + userScore.correct + '/' + userScore.total;
            if (streak > 0) {
                statsText += ' | 🔥 Streak: ' + streak;
            }
            ctx.fillText(statsText, canvas.width / 2, 250);
        }

        ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
        this.roundRect(ctx, 90, 300, canvas.width - 180, 180, 20);
        ctx.fill();

        ctx.strokeStyle = 'rgba(83, 211, 156, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#4fa3d8';
        ctx.textAlign = 'left';
        ctx.fillText('YOUR ANSWER:', 120, 345);
        
        ctx.font = '28px Arial';
        ctx.fillStyle = isCorrect ? '#53d38c' : '#ff6b9d';
        ctx.fillText(userAnswer, 350, 345);

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#53d38c';
        ctx.fillText('CORRECT ANSWER:', 120, 400);
        
        ctx.font = '28px Arial';
        ctx.fillStyle = '#53d38c';
        ctx.fillText(correctAnswer.toUpperCase(), 420, 400);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#e0e0e0';
        const correctOption = questionData.option[correctAnswer.toLowerCase()];
        const wrappedCorrect = this.wrapText(ctx, correctOption, canvas.width - 240);
        const displayCorrect = wrappedCorrect[0].substring(0, 100) + (wrappedCorrect[0].length > 100 ? '...' : '');
        ctx.fillText(displayCorrect, 120, 445);

        ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
        this.roundRect(ctx, 90, 510, canvas.width - 180, 280, 20);
        ctx.fill();

        ctx.strokeStyle = 'rgba(79, 163, 216, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#4fa3d8';
        ctx.fillText('🤖 AI TUTOR EXPLANATION', 120, 565);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Generating personalized explanation...', 120, 620);
        ctx.fillText('Check the caption below for AI insights!', 120, 660);

        ctx.font = '22px Arial';
        ctx.fillStyle = '#b8b8b8';
        ctx.textAlign = 'center';
        ctx.fillText('Reply NEXT for another question', canvas.width / 2, canvas.height - 50);

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