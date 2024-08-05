import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

const mediaDir = path.join(__dirname, '..', 'media');
const musicDir = path.join(mediaDir, 'conformed'); // Usar a pasta com arquivos processados
const background = path.join(mediaDir, 'bg.mp4'); // Use bg.png para imagem de fundo
const inputTxtPath = path.join(mediaDir, 'input.txt');

let stream: ffmpeg.FfmpegCommand | null = null;

const createPlaylistFile = async (repetitions = 20) => {
  const files = fs.readdirSync(musicDir).filter(file => file.endsWith('.mp3'));
  let playlistContent = 'ffconcat version 1.0\n';

  for (let i = 0; i < repetitions; i++) {
    playlistContent += files.map(file => `file '${path.join(musicDir, file)}'`).join('\n') + '\n';
  }

  console.log('Playlist content:', playlistContent); // Adicionado log
  await fs.writeFileSync(path.join(mediaDir, 'input.txt'), playlistContent, 'utf8');
};

const startStream = async (streamUrl: string) => {
  await createPlaylistFile(30);

  stream = ffmpeg()
    .addInput(background)
    .inputOptions(['-stream_loop', '-1'])
    .addInput(inputTxtPath)
    .inputOptions(['-re', '-f', 'concat', '-safe', '0', '-stream_loop', '-1'])
    .videoCodec('libx264')
    .audioCodec('aac')
    .outputOptions([
      '-preset', 'veryfast',
      '-tune', 'stillimage',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-f', 'flv'
    ])
    .output(streamUrl)
    .on('start', () => {
      console.log('Live stream started!');
    })
    .on('end', () => {
      console.log('Stream ended');
    })
    .on('error', (err) => {
      console.error('Error:', err);
    });

  stream.run();
};

export { startStream };
