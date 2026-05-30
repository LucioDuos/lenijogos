# Leni Jogos

Um pequeno portal de jogos em HTML, CSS e JavaScript. A página inicial permite escolher entre duas experiências:

- **Fogo e Água: Templo dos Desafios:** plataforma cooperativa com perigos elementais, cristais, placas, portões e elevadores.
- **Guardiões da Trilha:** jogo de estratégia e sobrevivência no qual moedas de inimigos derrotados são usadas para construir e melhorar defesas.

## Como executar

Sirva a pasta com um servidor estático:

```bash
python3 -m http.server 4173
```

Depois acesse `http://127.0.0.1:4173/`.

## Controles

### Fogo e Água

- **Fogo:** setas esquerda/direita para andar e seta para cima para pular.
- **Água:** A/D para andar e W para pular.
- Em telas menores, use os botões de toque abaixo do canvas.

### Guardiões da Trilha

- Clique em um campo circular vazio para construir um arqueiro ou canhão.
- Clique em uma defesa existente para melhorá-la ou vendê-la.
- Use o botão de onda quando estiver pronto para liberar os próximos inimigos.
