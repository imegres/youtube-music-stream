import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

const mediaDir = path.join(__dirname, '..', 'media');
const musicDir = path.join(mediaDir, 'conformed'); // Usar a pasta com arquivos processados
const background = path.join(mediaDir, 'bg.mp4'); // Use bg.png para imagem de fundo
const inputTxtPath = path.join(mediaDir, 'input.txt');

let stream: ffmpeg.FfmpegCommand | null = null;

const createPlaylistFile = (directory) => {
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.m4a'));
  const playlistContent = 'ffconcat version 1.0\n' + files.map(file => `file '${path.join(directory, file)}'`).join('\n');
  console.log('Playlist content:', playlistContent); // Adicionado log
  fs.writeFileSync(inputTxtPath, playlistContent, 'utf8');
};

const startStream = (streamUrl: string) => {
  createPlaylistFile(musicDir);

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
