import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import chalk from 'chalk';

function convertTimemarkToSeconds(timemark: string): number {
    const parts = timemark.split(':');
    const hours = parseFloat(parts[0]) * 3600;
    const minutes = parseFloat(parts[1]) * 60;
    const seconds = parseFloat(parts[2]);
    return hours + minutes + seconds;
}

export async function generateVideoWithFade({
    audioPath,
    imagePath,
    outputPath,
    overlayPath
}: {
    audioPath: string;
    imagePath: string;
    outputPath: string;
    overlayPath?: string;
}) {
    const duration = await getAudioDuration(audioPath);
    const startTime = Date.now();

    return new Promise<void>((resolve, reject) => {
        const ffmpegCommand = ffmpeg().setFfmpegPath(ffmpegPath!)
            .input(imagePath)
            .loop(duration) // Loop da imagem para toda a duração do áudio
            .input(audioPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-pix_fmt yuv420p', // Formato de cor para compatibilidade
                '-s', '2560x1440', // Resolução 1440p
                '-c:a', 'aac', // Codec de áudio
                '-b:a', '192k', // Bitrate de áudio
                '-shortest' // Garante que o vídeo não seja mais longo que o áudio
            ]);

        let filters = `fade=in:0:150,fade=out:${Math.floor((duration - 5) * 30)}:150`;

        // Verifica se a imagem overlay.png existe
        if (overlayPath && fs.existsSync(overlayPath)) {
            ffmpegCommand.input(overlayPath);
            const padding = 20; // Padding de 20 pixels
            filters = `[2:v]scale=iw*1.2:ih*1.2[scaled];[0:v][scaled]overlay=(main_w-overlay_w-${padding}):${padding},${filters}`;
        } else {
            console.log(chalk.yellow('Aviso: overlay.png não encontrado, prosseguindo sem sobreposição de imagem.'));
        }

        ffmpegCommand
            .complexFilter(filters)
            .on('progress', (progress) => {
                const currentTimeInSeconds = convertTimemarkToSeconds(progress.timemark);
                if (currentTimeInSeconds > 0 && duration > 0) {
                    const percentage = (currentTimeInSeconds / duration) * 100;
                    const elapsedTime = (Date.now() - startTime) / 1000; // Tempo decorrido em segundos
                    const estimatedTotalTime = (elapsedTime / percentage) * 100; // Estimação do tempo total
                    const remainingTime = estimatedTotalTime - elapsedTime; // Tempo restante
                    const finishTime = new Date(Date.now() + remainingTime * 1000); // Horário estimado de finalização

                    process.stdout.write(chalk.blueBright(
                        `Progresso: ${percentage.toFixed(2)}% | Tempo restante: ${formatTime(remainingTime)} | Finalização estimada: ${finishTime.toLocaleTimeString()}\r`
                    ));
                } else {
                    process.stdout.write(chalk.blueBright(`Progresso: 0.00%\r`));
                }
            })
            .on('end', () => {
                console.log(chalk.green('\nVídeo gerado com sucesso.'));
                resolve();
            })
            .on('error', (err) => {
                console.error(chalk.red('Erro ao gerar o vídeo:'), err);
                reject(err);
            })
            .save(outputPath);
    });
}

function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata?.format?.duration || 0);
        });
    });
}
