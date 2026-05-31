# Leni Jogos

Portal de jogos em HTML, CSS e JavaScript com autenticação PHP, persistência MySQL e suporte WebSocket para partidas online do Worms.

## Jogos

- **Fogo e Água:** plataforma cooperativa com cristais, perigos e portais.
- **Guardiões da Trilha:** tower defense com torres, melhorias, ondas sobrepostas e chefes.
- **Cobrinha Gulosa:** arcade clássico com recorde persistente.
- **Mesa de Sequências:** jogo inspirado em Rummikub com oponentes controlados pelo computador.
- **Worms:** artilharia por turnos entre times de minhocas com terreno destrutível, obstáculos, salto curto, nove armas e modo online.

## Banco de dados e login

O portal exige cadastro com **celular**, **apelido** e **senha**. O login utiliza celular e senha. As senhas dos jogadores são armazenadas somente como hash por `password_hash()` e os tokens de sessão também são persistidos como hash.

1. Importe `db/schema.sql` no banco MySQL.
2. Configure as variáveis de ambiente descritas em `.env.example` no servidor PHP.
3. Não versione senhas reais em `.env` ou em arquivos PHP.
4. Sirva o diretório usando PHP, por exemplo:

```bash
php -S 127.0.0.1:4173
```

Depois acesse `http://127.0.0.1:4173/`.

A API registra progresso por jogo, acessos, tempo de permanência, vitórias, derrotas e ranking agregado. O frontend compartilhado está em `portal-client.js`.

## WebSocket do Worms

O modo online usa tokens temporários assinados pela API. Para iniciar o servidor WebSocket:

```bash
cd realtime
npm install
JOGOS_WS_SECRET='o-mesmo-segredo-configurado-no-PHP' npm start
```

Em produção, configure `JOGOS_WS_URL` com uma URL `wss://` protegida por TLS.

## Controles

### Fogo e Água
- **Fogo:** setas esquerda/direita e seta para cima.
- **Água:** A/D e W.

### Guardiões da Trilha
- Clique nos campos circulares para construir, melhorar ou vender torres.
- Use próxima onda, velocidades 1x/2x/3x, som e tela cheia sobre o mapa.
- Após limpar a trilha, uma nova onda começa automaticamente em cinco segundos.

### Cobrinha Gulosa
- Use as setas ou WASD. No mobile, use os botões direcionais.

### Mesa de Sequências
- Escolha jogadores e dificuldade, selecione combinações válidas ou compre uma peça.

### Worms
- Use A/D para mover a minhoca, W para um salto curto e ↑/↓ para mirar.
- Selecione uma das nove armas ou use Q para alternar o arsenal.
- Segure espaço para carregar o tiro e solte para disparar.
- No mobile, use os controles dentro da área do jogo.
- Clique em **Jogar online** para procurar outro usuário autenticado via WebSocket.
