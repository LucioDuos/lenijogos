# Leni Jogos

Um portal de jogos em HTML, CSS e JavaScript. A página inicial permite escolher entre quatro experiências:

- **Fogo e Água: Templo dos Desafios:** plataforma cooperativa com perigos elementais, cristais, placas, portões e elevadores.
- **Guardiões da Trilha:** tower defense com mapa detalhado, quatro tipos de torre, melhorias, moedas, ondas sobrepostas, chefes, partículas e controle de velocidade.
- **Cobrinha Gulosa:** arcade clássico no qual a cobrinha cresce e acelera conforme come frutas.
- **Mesa de Sequências:** jogo de peças inspirado em Rummikub, com seleção de dificuldade e até três oponentes controlados pelo computador.

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

- Clique em um campo circular vazio para abrir o menu radial e construir um arqueiro, canhão, torre mágica ou torre congelante.
- Clique em uma defesa existente para abrir o menu de melhoria, venda e informações dentro do mapa.
- Use o botão de próxima onda a qualquer momento: novas criaturas entram mesmo quando já existem inimigos na trilha. Quando todos forem eliminados, a próxima onda começa automaticamente após uma contagem regressiva de cinco segundos.
- Use os comandos sobre o mapa para iniciar ondas, alternar entre velocidades 1x, 2x e 3x, controlar o som e ativar a tela cheia. Chefes aparecem a cada cinco ondas.

### Cobrinha Gulosa

- Use as setas ou as teclas WASD para mudar de direção.
- Em telas sensíveis ao toque, use os botões direcionais ao lado do tabuleiro.

### Mesa de Sequências

- Antes da partida, escolha a quantidade de jogadores e a dificuldade dos computadores.
- Clique nas peças do seu suporte para selecionar uma sequência ou um grupo válido.
- Baixe a seleção ou compre uma peça para encerrar seu turno.
