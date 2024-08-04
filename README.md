Cria pasta conformed

echo "ffconcat version 1.0" > input.txt
for file in media/conformed/*.m4a; do
  echo "file '$(pwd)/$file'" >> input.txt
done


# Gera input.txt
#!/bin/bash

# Diretório das músicas conformadas
MUSIC_DIR="media/conformed"

# Caminho absoluto do input.txt
OUTPUT_FILE="$(pwd)/input.txt"

# Cria ou limpa o arquivo input.txt
echo "ffconcat version 1.0" > $OUTPUT_FILE

# Adiciona cada arquivo de música ao input.txt
for file in $MUSIC_DIR/*.m4a; do
  echo "file '$(pwd)/$file'" >> $OUTPUT_FILE
done

echo "Arquivo input.txt criado com sucesso."
