import OpenAI from 'openai';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Carregar os prompts do arquivo JSON
const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompts.json'), 'utf8'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Certifique-se de definir esta variável de ambiente
});

// Função para gerar a imagem e salvar localmente
export async function generateImageAndSave(): Promise<void> {
  const imageGeneratePrompt = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ "role": "system", content: prompts.imagePromptGenerate }],
    max_tokens: 100,
  });
  console.log('Image Prompt', `${imageGeneratePrompt.choices[0].message.content}`)
  const response = await openai.images.generate({
    prompt: `${imageGeneratePrompt.choices[0].message.content}`,
    n: 1, 
    model: "dall-e-3",
    size: "1792x1024",
  });

  console.log()
  const imageUrl = response.data[0].url;

  // Baixar e salvar a imagem
  const imagePath = path.join(process.cwd(), 'tmp', 'bg.png');
  const writer = fs.createWriteStream(imagePath);
  
  const imageResponse = await axios({
    url: imageUrl,
    method: 'GET',
    responseType: 'stream',
  });

  imageResponse.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log(chalk.green(`Imagem gerada e salva em ${imagePath}`));
      resolve();
    });
    writer.on('error', (err) => {
      console.error(chalk.red('Erro ao salvar a imagem:'), err);
      reject(err);
    });
  });
}

// Funções existentes
export async function generateTitleDescriptionTags(): Promise<{ title: string, description: string, tags: string[] }> {
  // Gera título, descrição e tags usando a API da OpenAI
  const titleResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ "role": "system", content: prompts.titlePrompt }],
    max_tokens: 200,
  });
  const title = titleResponse.choices[0].message.content?.trim().replaceAll("\"", "") || '';

  const descriptionResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ "role": "system", content: prompts.descriptionPrompt }],
    max_tokens: 400,
  });
  const description = descriptionResponse.choices[0].message.content?.trim().replaceAll("\"", "") || '';

  const tagsResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ "role": "system", content: prompts.tagsPrompt }],
    max_tokens: 200,
  });
  const tags = tagsResponse.choices[0].message.content?.trim().replaceAll("\"", "").split(',') || [];

  return { title, description, tags };
}

export async function askForApproval({ title, description, tags }: { title: string, description: string, tags: string[] }): Promise<boolean> {
  console.log(`\n${chalk.blue('Título Gerado:')} ${chalk.green(title)}`);
  console.log(`${chalk.blue('Descrição Gerada:')} ${chalk.green(description)}`);
  console.log(`${chalk.blue('Tags Geradas:')} ${chalk.green(tags.join(', '))}\n`);

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'approved',
      message: 'Você gostou das tags, descrição e título gerados?',
      default: true,
    }
  ]);

  return answers.approved;
}
