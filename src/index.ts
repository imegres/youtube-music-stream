import 'dotenv/config';
import { startStream } from './streamer';

const streamUrl = process.env.YOUTUBE_STREAM_URL;

if (!streamUrl) {
  throw new Error('YouTube stream URL is not defined in the .env file.');
}

startStream(streamUrl);
