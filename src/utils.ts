import * as fs from 'fs';
import * as path from 'path';

export const getRandomTrack = (directory: string): string => {
  const files = fs.readdirSync(directory);
  const mp3Files = files.filter(file => file.endsWith('.mp3'));
  if (mp3Files.length === 0) {
    throw new Error('No mp3 files found in the directory.');
  }
  const randomIndex = Math.floor(Math.random() * mp3Files.length);
  return path.join(directory, mp3Files[randomIndex]);
};
