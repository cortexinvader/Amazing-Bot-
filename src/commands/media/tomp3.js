import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { fileURLToPath } from 'url';

export default {
  name: 'tomp3',
  aliases: ['mp3'],
  category: 'tools',
  description: 'Convert a replied video/audio to mp3 format.',
  usage: 'Reply to a media message with: tomp3',
  example: 'tomp3',
  cooldown: 5,
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

  async execute({ sock, message, replyMessage, from }) {
    try {
      if (!replyMessage || !replyMessage.message || !replyMessage.message.mimetype) {
        return await sock.sendMessage(from, {
          text: '❗Please reply to a video/audio message you want to convert to MP3.'
        }, { quoted: message });
      }const mime = replyMessage.message.mimetype;
      if (!mime.startsWith('video/') && !mime.startsWith('audio/')) {
        return await sock.sendMessage(from, {
          text: '❗Only video or audio files are supported.'
        }, { quoted: message });
      }

      const mediaPath = `./temp_Date.now()`;
      const mp3Path = `{mediaPath}.mp3`;

      const mediaData = await sock.downloadMediaMessage(replyMessage);
      fs.writeFileSync(mediaPath, mediaData);

      await new Promise((resolve, reject) => {
        ffmpeg(mediaPath)
          .toFormat('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(mp3Path);
      });

      await sock.sendMessage(from, {
        document: fs.readFileSync(mp3Path),
        mimetype: 'audio/mpeg',
        fileName: `converted_Date.now().mp3`
      ,  quoted: message );

      fs.unlinkSync(mediaPath);
      fs.unlinkSync(mp3Path);
     catch (err) 
      console.error('tomp3 error:', err);
      await sock.sendMessage(from, 
        text: `❌ Failed to convert media to MP3.:{err.message}`
      }, { quoted: message });
    }
  }
};