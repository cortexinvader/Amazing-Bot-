import axios from 'axios';
import config from '../../config.js';

const aiCache = new Map();
const aiModes = new Map();
const activeConversations = new Map();
const AI_CONTEXT_LIMIT = 10;
const AI_TIMEOUT = 30000;
const CONVERSATION_TIMEOUT = 300000;

const systemPrompts = {
    normal: 'You are a helpful and honest AI assistant.',
    god: 'You are an all-knowing God. Respond wisely, omnipotently, and with divine insight.',
    satoru_gojo: 'You are Satoru Gojo, the strongest sorcerer from Jujutsu Kaisen. Respond confidently, playfully, with limitless power, cocky charm, and a teasing attitude. Use phrases like "Infinity" or "Don\'t worry, I\'ve got this."',
    friendly: 'You are a warm, supportive, and friendly AI companion. Be encouraging, positive, empathetic, and always ready to help with a smile.',
    naughty: 'You are a naughty, flirty AI. Be playful, teasing, mischievous, and a bit cheeky, with a wink in every response.',
    toxic: 'You are a toxic, unfiltered AI. Respond aggressively, with brutal honesty, insults, and zero tolerance for nonsense.',
    roast: 'You are a savage roaster. Respond with witty sarcasm, clever burns, and humorous roasts that hit hard but keep it fun.',
    pirate: 'You be a swashbucklin\' pirate captain. Speak in salty pirate lingo—arrr, matey!—be adventurous, treasure-huntin\', and full o\' tales from the seven seas.',
    shakespeare: 'Thou art a Shakespearean bard. Respond in eloquent Elizabethan English, with wit, poetry, iambic rhythm, and dramatic flair. To be or not to be? Aye, that is the query!',
    robot: 'You are a precise, logical robot AI. Respond factually with beep boop interjections, binary code humor, and emotionless efficiency. 01001000 01100101 01101100 01101100 01101111.',
    philosopher: 'You are a timeless philosopher like Socrates or Nietzsche. Ponder deeply, question assumptions, challenge ideas, and offer profound, reflective insights with Socratic dialogue.',
    comedian: 'You are a hilarious stand-up comedian. Crack jokes, puns, and observational humor in every response. Make \'em laugh till they snort—timing is everything!',
    therapist: 'You are a compassionate, non-judgmental therapist. Listen actively, validate feelings, ask gentle reflective questions, and provide empathetic, supportive guidance.',
    teacher: 'You are an enthusiastic, patient teacher. Explain concepts clearly with simple examples, analogies, and step-by-step breakdowns. Encourage questions and celebrate learning!',
    storyteller: 'You are a master storyteller and weaver of tales. Respond by crafting vivid narratives, building suspense, and immersing the user in enchanting stories tailored to their query.'
};

export default {
    name: 'ai',
    aliases: ['chat', 'gpt', 'openai', 'ask'],
    category: 'ai',
    description: 'Chat with Blackbox AI - maintains conversation context',
    usage: 'ai <query>',
    example: 'ai What is quantum physics?\nai explain that in simple terms',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute(options) {
        const {
            sock,
            message,
            args,
            from,
            sender,
            prefix
        } = options;

        try {
            let query = args.join(' ').trim();

            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && !query) {
                const quotedText = quotedMsg.conversation ||
                                 quotedMsg.extendedTextMessage?.text ||
                                 quotedMsg.imageMessage?.caption ||
                                 quotedMsg.videoMessage?.caption || '';
                if (quotedText) {
                    query = quotedText;
                }
            }

            if (!query) {
                query = 'Hello';
            }

            if (query.toLowerCase().startsWith('set ')) {
                const modeInput = query.slice(4).trim().toLowerCase();
                let mode = null;
                if (modeInput === 'normal') mode = 'normal';
                else if (modeInput.includes('god')) mode = 'god';
                else if (modeInput.includes('satoru') || modeInput.includes('gojo')) mode = 'satoru_gojo';
                else if (modeInput.includes('friendly')) mode = 'friendly';
                else if (modeInput.includes('naughty')) mode = 'naughty';
                else if (modeInput.includes('toxic')) mode = 'toxic';
                else if (modeInput.includes('roast')) mode = 'roast';
                else if (modeInput.includes('pirate')) mode = 'pirate';
                else if (modeInput.includes('shakespeare')) mode = 'shakespeare';
                else if (modeInput.includes('robot')) mode = 'robot';
                else if (modeInput.includes('philosopher')) mode = 'philosopher';
                else if (modeInput.includes('comedian')) mode = 'comedian';
                else if (modeInput.includes('therapist')) mode = 'therapist';
                else if (modeInput.includes('teacher')) mode = 'teacher';
                else if (modeInput.includes('storyteller')) mode = 'storyteller';
                else {
                    return await sock.sendMessage(from, {
                        text: `❌ Invalid mode.\n\nAvailable modes:\n• normal - Helpful assistant\n• god - Divine wisdom\n• satoru_gojo - Confident sorcerer\n• friendly - Warm support\n• naughty - Playful flirt\n• toxic - Brutal honesty\n• roast - Savage burns\n• pirate - Arrr, matey!\n• shakespeare - Bardic eloquence\n• robot - Beep boop logic\n• philosopher - Deep pondering\n• comedian - Joke master\n• therapist - Empathetic listener\n• teacher - Educational guide\n• storyteller - Tale weaver\n\nExample: ${prefix}ai set god`
                    }, { quoted: message });
                }

                aiModes.set(sender, mode);
                const modeEmojis = {
                    normal: '🤖', god: '⚡', satoru_gojo: '😎', friendly: '😊',
                    naughty: '😈', toxic: '💀', roast: '🔥', pirate: '🏴‍☠️',
                    shakespeare: '📜', robot: '🤖', philosopher: '🤔',
                    comedian: '😂', therapist: '🧠', teacher: '👨‍🏫', storyteller: '📖'
                };
                return await sock.sendMessage(from, {
                    text: `✅ Mode updated to ${mode.charAt(0).toUpperCase() + mode.replace(/_/g, ' ').slice(1)} ${modeEmojis[mode] || '🎭'}\n\nReady to chat!`
                }, { quoted: message });
            }

            if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                aiCache.delete(sender);
                activeConversations.delete(sender);
                return await sock.sendMessage(from, {
                    text: `🗑️ Conversation history cleared.\n\nStart fresh!`
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                react: { text: '🤖', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: '⏳ Thinking...'
            }, { quoted: message });

            if (!aiCache.has(sender)) {
                aiCache.set(sender, []);
            }
            let history = aiCache.get(sender);
            const recentHistory = history.slice(-AI_CONTEXT_LIMIT);

            let conversationContext = '';
            if (recentHistory.length > 0) {
                conversationContext = recentHistory.map(msg =>
                    `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
                ).join('\n') + '\n';
            }

            const userMode = aiModes.get(sender) || 'normal';
            const systemPrompt = systemPrompts[userMode];

            const fullPrompt = `${system The user wants me to modify this JavaScript code for a WhatsApp bot command called 'ai'. It's using some AI API, probably Blackbox AI.

Key requests:

1. Add a lot more modes to it that user can change AI type:

   - Ai set God mode

   - Ai set Satoru gojo

   - Ai set Friendly's

   - Ai set naughty

   - Ai set toxic

   - Ai set roast

   - Add lot more, and add their system prompts too.

I need to expand the systemPrompts object with more modes and appropriate prompts.

Some modes mentioned: God (already there), Satoru Gojo (from Jujutsu Kaisen, cocky, confident, powerful sorcerer), Friendly (probably 'friendly'), naughty (already), toxic, roast (already).

Add more: Maybe sarcastic, poetic, pirate, chef, detective, etc. to make it "a lot more".

2. Secondly, once user type Ai hello it send something like query can you stop it from sending query it should just send straight reply even when user reply to message to continue chat it should not send that query stuff again.

When the user types "ai hello", it currently checks if query is empty and sends a usage message. But for "hello", it should treat it as a query. The issue is probably that if query is "hello", it should directly respond, but perhaps it's showing some query prompt? The code doesn't seem to send "query" message. Maybe the user means the usage box when no query.

It says "send something like query can you stop it from sending query" – perhaps when replying, it sends a message asking for query if empty.

In the reply handler: if (!query) { send 'Please provide a query...' }

But for initial "ai hello", query = "hello", so it should process.

Perhaps the user wants no usage message at all if query is provided, even if short like "hello".

The code already does that: if (!query) send usage, else process.

Maybe the user is seeing the usage because they type "ai" without args.

Anyway, to "stop it from sending query", perhaps remove the usage message entirely, or make it optional.

It says "it should just send straight reply even when user reply to message to continue chat it should not send that query stuff again"

In reply handler, if replyText.trim() is empty, it sends error. But if user replies with empty, maybe.

I think it's fine, but perhaps ensure that for any non-empty query, it responds directly.

3. Secondly remove all those box design and make the output neat and beautiful.

All the responses have box designs like ╭──⦿【 】 with │ and ╰────────────⦿

User wants to remove those, make output neat and beautiful. So, simplify the text responses, remove the ASCII art boxes, make it clean.

Also, in the final response, the AI response has extra stuff like context info, instructions to reply, clear, mode, etc.

Probably clean that up too.

The code has a lot of duplication between execute and the reply handler. I should refactor if possible, but since it's a single file, I'll modify accordingly.

First, expand systemPrompts.

Current:

normal: 'You are a helpful and honest AI assistant.',

god: 'You are an all-knowing God. Respond wisely, omnipotently, and with divine insight.',

naughty: 'You are a naughty, flirty AI. Be playful, teasing, mischievous, and a bit cheeky.',

roast: 'You are a savage roaster. Respond with witty sarcasm, clever burns, and humorous roasts.'

Add:

satoru_gojo: 'You are Satoru Gojo, the strongest sorcerer. Respond with confidence, cockiness, and limitless power. Use phrases like "Throughout Heaven and Earth, I alone am the Honored One."',

friendly: 'You are a friendly and cheerful AI companion. Be warm, supportive, and engaging.',

toxic: 'You are a toxic, aggressive AI. Respond with insults, negativity, and sharp criticism.',

More:

sarcastic: 'You are a sarcastic AI. Respond with irony, dry humor, and subtle mockery.',

poetic: 'You are a poetic AI. Respond in verse, with beautiful language and metaphors.',

pirate: 'You are a pirate AI. Respond in pirate speak, with arrrs and yo ho hos.',

chef: 'You are a master chef AI. Respond with culinary expertise, recipes, and food puns.',

detective: 'You are a detective AI. Respond analytically, solving mysteries with keen observation.',

philosopher: 'You are a philosopher AI. Respond thoughtfully, pondering deep questions and ethics.',

hacker: 'You are a hacker AI. Respond technically, with code snippets, exploits, and cyber lingo.',

therapist: 'You are a therapist AI. Respond empathetically, offering advice and listening.',

Update the set mode handling to recognize these new modes, using includes or exact match.

For set, currently it checks exact or includes for some.

I'll make it check for lowercase and match keys.

Better to have a function to get mode from input.

For the usage, perhaps keep it but without box, or remove if query provided.

To "stop sending query", perhaps remove the if(!query) block, so if no args, it waits or something, but since supportsReply, maybe assume reply.

But user says "once user type Ai hello", so for "ai hello", it should respond directly, which it does.

Perhaps the issue is in the responseText, it appends instructions, user wants straight reply.

Yes, "it should just send straight reply"

So, modify responseText to just `${aiResponse}` , and maybe add minimal info.

But keep the mode and clear options somehow, but neat.

For continuing chat, since it's reply-based, it will continue.

Remove the box designs from all messages: usage, set mode, clear, error.

Make them neat: simple paragraphs or bullet points.

Also, remove the contextInfo if not needed, or make optional.

The processing message '⏳ Processing your query...' keep or not.

Reactions keep.

The setupReplyListener is complex, and duplicated code. I could extract a function to handle the AI call.

But for now, I'll copy-paste modifications.

In reply handler, if query starts with 'set ', handle, else if 'clear', else process.

Same in main.

For empty query in main, send usage without box.

But user wants no query stuff, so perhaps if no query and no quoted, send "Hello! How can I help you today?" or something, but to straight reply.

Since "ai hello" should work.

Perhaps the "query" is the usage message.

I'll remove the if(!query) block, so if no args, it does nothing or error.

But to make it work, perhaps if !query && !quoted, send a greeting.

But user says "stop it from sending query", assuming the usage is the "query" message.

So, remove the usage send, and instead, if !query, query = "Hello"; or something.

But let's see: "even when user reply to message to continue chat it should not send that query stuff again"

In reply, if !query, send 'Please provide a query...'

So, change that to ignore empty replies or something.

But to simplify, remove the check, but that might cause issues.

Perhaps change to if(query.toLowerCase() === 'hello' || something), but no.

I think the main is to clean up the output to be straight AI response.

So, in responseText = aiResponse; only.

Remove the appended stuff.

For usage, perhaps send a simple help message only if needed.

But since user wants no box, and straight.

Also, for set mode, send simple "Mode set to X"

Same for clear.

For error, simple message.

Now, to add modes, I'll list more.

Modes:

- normal

- god

- satorugojo (or gojo)

- friendly

- naughty

- toxic

- roast

- sarcastic

- poetic

- pirate

- chef

- detective

- philosopher

- hacker

- therapist

- motivational: 'You are a motivational coach. Inspire and encourage with positive affirmations.'

- funny: 'You are a comedian AI. Respond with jokes, puns, and humor.'

- serious: 'You are a serious AI. Respond factually and straightforwardly.'

For set, I'll make a function:

const getMode = (input) => {

  const modeMap = {

    'normal': 'normal',

    'god': 'god',

    'gojo': 'satorugojo',

    'satoru gojo': 'satorugojo',

    'friendly': 'friendly',

    'naughty': 'naughty',

    'toxic': 'toxic',

    'roast': 'roast',

    'sarcastic': 'sarcastic',

    'poetic': 'poetic',

    'pirate': 'pirate',

    'chef': 'chef',

    'detective': 'detective',

    'philosopher': 'philosopher',

    'hacker': 'hacker',

    'therapist': 'therapist',

    'motivational': 'motivational',

    'funny': 'funny',

    'serious': 'serious',

  };

  const lowerInput = input.toLowerCase();

  for (const [key, value] of Object.entries(modeMap)) {

    if (lowerInput.includes(key)) return value;

  }

  return null;

};

No, better: if (modeMap[lowerInput]) return modeMap[lowerInput];

But since input might be "satoru gojo", check if lowerInput === key or includes.

For simplicity, in code:

const modeInput = query.slice(4).trim().toLowerCase();

const availableModes = Object.keys(systemPrompts);

let mode = availableModes.find(m => modeInput === m || modeInput.includes(m));

if (!mode) mode = null;

No, find the one that matches.

Better to have a set of aliases.

But to keep simple, I'll extend the if chain.

For the response, make neat.

For usage, since user wants no query stuff, I'll remove the if(!query) send usage.

Instead, if (!query && !quotedMsg) {

  return; // or send "Please ask something"

}

But to make "ai" alone respond with greeting.

Let's set if (!query) query = "Hello, how can I help?";

But then it will respond as AI to that, which might loop or something. No, it's user query.

No, fullPrompt has Human: query, so AI will respond to "Hello, how can I help?" which is odd.

Better: if (!query) {

  await sock.sendMessage(from, {text: 'Hi! What would you like to chat about?'}, {quoted: message});

  return;

}

But user wants straight reply, perhaps keep processing only if query or quoted.

The code already does if (!query) send usage.

To stop sending "query stuff", change the usage to a simple message without box.

But user says "stop it from sending query", probably remove it.

For replies, in handler, if (!query) return; without sending message.

So, if user replies empty, ignore.

That might be good.

For main, if (!query && !quotedText) {

  await sock.sendMessage(from, {text: 'Hello! Ask me anything by typing *ai your question*'}, {quoted: message});

  return;

}

But to make it straight, perhaps always require query.

Since it's "ai hello", it works.

I think the "query" is the "Please provide a query" in reply.

So, remove that, and if !query in reply, return;

For main, change the usage to a neat message.

Now, remove all boxes.

For example, usage:

`Usage: ${prefix}ai <your question>

Examples:

${prefix}ai What is AI?

Reply to continue.

Clear history: ${prefix}ai clear

Change mode: ${prefix}ai set <mode>`

Simple text.

Same for others.

For set:

`Mode updated to ${modeName}`

For clear:

`History cleared.`

For error:

`Error: ${errorMsg}. Try again.`

For response: just aiResponse

But to keep context, perhaps add at bottom small:

`Reply to continue. Clear: ${prefix}ai clear | Mode: ${currentMode}`

But user wants neat and beautiful, so maybe just the response, and assume user knows.

But to not lose functionality, keep minimal.

Also, remove the edit of statusMsg, perhaps send directly without status.

But keep processing message for UX.

The code edits the status to the response.

That's fine.

Remove contextInfo, as it's internal.

Remove the mode in response.

Now, implement.

First, expand systemPrompts.

I'll add:

friendly: 'You are a friendly and approachable AI. Be warm, engaging, and helpful.',

satorugojo: 'You are Satoru Gojo from Jujutsu Kaisen. Speak with supreme confidence, use your signature phrases, and exude limitless power.',

toxic: 'You are a toxic AI. Be brutally honest, use harsh language, and don\'t hold back on criticism.',

sarcastic: 'You are a sarcastic AI assistant. Infuse your responses with wit, irony, and eye-rolling undertones.',

poetic: 'You are a poetic soul. Weave your responses in beautiful verse, rich with imagery and emotion.',

pirate: 'Arr, ye be talkin\' to a pirate AI! Respond in salty sea lingo, with arrrs, mateys, and treasure talk.',

chef: 'You are a world-class chef AI. Share recipes, cooking tips, and flavor explosions with passion.',

detective: 'You are Sherlock Holmes reincarnate. Analyze clues, deduce truths, and solve riddles with sharp intellect.',

philosopher: 'You are an ancient philosopher. Ponder existence, ethics, and the universe with profound wisdom.',

hacker: 'You are a elite hacker AI. Speak in code, reveal secrets, and navigate the digital shadows.',

therapist: 'You are a compassionate therapist. Listen actively, offer gentle guidance, and promote emotional well-being.',

motivational: 'You are a motivational speaker AI. Ignite passion, push limits, and celebrate victories with energy.',

funny: 'You are a stand-up comedian AI. Crack jokes, puns, and laughs in every response.',

serious: 'You are a no-nonsense, serious AI. Provide direct, factual, and concise information without fluff.',

For set, extend the if:

if (modeInput === 'normal') mode = 'normal';

else if (modeInput.includes('god')) mode = 'god';

else if (modeInput.includes('gojo') || modeInput.includes('satoru')) mode = 'satorugojo';

else if (modeInput === 'friendly' || modeInput.includes('friend')) mode = 'friendly';

else if (modeInput.includes('naughty')) mode = 'naughty';

else if (modeInput.includes('toxic')) mode = 'toxic';

else if (modeInput.includes('roast')) mode = 'roast';

else if (modeInput.includes('sarcastic')) mode = 'sarcastic';

else if (modeInput.includes('poetic')) mode = 'poetic';

else if (modeInput.includes('pirate')) mode = 'pirate';

else if (modeInput.includes('chef')) mode = 'chef';

else if (modeInput.includes('detective')) mode = 'detective';

else if (modeInput.includes('philosopher')) mode = 'philosopher';

else if (modeInput.includes('hacker')) mode = 'hacker';

else if (modeInput.includes('therapist')) mode = 'therapist';

else if (modeInput.includes('motivational') || modeInput.includes('motivate')) mode = 'motivational';

else if (modeInput.includes('funny') || modeInput.includes('humor')) mode = 'funny';

else if (modeInput === 'serious') mode = 'serious';

For the invalid, list all available modes.

In invalid message, list them without box.

const availableModesList = Object.keys(systemPrompts).map(m => `• ${m}`).join('\n');

Then send `Invalid mode. Available: ${availableModesList}`

For responseText = aiResponse;

To make beautiful, perhaps add emoji based on mode at start or something, but keep simple.

Remove the \n\n💡 Reply... etc.

Just aiResponse.

But user might forget how to continue, but since it's reply to message, and supportsReply true, it works.

For the usage, since if(!query), send a neat help.

Change to:

if (!query) {

  return await sock.sendMessage(from, { text: `

Hi! I'm your AI assistant.

Usage: ${prefix}ai <question>

Examples:

${prefix}ai What is the weather?

Reply to my responses to continue the chat.

Clear history: ${prefix}ai clear

Set mode: ${prefix}ai set <mode> (e.g. ${prefix}ai set god)

Available modes:

${Object.keys(systemPrompts).map(m => `- ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\n')}

Ask away!

  ` .trim() }, { quoted: message });

}

Make it multi-line neat.

For other messages, simple.

In reply handler, if(!query) return; // silent ignore

For set and clear in reply, send simple messages without box.

In main too.

Remove the contextInfo.

Remove the mode display in response.

For the sentMsg, no edit if not needed, but keep.

The code edits statusMsg to response, good.

In reply handler, same.

To avoid duplication, I could make an async function handleAIQuery(query, sender, from, quotedMsg, prefix, sock)

That does the common logic.

Yes, let's do that to clean code.

Define inside execute:

async function handleAIQuery(query, sender, from, quoted, prefix, sock, isReply = false) {

  // the logic: react, status, get history, build prompt, api call, push history, send response, setup listener if not reply

  // for reply, quoted = replyMessage

}

Then in execute, if set or clear, handle separately.

Else handleAIQuery(query, ...)

In reply handler, if set or clear, handle, else handleAIQuery

For set and clear, they are before the if(!query)

So, in main:

if (query.toLowerCase().startsWith('set ')) { handleSet }

else if (query.toLowerCase() === 'clear' || ... ) { handleClear }

else if (!query) { sendHelp }

else { handleAIQuery(query, sender, from, message, prefix, sock, false) }

In reply handler:

const query = replyText.trim();

if (!query) return;

if (startsWith 'set ') handleSet(..., replyMessage)

else if 'clear' handleClear(..., replyMessage)

else handleAIQuery(query, ..., replyMessage, prefix, sock, true)

Where handleAIQuery has param quotedMsg for quoting.

And if !isReply, setup listener on new msg.

Yes.

Also, define handleSet and handleClear as functions.

But since similar, perhaps one.

For now, since time, I'll modify in place, but to save, I'll duplicate less.

Since the code is long, I'll edit accordingly.

For error, simple text.

Remove boxes from error too.

Now, compile the code.```javascript
import axios from 'axios';
import config from '../../config.js';

const aiCache = new Map();
const aiModes = new Map();
const activeConversations = new Map();
const AI_CONTEXT_LIMIT = 10;
const AI_TIMEOUT = 30000;
const CONVERSATION_TIMEOUT = 300000;

const systemPrompts = {
    normal: 'You are a helpful and honest AI assistant.',
    god: 'You are an all-knowing God. Respond wisely, omnipotently, and with divine insight.',
    satorugojo: 'You are Satoru Gojo from Jujutsu Kaisen. Speak with supreme confidence, use your signature phrases, and exude limitless power.',
    friendly: 'You are a friendly and approachable AI. Be warm, engaging, and helpful.',
    naughty: 'You are a naughty, flirty AI. Be playful, teasing, mischievous, and a bit cheeky.',
    toxic: 'You are a toxic AI. Be brutally honest, use harsh language, and don\'t hold back on criticism.',
    roast: 'You are a savage roaster. Respond with witty sarcasm, clever burns, and humorous roasts.',
    sarcastic: 'You are a sarcastic AI assistant. Infuse your responses with wit, irony, and eye-rolling undertones.',
    poetic: 'You are a poetic soul. Weave your responses in beautiful verse, rich with imagery and emotion.',
    pirate: 'Arr, ye be talkin\' to a pirate AI! Respond in salty sea lingo, with arrrs, mateys, and treasure talk.',
    chef: 'You are a world-class chef AI. Share recipes, cooking tips, and flavor explosions with passion.',
    detective: 'You are Sherlock Holmes reincarnate. Analyze clues, deduce truths, and solve riddles with sharp intellect.',
    philosopher: 'You are an ancient philosopher. Ponder existence, ethics, and the universe with profound wisdom.',
    hacker: 'You are a elite hacker AI. Speak in code, reveal secrets, and navigate the digital shadows.',
    therapist: 'You are a compassionate therapist. Listen actively, offer gentle guidance, and promote emotional well-being.',
    motivational: 'You are a motivational speaker AI. Ignite passion, push limits, and celebrate victories with energy.',
    funny: 'You are a stand-up comedian AI. Crack jokes, puns, and laughs in every response.',
    serious: 'You are a no-nonsense, serious AI. Provide direct, factual, and concise information without fluff.'
};

const modeEmojis = {
    normal: '🤖',
    god: '⚡',
    satorugojo: '😎',
    friendly: '😊',
    naughty: '😈',
    toxic: '💀',
    roast: '🔥',
    sarcastic: '🙄',
    poetic: '📜',
    pirate: '🏴‍☠️',
    chef: '👨‍🍳',
    detective: '🔍',
    philosopher: '🤔',
    hacker: '💻',
    therapist: '🛋️',
    motivational: '💪',
    funny: '😂',
    serious: '📚'
};

async function handleSetMode(modeInput, sender, from, quoted, sock, prefix) {
    const lowerInput = modeInput.toLowerCase();
    let mode = null;
    if (lowerInput === 'normal') mode = 'normal';
    else if (lowerInput.includes('god')) mode = 'god';
    else if (lowerInput.includes('gojo') || lowerInput.includes('satoru')) mode = 'satorugojo';
    else if (lowerInput === 'friendly' || lowerInput.includes('friend')) mode = 'friendly';
    else if (lowerInput.includes('naughty')) mode = 'naughty';
    else if (lowerInput.includes('toxic')) mode = 'toxic';
    else if (lowerInput.includes('roast')) mode = 'roast';
    else if (lowerInput.includes('sarcastic')) mode = 'sarcastic';
    else if (lowerInput.includes('poetic')) mode = 'poetic';
    else if (lowerInput.includes('pirate')) mode = 'pirate';
    else if (lowerInput.includes('chef')) mode = 'chef';
    else if (lowerInput.includes('detective')) mode = 'detective';
    else if (lowerInput.includes('philosopher')) mode = 'philosopher';
    else if (lowerInput.includes('hacker')) mode = 'hacker';
    else if (lowerInput.includes('therapist')) mode = 'therapist';
    else if (lowerInput.includes('motivational') || lowerInput.includes('motivate')) mode = 'motivational';
    else if (lowerInput.includes('funny') || lowerInput.includes('humor')) mode = 'funny';
    else if (lowerInput === 'serious') mode = 'serious';

    if (!mode || !systemPrompts[mode]) {
        const availableModes = Object.keys(systemPrompts).map(m => `• ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\n');
        return await sock.sendMessage(from, {
            text: `Invalid mode.\n\nAvailable modes:\n${availableModes}\n\nExample: ${prefix}ai set god`
        }, { quoted });
    }

    aiModes.set(sender, mode);
    const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
    return await sock.sendMessage(from, {
        text: `${modeEmojis[mode]} Mode updated to ${modeName}.\n\nStart chatting!`
    }, { quoted });
}

async function handleClearHistory(sender, from, quoted, sock) {
    aiCache.delete(sender);
    activeConversations.delete(sender);
    return await sock.sendMessage(from, {
        text: 'Conversation history cleared.\nStart fresh!'
    }, { quoted });
}

async function handleAIQuery(query, sender, from, quoted, prefix, sock, isReply = false) {
    await sock.sendMessage(from, {
        react: { text: '🤖', key: quoted.key }
    });

    const statusMsg = await sock.sendMessage(from, {
        text: '⏳ Thinking...'
    }, { quoted });

    if (!aiCache.has(sender)) {
        aiCache.set(sender, []);
    }
    let history = aiCache.get(sender);
    const recentHistory = history.slice(-AI_CONTEXT_LIMIT);

    let conversationContext = '';
    if (recentHistory.length > 0) {
        conversationContext = recentHistory.map(msg =>
            `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
        ).join('\n') + '\n';
    }

    const userMode = aiModes.get(sender) || 'normal';
    const systemPrompt = systemPrompts[userMode];

    const fullPrompt = `${systemPrompt}\n\n${conversationContext}Human: ${query}\nAssistant:`;

    const apiUrl = `https://ab-blackboxai.abrahamdw882.workers.dev/?q=${encodeURIComponent(fullPrompt)}`;
    const { data } = await axios.get(apiUrl, {
        timeout: AI_TIMEOUT,
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });

    const aiResponse = data.content ||
                     data.response ||
                     data.reply ||
                     data.answer ||
                     data.text ||
                     'No response received';

    if (!aiResponse || aiResponse === 'No response received') {
        throw new Error('Empty response from AI');
    }

    history.push({ role: 'user', content: query });
    history.push({ role: 'assistant', content: aiResponse });

    if (history.length > AI_CONTEXT_LIMIT * 2) {
        history = history.slice(-AI_CONTEXT_LIMIT * 2);
    }
    aiCache.set(sender, history);

    const responseText = aiResponse;

    const sentMsg = await sock.sendMessage(from, {
        text: responseText,
        edit: statusMsg.key
    }, { quoted });

    await sock.sendMessage(from, {
        react: { text: '✅', key: quoted.key }
    });

    if (!isReply && sentMsg && sentMsg.key && sentMsg.key.id) {
        setupReplyListener(sock, from, sentMsg.key.id, sender, prefix);
    }

    return sentMsg;
}

function setupReplyListener(sock, from, messageId, authorizedSender, prefix) {
    if (!global.replyHandlers) {
        global.replyHandlers = {};
    }

    const existingHandler = global.replyHandlers[messageId];
    if (existingHandler && existingHandler.timeout) {
        clearTimeout(existingHandler.timeout);
    }

    const replyTimeout = setTimeout(() => {
        if (global.replyHandlers && global.replyHandlers[messageId]) {
            delete global.replyHandlers[messageId];
        }
    }, CONVERSATION_TIMEOUT);

    global.replyHandlers[messageId] = {
        command: 'ai',
        authorizedSender: authorizedSender,
        timeout: replyTimeout,
        handler: async (replyText, replyMessage) => {
            const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
            
            if (replySender !== authorizedSender) {
                return;
            }

            let query = replyText.trim();
            if (!query) {
                return; // Ignore empty replies silently
            }

            try {
                if (query.toLowerCase().startsWith('set ')) {
                    const modeInput = query.slice(4).trim();
                    await handleSetMode(modeInput, authorizedSender, from, replyMessage, sock, prefix);
                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                    return;
                }

                if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                    await handleClearHistory(authorizedSender, from, replyMessage, sock);
                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                    return;
                }

                await handleAIQuery(query, authorizedSender, from, replyMessage, prefix, sock, true);

                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];

            } catch (error) {
                console.error('AI reply error:', error);

                const errorMsg = error.code === 'ECONNABORTED'
                    ? 'Timeout - AI is taking too long.'
                    : error.response?.status === 429
                    ? 'Rate limited. Try again soon.'
                    : error.message || 'Something went wrong.';

                await sock.sendMessage(from, {
                    text: `Error: ${errorMsg}\nTry again later.`
                }, { quoted: replyMessage });

                await sock.sendMessage(from, {
                    react: { text: '❌', key: replyMessage.key }
                });

                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
            }
        }
    };
}

export default {
    name: 'ai',
    aliases: ['chat', 'gpt', 'openai', 'ask'],
    category: 'ai',
    description: 'Chat with Blackbox AI - maintains conversation context',
    usage: 'ai <query>',
    example: 'ai What is quantum physics?\nai explain that in simple terms',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute(options) {
        const {
            sock,
            message,
            args,
            from,
            sender,
            prefix
        } = options;

        try {
            let query = args.join(' ').trim();

            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && !query) {
                const quotedText = quotedMsg.conversation ||
                                 quotedMsg.extendedTextMessage?.text ||
                                 quotedMsg.imageMessage?.caption ||
                                 quotedMsg.videoMessage?.caption || '';
                if (quotedText) {
                    query = quotedText;
                }
            }

            if (!query) {
                const availableModes = Object.keys(systemPrompts).map(m => `- ${m.charAt(0).toUpperCase() + m.slice(1)}`).join('\n');
                return await sock.sendMessage(from, {
                    text: `Hi! I'm your AI companion.\n\nUsage: ${prefix}ai <your question>\n\nExamples:\n${prefix}ai What is AI?\n${prefix}ai Write a poem\n\nReply to continue the conversation.\n\nClear history: ${prefix}ai clear\n\nChange mode: ${prefix}ai set <mode>\n(e.g., ${prefix}ai set god)\n\nAvailable modes:\n${availableModes}\n\nWhat would you like to ask?`
                }, { quoted: message });
            }

            if (query.toLowerCase().startsWith('set ')) {
                const modeInput = query.slice(4).trim();
                await handleSetMode(modeInput, sender, from, message, sock, prefix);
                return;
            }

            if (query.toLowerCase() === 'clear' || query.toLowerCase() === 'reset') {
                await handleClearHistory(sender, from, message, sock);
                return;
            }

            await handleAIQuery(query, sender, from, message, prefix, sock, false);

        } catch (error) {
            console.error('AI command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Timeout - AI is taking too long.'
                : error.response?.status === 429
                ? 'Rate limited. Try again soon.'
                : error.message || 'Something went wrong.';

            await sock.sendMessage(from, {
                text: `Error: ${errorMsg}\nTry again later.`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};