import { getTotalPlaytime } from './getMusicPlaytime';
import { mergeAudioFilesWithTransition } from './joinMusicFiles';
import { generateVideoWithFade } from './joinMusicWithImage';
import { generateTitleDescriptionTags, askForApproval, generateImageAndSave } from './generateNameDescription';
import { uploadVideoToYouTube } from './uploadToYoutube';
import chalk from 'chalk';
import * as fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import { addDays, format } from 'date-fns';

async function main() {
    const dir = './media/music/youtubeVideo';
    const outputAudioPath = './tmp/audio.mp3';
    const imagePath = './tmp/bg.png';
    const overlayPath = './tmp/overlay.png';
    const videoOutputPath = './tmp/videoOutput.mp4';
    const metadataPath = './tmp/metadata.json'; // Arquivo para salvar título, descrição e tags

    try {
        // 1. Valida a música e calcula o tempo total de reprodução
        console.log(chalk.blue('Validando as músicas...'));
        const totalDurationInSeconds = await getTotalPlaytime(dir);
        if(totalDurationInSeconds < 3600) {
          throw new Error(`Tempo total de reprodução muito curto: ${Math.floor(totalDurationInSeconds / 3600)}h ${Math.floor((totalDurationInSeconds % 3600) / 60)}m ${Math.floor(totalDurationInSeconds % 60)}s`)
        }
        console.log(chalk.green(`Tempo total de reprodução: ${Math.floor(totalDurationInSeconds / 3600)}h ${Math.floor((totalDurationInSeconds % 3600) / 60)}m ${Math.floor(totalDurationInSeconds % 60)}s`));

        let shouldGenerateAudio = true;
        let shouldGenerateVideo = true;
        let shouldGenerateImage = true;

        // 2. Pergunta se o arquivo de áudio já existe
        if (fs.existsSync(outputAudioPath)) {
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'generateAudio',
                    message: 'O arquivo de áudio já existe. Deseja gerar um novo?',
                    choices: ['Sim', 'Não']
                }
            ]);

            shouldGenerateAudio = answers.generateAudio === 'Sim';
        }

        // 3. Gera o arquivo de áudio se necessário
        if (shouldGenerateAudio) {
            console.log(chalk.blue('Gerando o arquivo de áudio...'));
            await mergeAudioFilesWithTransition(dir, outputAudioPath);
            console.log(chalk.green('Arquivo de áudio gerado com sucesso.'));
        } else if (!fs.existsSync(outputAudioPath)) {
            throw new Error('O arquivo de áudio não existe e a geração foi cancelada.');
        }

        // 4. Pergunta se a imagem já existe
        if (fs.existsSync(imagePath)) {
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'generateImage',
                    message: 'A imagem já existe. Deseja gerar uma nova?',
                    choices: ['Sim', 'Não']
                }
            ]);

            shouldGenerateImage = answers.generateImage === 'Sim';
        }

        // 5. Gera a imagem se necessário
        if (shouldGenerateImage) {
            console.log(chalk.blue('Gerando a imagem...'));
            await generateImageAndSave();
            console.log(chalk.green('Imagem gerada com sucesso.'));
        } else if (!fs.existsSync(imagePath)) {
            throw new Error('A imagem não existe e a geração foi cancelada.');
        }

        // 6. Pergunta se o vídeo já existe
        if (fs.existsSync(videoOutputPath)) {
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'generateVideo',
                    message: 'O arquivo de vídeo já existe. Deseja gerar um novo?',
                    choices: ['Sim', 'Não']
                }
            ]);

            shouldGenerateVideo = answers.generateVideo === 'Sim';
        }

        // 7. Gera o vídeo com a música e a imagem se necessário
        if (shouldGenerateVideo) {
            console.log(chalk.blue('Gerando o vídeo...'));
            await generateVideoWithFade({ audioPath: outputAudioPath, imagePath, outputPath: videoOutputPath, overlayPath });
            console.log(chalk.green('Vídeo gerado com sucesso.'));
        } else if (!fs.existsSync(videoOutputPath)) {
            throw new Error('O arquivo de vídeo não existe e a geração foi cancelada.');
        }

        let title = '', description = '', tags: string[] = [];

        // 8. Verifica se o arquivo de metadados já existe
        if (fs.existsSync(metadataPath)) {
            const savedMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            console.log(chalk.yellow('Metadados existentes encontrados:'));
            console.log(chalk.green(`Título: ${savedMetadata.title}`));
            console.log(chalk.green(`Descrição: ${savedMetadata.description}`));
            console.log(chalk.green(`Tags: ${savedMetadata.tags.join(', ')}`));

            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'generateMetadata',
                    message: 'Os metadados já existem. Deseja gerar novos?',
                    choices: ['Sim', 'Não']
                }
            ]);

            if (answers.generateMetadata === 'Não') {
                ({ title, description, tags } = savedMetadata);
            }
        }

        // 9. Gera novos metadados se necessário
        if (!title || !description || tags.length === 0) {
            let approved = false;
            do {
                const generated = await generateTitleDescriptionTags();
                approved = await askForApproval(generated);
                if (approved) {
                    title = generated.title;
                    description = generated.description;
                    tags = generated.tags;

                    // Salva os metadados gerados
                    fs.writeFileSync(metadataPath, JSON.stringify({ title, description, tags }, null, 2));
                    console.log(chalk.green('Metadados salvos em metadata.json.'));
                }
            } while (!approved);
        }

        // 10. Pergunta a data e hora da estreia
        const { publishDate } = await inquirer.prompt([
            {
                type: 'input',
                name: 'publishDate',
                message: 'Qual a data e hora da estreia? (ex: "2024-08-09 20:00:00")',
                default: format(addDays(new Date(), 7), 'yyyy-MM-dd HH:mm:ss'),
                validate: (input: string) => !isNaN(Date.parse(input)) || 'Por favor, insira uma data válida no formato "YYYY-MM-DD HH:MM:SS"',
            }
        ] as any);

        // 11. Faz o upload do vídeo para o YouTube
        console.log(chalk.blue('Fazendo upload do vídeo para o YouTube...'));
        await uploadVideoToYouTube({
            videoPath: videoOutputPath,
            title,
            description,
            tags,
            publishDate,
        });
        console.log(chalk.green('Vídeo enviado para o YouTube com sucesso.'));

    } catch (error) {
        console.error(chalk.red('Erro:', error.message));
    }
}

main().catch(err => console.error(chalk.red('Erro:', err)));
