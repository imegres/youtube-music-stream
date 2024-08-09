import { promises as fs } from 'fs';
import * as path from 'path';
import * as mm from 'music-metadata';
import * as crypto from 'crypto';
import chalk from 'chalk';

async function getMp3Files(dir: string): Promise<string[]> {
    const files = await fs.readdir(dir);
    const mp3Files = files.filter(file => path.extname(file) === '.mp3');
    return mp3Files.map(file => path.join(dir, file));
}

async function getFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

export async function getTotalPlaytime(dir: string): Promise<number> {
    const mp3Files = await getMp3Files(dir);
    let totalDuration = 0;
    const hashMap: { [hash: string]: string[] } = {};

    for (const file of mp3Files) {
        const metadata = await mm.parseFile(file);

        // Verificação de duração máxima
        const durationInSeconds = metadata.format.duration || 0;
        if (durationInSeconds > 239) { // 239 segundos = 3 minutos e 59 segundos
            console.error(chalk.red(`Erro: O arquivo ${file} tem duração acima de 3 minutos e 59 segundos.`));
            throw new Error(`O arquivo ${file} tem duração acima de 3 minutos e 59 segundos.`);
        }

        // Calcular o hash do arquivo para identificar duplicatas
        const fileHash = await getFileHash(file);
        if (hashMap[fileHash]) {
            hashMap[fileHash].push(file);
        } else {
            hashMap[fileHash] = [file];
        }

        totalDuration += durationInSeconds;
    }

    // Identificação de duplicatas
    for (const hash in hashMap) {
        if (hashMap[hash].length > 1) {
            console.error(chalk.red(`Erro: Arquivos duplicados encontrados: ${hashMap[hash].join(', ')}`));
            throw new Error(`Arquivos duplicados encontrados: ${hashMap[hash].join(', ')}`);
        }
    }

    // Subtrai o tempo das transições
    const numTransitions = mp3Files.length - 1;
    const transitionDuration = 5; // 5 segundos de transição
    const totalLostTime = numTransitions * transitionDuration;

    return totalDuration - totalLostTime;
}
