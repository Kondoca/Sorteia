# Sorteia: plataforma de sorteios

Aplicação web de sorteios no estilo "escolha seu número": o participante escolhe os números numa grade, paga via Pix (simulado) e acompanha o resultado. O organizador cria campanhas, confirma pagamentos e faz o sorteio pelo painel.

O diferencial é o **sorteio auditável**. O número vencedor é calculado com SHA-256 a partir de uma semente pública e da lista de números pagos, e qualquer pessoa pode refazer a conta na página do resultado.

![Página inicial](docs/home.png)

## Funcionalidades

**Participante**
- Lista de campanhas ativas e encerradas, com barra de progresso das vendas
- Grade de números com filtros (todos, livres, selecionados), busca e paginação
- Escolha automática de números (+1, +5, +10) usando `crypto.getRandomValues`
- Checkout com validação de nome, WhatsApp (com máscara) e e-mail
- Reserva dos números por 10 minutos, com contagem regressiva e expiração automática
- Tela de Pix com QR Code e código "copia e cola" (simulados)
- Consulta de participações pelo WhatsApp
- Página de ganhadores, com nome e telefone parcialmente ocultos (LGPD)

**Organizador (`/admin`)**
- Indicadores: valor arrecadado, números vendidos, Pix pendentes
- Criação de campanhas (prêmio, preço, quantidade de números, data, ícone e cor)
- Lista de pedidos com filtros e confirmação/cancelamento manual de pagamento
- Encerramento de vendas e sorteio com animação
- Botão para restaurar os dados de demonstração

**Regras de negócio**
- Um número não pode ser vendido duas vezes: o pedido é recusado se algum número for reservado por outra pessoa antes da confirmação
- Apenas números **pagos** participam do sorteio; reservas pendentes são canceladas no momento do sorteio

## Como o sorteio funciona

```
hash   = SHA-256(semente + ":" + números pagos em ordem crescente, separados por vírgula)
índice = (primeiros 15 dígitos hexadecimais do hash) mod (quantidade de números pagos)
vencedor = números_pagos_ordenados[índice]
```

A semente é gerada com `crypto.getRandomValues` no momento do sorteio e fica pública na página do resultado.

| Escolha dos números | Pagamento | Resultado verificável |
|---|---|---|
| ![](docs/campaign.png) | ![](docs/pix.png) | ![](docs/result.png) |

## Tecnologias

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router (HashRouter, para funcionar no GitHub Pages)
- Web Crypto API (SHA-256 e números aleatórios)
- Persistência em `localStorage` por meio de uma store reativa com `useSyncExternalStore`

## Rodando localmente

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Deploy

O workflow em `.github/workflows/deploy.yml` publica o site no GitHub Pages a cada push na branch `main`. Para ativar, vá em **Settings → Pages → Source: GitHub Actions**.

## Estrutura

```
src/
├── components/      # Layout, UI base, card de campanha, checkout
├── lib/
│   ├── store.ts     # dados, regras de negócio e algoritmo do sorteio
│   └── format.ts    # moeda, datas, máscaras, ocultação de dados
├── pages/           # Home, Sorteio, Meus números, Ganhadores, Resultado, Admin
└── types.ts
```

## Próximos passos (versão de produção)

- Backend (Node/Express ou Supabase) com banco de dados e reservas atômicas
- Integração real de Pix com webhook de confirmação (Mercado Pago, Efí, Asaas)
- Autenticação para o painel do organizador
- Notificação do ganhador por WhatsApp

## Aviso

Este é um projeto de portfólio. Nenhum pagamento é real e os dados ficam apenas no navegador. No Brasil, sorteios com venda de números precisam de autorização da Secretaria de Prêmios e Apostas do Ministério da Fazenda.
