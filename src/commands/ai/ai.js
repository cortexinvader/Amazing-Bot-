import fs from "fs";
import path from "path";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const settingsFile = path.join(__dirname, "ai_model.json");
const historyFile = path.join(__dirname, "ai_history.json");

const AVAILABLE_MODELS = [
    "llama3.1-8b",
    "llama-3.3-70b",
    "llama-4-scout-17b-16e-instruct"
];

const client = new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY || "csk-prcc628w42cc6jhjn48n5pe8xwhyyd26tteyek8x4dy8dpf6",
    warmTCPConnection: false
});

function ensureFile(file, defObj) {
    if (!fs.existsSync(file))
        fs.writeFileSync(file, JSON.stringify(defObj, null, 2));
}

function loadModel() {
    ensureFile(settingsFile, { model: AVAILABLE_MODELS[1] });
    try {
        return JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    } catch {
        fs.writeFileSync(
            settingsFile,
            JSON.stringify({ model: AVAILABLE_MODELS[1] }, null, 2)
        );
        return { model: AVAILABLE_MODELS[1] };
    }
}

function saveModel(model) {
    fs.writeFileSync(settingsFile, JSON.stringify({ model }, null, 2));
}

function loadHistory(uid) {
    ensureFile(historyFile, {});
    try {
        const all = JSON.parse(fs.readFileSync(historyFile, "utf8") || "{}");
        all[uid] ||= [];
        return all;
    } catch {
        fs.writeFileSync(historyFile, JSON.stringify({}, null, 2));
        return {};
    }
}

function saveHistory(uid, historyArr) {
    ensureFile(historyFile, {});
    const all = JSON.parse(fs.readFileSync(historyFile, "utf8") || "{}");
    all[uid] = historyArr;
    fs.writeFileSync(historyFile, JSON.stringify(all, null, 2));
}

function resetHistory(uid) {
    const all = loadHistory(uid);
    all[uid] = [];
    fs.writeFileSync(historyFile, JSON.stringify(all, null, 2));
}

async function callCerebrasChat({ model, messages, stream = false }) {
    const resp = await client.chat.completions.create({
        model,
        messages,
        stream
    });
    if (stream) {
        let full = "";
        for await (const chunk of resp) {
            const delta = chunk?.choices?.[0]?.delta?.content;
            if (delta) full += delta;
        }
        return full || "";
    }
    return resp?.choices?.[0]?.message?.content || "";
}

export default {
    name: "ai",
    aliases: ["chatgpt", "gpt"],
    category: "AI",
    description: "Smart AI using Cerebras models with per-user chat history",
    usage: "ai <your question>",
    example: "ai what is quantum computing",
    cooldown: 3,
    permissions: ["user"],
    args: false,
    minArgs: 0,
    maxArgs: 999,

    async execute({ sock, message, args, from, sender }) {
        const body = args.join(" ");
        const uid = sender;

        if (body.toLowerCase() === "clear") {
            resetHistory(uid);
            return await sock.sendMessage(from, {
                text: "🧹 Chat history cleared for you."
            }, { quoted: message });
        }

        if (body.toLowerCase() === "-set:1") {
            saveModel(AVAILABLE_MODELS[0]);
            return await sock.sendMessage(from, {
                text: `✅ AI model has been set to "${AVAILABLE_MODELS[0]}".`
            }, { quoted: message });
        }
        
        if (body.toLowerCase() === "-set:2") {
            saveModel(AVAILABLE_MODELS[1]);
            return await sock.sendMessage(from, {
                text: `✅ AI model has been set to "${AVAILABLE_MODELS[1]}".`
            }, { quoted: message });
        }
        
        if (body.toLowerCase() === "-set:3") {
            saveModel(AVAILABLE_MODELS[2]);
            return await sock.sendMessage(from, {
                text: `✅ AI model has been set to "${AVAILABLE_MODELS[2]}".`
            }, { quoted: message });
        }

        if (!body || body.trim() === "") {
            const greetings = [
                "👑 AI here! Ask me anything.",
                "🌟 Hi! Ready to chat?",
                "💡 Say something and I'll respond!",
                "✨ What shall we explore today?"
            ];
            const random = greetings[Math.floor(Math.random() * greetings.length)];
            return await sock.sendMessage(from, {
                text: random
            }, { quoted: message });
        }

        const thinking = await sock.sendMessage(from, {
            text: "🧠 Thinking..."
        }, { quoted: message });

        const { model } = loadModel();

        try {
            const all = loadHistory(uid);
            const historyArr = all[uid];

            historyArr.push({ role: "user", content: body });
            saveHistory(uid, historyArr);

            const replyText = await callCerebrasChat({
                model,
                messages: historyArr,
                stream: false
            }) || "❌ No response found.";

            historyArr.push({ role: "assistant", content: replyText });
            saveHistory(uid, historyArr);

            await sock.sendMessage(from, {
                text: replyText,
                edit: thinking.key
            });

            if (!global.replyHandlers) {
                global.replyHandlers = {};
            }

            global.replyHandlers[thinking.key.id] = {
                command: "ai",
                handler: async (replyText, replyMessage) => {
                    const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                    
                    if (replySender !== sender) {
                        return;
                    }

                    const userText = replyText.trim();
                    if (!userText) return;

                    const thinkingReply = await sock.sendMessage(from, {
                        text: "🧠 Thinking..."
                    }, { quoted: replyMessage });

                    try {
                        const { model } = loadModel();
                        const all = loadHistory(uid);
                        const historyArr = all[uid];

                        historyArr.push({ role: "user", content: userText });
                        saveHistory(uid, historyArr);

                        const replyText = await callCerebrasChat({
                            model,
                            messages: historyArr,
                            stream: false
                        }) || "❌ No response found.";

                        historyArr.push({ role: "assistant", content: replyText });
                        saveHistory(uid, historyArr);

                        await sock.sendMessage(from, {
                            text: replyText,
                            edit: thinkingReply.key
                        });

                        global.replyHandlers[thinkingReply.key.id] = global.replyHandlers[thinking.key.id];
                    } catch (err) {
                        await sock.sendMessage(from, {
                            text: "⚠️ Error! Try again later.",
                            edit: thinkingReply.key
                        });
                    }
                }
            };

        } catch (err) {
            await sock.sendMessage(from, {
                text: "⚠️ Error! Try again later.",
                edit: thinking.key
            });
        }
    }
};