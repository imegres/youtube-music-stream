
import { google } from 'googleapis';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import path from 'path';

// Caminho para o arquivo de credenciais OAuth 2.0
const CLIENT_SECRETS_PATH = path.join(__dirname, 'auth.json'); // Substitua pelo caminho do seu arquivo OAuth 2.0

async function authenticate() {
    const { client_id, client_secret, redirect_uris } = JSON.parse(fs.readFileSync(CLIENT_SECRETS_PATH, 'utf8')).installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Verifique se já temos um token armazenado
    const TOKEN_PATH = path.join(__dirname, 'token.json');
    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
    } else {
        // Se não houver token, solicitar permissão ao usuário
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/youtube.upload'],
        });

        console.log('Authorize this app by visiting this url:', authUrl);
        const { code } = await inquirer.prompt([
            {
                type: 'input',
                name: 'code',
                message: 'Enter the code from that page here: ',
            },
        ]);

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Armazene o token para reutilização futura
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);
    }

    return oAuth2Client;
}

export async function uploadVideoToYouTube({
    videoPath,
    title,
    description,
    tags,
    publishDate,
}: {
    videoPath: string;
    title: string;
    description: string;
    tags: string[];
    publishDate: string;
}) {
    const authClient = await authenticate();

    const youtube = google.youtube({
        version: 'v3',
        auth: authClient,
    });

    const fileSize = fs.statSync(videoPath).size;

    const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        notifySubscribers: true,
        requestBody: {
            snippet: {
                title,
                description,
                tags,
            },
            status: {
                privacyStatus: 'private',
                publishAt: new Date(publishDate).toISOString(),
            },
        },
        media: {
            body: fs.createReadStream(videoPath),
        },
    }, {
        onUploadProgress: (event) => {
            const progress = (event.bytesRead / fileSize) * 100;
            process.stdout.write(chalk.blueBright(`Progresso do upload: ${progress.toFixed(2)}%\r`));
        },
    });

    console.log(chalk.green(`\nUpload concluído: ${response.data.id}`));
}
