import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

const mediaDir = path.join(__dirname, '..', 'media');
const musicDir = path.join(mediaDir, 'conformed'); // Usar a pasta com arquivos processados
const background = path.join(mediaDir, 'bg.mp4'); // Use bg.png para imagem de fundo
const inputTxtPath = path.join(mediaDir, 'input.txt');

let stream: ffmpeg.FfmpegCommand | null = null;

const createPlaylistFile = (directory: string, repetitions = 20) => {
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.m4a'));
  let playlistContent = 'ffconcat version 1.0\n';

  for (let i = 0; i < repetitions; i++) {
    playlistContent += files.map(file => `file '${path.join(directory, file)}'`).join('\n') + '\n';
  }

  console.log('Playlist content:', playlistContent); // Adicionado log
  fs.writeFileSync(path.join(directory, 'input.txt'), playlistContent, 'utf8');
};

const startStream = (streamUrl: string) => {
  createPlaylistFile(musicDir, 30);

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
