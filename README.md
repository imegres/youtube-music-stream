Cria pasta music

echo "ffconcat version 1.0" > playlist.txt
for file in media/music/*.mp3; do
  echo "file '$(pwd)/$file'" >> playlist.txt
done


# Gera playlist.txt
#!/bin/bash

# Diretório das músicas conformadas
MUSIC_DIR="media/music"

# Caminho absoluto do playlist.txt
OUTPUT_FILE="$(pwd)/playlist.txt"

# Cria ou limpa o arquivo playlist.txt
echo "ffconcat version 1.0" > $OUTPUT_FILE

# Adiciona cada arquivo de música ao playlist.txt
for file in $MUSIC_DIR/*.mp3; do
  echo "file '$(pwd)/$file'" >> $OUTPUT_FILE
done

echo "Arquivo playlist.txt criado com sucesso."
