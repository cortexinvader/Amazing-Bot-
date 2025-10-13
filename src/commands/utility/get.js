import axios from 'axios';

export default {
    name: 'get',
    aliases: ['api', 'fetch'],
    category: 'utility',
    description: 'Fetch response from any API endpoint (GET or POST)',
    usage: 'get <url> [json-body-for-POST]',
    example: 'get https://jsonplaceholder.typicode.com/posts/1\nget https://jsonplaceholder.typicode.com/posts {"title":"foo","body":"bar","userId":1}',
    cooldown: 3,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        const url = args[0];
        if (!url || !url.startsWith('http')) {
            return sock.sendMessage(from, {
                text: `❌ *Usage:*\n${prefix}${this.name} <url> [json-body-for-POST]\n\nExamples:\n${prefix}${this.name} https://jsonplaceholder.typicode.com/posts/1\n${prefix}${this.name} https://jsonplaceholder.typicode.com/posts '{"title":"foo","body":"bar","userId":1}'`
            }, { quoted: message });
        }

        try {
            let response;
            if (args.length === 1) {
                // GET request
                response = await axios.get(url, { timeout: 10000 });
            } else {
                // POST request
                const bodyStr = args.slice(1).join(' ');
                let body;
                try {
                    body = JSON.parse(bodyStr);
                } catch (parseError) {
                    return sock.sendMessage(from, {
                        text: `❌ *Invalid JSON body*\n\nPlease provide valid JSON for POST request.\nError: ${parseError.message}`
                    }, { quoted: message });
                }
                response = await axios.post(url, body, { timeout: 10000 });
            }

            let data = response.data;

            let formattedData;
            if (typeof data === 'object') {
                formattedData = JSON.stringify(data, null, 2);
            } else {
                formattedData = data.toString();
            }

            const caption = `🌐 *Fetched Data (${response.config.method.toUpperCase()}):*\n\`\`\`\n${formattedData}\n\`\`\`\n\n> Ilom bot`;

            await sock.sendMessage(from, {
                text: caption
            }, { quoted: message });

        } catch (error) {
            console.error('API fetch error:', error);
            await sock.sendMessage(from, {
                text: `❌ *API Error:*\nFailed to fetch from "${url}"\n\n${error.message}`
            }, { quoted: message });
        }
    }
};