import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import chalk from 'chalk';

async function getMp3Files(dir: string): Promise<string[]> {
    const files = fs.readdirSync(dir);
    return files.filter(file => path.extname(file) === '.mp3').map(file => path.join(dir, file));
}

export async function mergeAudioFilesWithTransition(dir: string, outputFilePath: string) {
    const mp3Files = await getMp3Files(dir);

    if (mp3Files.length === 0) {
        throw new Error(chalk.red('No MP3 files found in the directory.'));
    }

    const transitionDuration = 5;

    const ffmpegCommand = ffmpeg().setFfmpegPath(ffmpegPath!);

    // Adiciona os arquivos de áudio como entradas
    mp3Files.forEach((file) => {
        ffmpegCommand.input(file);
    });

    // Constrói o filtro complexo para aplicar transições
    let filterComplex = '';
    for (let i = 0; i < mp3Files.length - 1; i++) {
        if (i === 0) {
            filterComplex += `[0:a][1:a]acrossfade=d=${transitionDuration}[a1]`;
        } else {
            filterComplex += `; [a${i}][${i + 1}:a]acrossfade=d=${transitionDuration}[a${i + 1}]`;
        }
    }

    // Mapeia a saída final para garantir que o último arquivo seja incluído
    const finalMap = `[a${mp3Files.length - 1}]`;

    const duration = await getAudioDuration(mp3Files);

    return new Promise<void>((resolve, reject) => {
        ffmpegCommand
            .complexFilter(filterComplex)
            .outputOptions(['-map', finalMap])
            .output(outputFilePath)
            .on('progress', (progress) => {
                const currentTimeInSeconds = convertTimemarkToSeconds(progress.timemark);
                if (currentTimeInSeconds > 0 && duration > 0) {
                    const percentage = (currentTimeInSeconds / duration) * 100;
                    process.stdout.write(chalk.blueBright(`Progresso: ${percentage.toFixed(2)}%\r`));
                } else {
                    process.stdout.write(chalk.blueBright(`Progresso: 0.00%\r`));
                }
            })
            .on('end', () => {
                console.log(chalk.green('\nAudio files merged successfully.'));
                resolve();
            })
            .on('error', (err) => {
                console.error(chalk.red('Error merging audio files:'), err);
                reject(err);
            })
            .run();
    });
}

function convertTimemarkToSeconds(timemark: string): number {
    const parts = timemark.split(':');
    const hours = parseFloat(parts[0]) * 3600;
    const minutes = parseFloat(parts[1]) * 60;
    const seconds = parseFloat(parts[2]);
    return hours + minutes + seconds;
}

async function getAudioDuration(mp3Files: string[]): Promise<number> {
    let totalDuration = 0;

    for (const file of mp3Files) {
        const metadata = await new Promise<any>((resolve, reject) => {
            ffmpeg.ffprobe(file, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });

        if (metadata && metadata.format && metadata.format.duration) {
            totalDuration += metadata.format.duration;
        } else {
            console.warn(chalk.yellow(`Could not get duration for file: ${file}`));
        }
    }

    return totalDuration;
}
