#!/bin/bash

# Diretório base das músicas
BASE_DIR="$(pwd)/media"

# Diretório das músicas conformadas
MUSIC_DIR="$BASE_DIR/conformed"

# Caminho absoluto do input.txt
OUTPUT_FILE="$BASE_DIR/input.txt"

# Cria o diretório de músicas conformadas, se não existir
mkdir -p "$MUSIC_DIR"

# Verifica se há arquivos MP3 no diretório base
mp3_files=$(ls "$BASE_DIR"/music/*.mp3 2> /dev/null)
if [ -z "$mp3_files" ]; then
  echo "Erro: Não foram encontrados arquivos MP3 no diretório $BASE_DIR."
  exit 1
fi

# Prepara arquivos de áudio
for f in "$BASE_DIR"/music/*.mp3; do
  ffmpeg -y -i "$f" -map 0:a -ac 2 -ar 44100 -c:a aac "$MUSIC_DIR/$(basename "${f%.*}").mp3"
done

# Verifica se o diretório de músicas conformadas contém arquivos mp3
mp3_files=$(ls "$MUSIC_DIR"/*.mp3 2> /dev/null)
if [ -z "$mp3_files" ]; then
  echo "Erro: Nenhum arquivo mp3 foi encontrado no diretório $MUSIC_DIR."
  exit 1
fi

# Cria ou limpa o arquivo input.txt
echo "ffconcat version 1.0" > "$OUTPUT_FILE"

# Adiciona cada arquivo de música ao input.txt
for file in "$MUSIC_DIR"/*.mp3; do
  if [ -e "$file" ]; then
    echo "file '$file'" >> "$OUTPUT_FILE"
  else
    echo "Erro: O arquivo $file não existe ou não pode ser acessado."
    exit 1
  fi
done

echo "Arquivo input.txt criado com sucesso."
