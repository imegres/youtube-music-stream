import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';

const mediaDir = path.join(__dirname, '..', 'media');
const musicDir = path.join(mediaDir, 'music'); // Usar a pasta com arquivos processados
const background = path.join(mediaDir, 'video/bg.mp4'); // Use bg.png para imagem de fundo

let stream: ffmpeg.FfmpegCommand | null = null;

const getShuffledPlaylist = () => {
  const files = fs.readdirSync(musicDir).filter(file => file.endsWith('.mp3'));
  for (let i = files.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [files[i], files[j]] = [files[j], files[i]];
  }
  return files;
};

const startStream = async (streamUrl: string) => {
  const playlist = getShuffledPlaylist();

  console.log('Playlist:', playlist);

  stream = ffmpeg().setFfmpegPath(ffmpegPath);

  // Adiciona o background e define o loop
  stream.addInput(background).inputOptions(['-stream_loop', '-1']);

  // Adiciona cada arquivo da playlist como input
  playlist.forEach(file => {
    const filePath = path.join(musicDir, file);
    stream.addInput(filePath).inputOptions(['-re']);
  });

  const crossfadeDuration = 5; // duração do crossfade em segundos
  let filterGraph = [];

  // Adicionar filtros de crossfade e concatenar
  let currentAudio = '[1:a]';
  for (let i = 1; i < playlist.length; i++) {
    filterGraph.push(`[${i}:a][${i + 1}:a]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[a${i}]`);
    currentAudio = `[a${i}]`;
  }

  stream
    .complexFilter(filterGraph)
    .outputOptions([
      '-map', '0:v',
      '-map', currentAudio,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'slow',
      '-tune', 'stillimage',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-f', 'flv',
      '-g', '48', // Definindo a frequência de frame-chave para 48 frames (para 2 segundos a 24fps)
      '-keyint_min', '48', // Configura o mínimo de intervalos de frame-chave para 48 frames
    ])
    .output(streamUrl)
    .on('start', () => {
      console.log('Live stream started!');
    })
    .on('end', () => {
      console.log('Stream ended');
    })
    .on('error', (err, stdout, stderr) => {
      console.error('Error:', err);
      console.error('ffmpeg stdout:', stdout);
      console.error('ffmpeg stderr:', stderr);
    });

  stream.run();
};

export { startStream };
