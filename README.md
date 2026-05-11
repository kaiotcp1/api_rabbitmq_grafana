# Order Integration Hub

![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=for-the-badge&logo=fastify&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-2.51-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-10.4-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-local-2496ED?style=for-the-badge&logo=docker&logoColor=white)

Projeto que simula uma plataforma de integração de pedidos de e-commerce: a API recebe pedidos, persiste no MongoDB, publica eventos no RabbitMQ, um worker processa a fila simulando integração com ERP e a operação é monitorada com Prometheus e Grafana.

O objetivo é demonstrar, em um fluxo executável, conceitos de mensageria, DLQ, retry, Clean Architecture, observabilidade e operação local com Docker Compose.

## Visão Geral

```text
Cliente HTTP
    |
    v
Fastify API  --->  MongoDB
    |
    v
RabbitMQ exchange: orders
    |
    v
Queue: orders.processing  --->  Processor / Consumer  --->  ERP simulado
    |                                  |
    |                                  v
    |                              MongoDB
    v
DLQ: orders.dead

API / Processor ---> Prometheus ---> Grafana
```

**Fluxo principal**

1. `POST /api/v1/orders` cria um pedido com status `pending`.
2. A API calcula `totalAmount`, grava no MongoDB e publica a mensagem em `orders`.
3. O processor consome `orders.processing` com `prefetch(1)`.
4. Em sucesso, o pedido vira `processed` e a mensagem recebe `ack`.
5. Em falha recuperável, o processor marca `failed`, publica retry com `attempt + 1` e dá `ack` na mensagem original.
6. Ao estourar `PROCESSOR_MAX_ATTEMPTS`, o pedido vira `dead_letter` e a mensagem vai para `orders.dead`.
7. API e processor expõem métricas para Prometheus, visualizadas no dashboard do Grafana.

## Screenshots

| Grafana: visão operacional | Grafana: retries e DLQ |
|---|---|
| ![Dashboard Grafana com throughput, latência e memória](docs/images/grafana_1.png) | ![Dashboard Grafana evidenciando retries e DLQ](docs/images/grafana_3.png) |

| Prometheus targets | RabbitMQ Management |
|---|---|
| ![Prometheus com targets api e processor em estado UP](docs/images/prometheus_1.png) | ![RabbitMQ Management com filas, taxas e mensagens acumuladas](docs/images/rabbitmq_1.png) |

Mais prints do dashboard estão em [`docs/images`](docs/images).

## Stack

| Camada | Tecnologia | Papel |
|---|---|---|
| API | Fastify + TypeScript | Producer HTTP, validação, persistência e publicação de eventos |
| Worker | Node.js + TypeScript | Consumer RabbitMQ, retry, DLQ e simulação de ERP |
| Banco | MongoDB | Persistência dos pedidos e status do processamento |
| Broker | RabbitMQ | Exchange, queue, routing key, ack/nack e dead letter |
| Métricas | prom-client + Prometheus | Coleta de métricas da API e do processor |
| Dashboard | Grafana | Visualização de throughput, falhas, DLQ, latência e memória |
| Runtime local | Docker Compose | Orquestração completa da stack |

## Funcionalidades

- API REST com `POST /api/v1/orders`, `GET /api/v1/orders/:id` e `GET /health`.
- Validação de payload com TypeBox.
- Clean Architecture em `api` e `processor`.
- MongoDB com repositories e mappers.
- RabbitMQ com exchange `topic`, queue principal e DLQ.
- Mensagens persistentes (`persistent: true`).
- Consumer com `prefetch(1)`, `ack`, `nack`, retry manual e limite de tentativas.
- ERP simulado com falhas aleatórias e falhas determinísticas por payload.
- Métricas customizadas e métricas padrão de Node.js.
- Dashboard Grafana provisionado automaticamente.
- Script de carga para gerar pedidos e testar throughput, retry e DLQ.

## Como Rodar

Pré-requisitos:

- Docker e Docker Compose
- Node.js 22+ para rodar o script de carga fora dos containers

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Serviços locais:

| Serviço | URL | Credenciais |
|---|---|---|
| API | `http://localhost:3001` | - |
| API metrics | `http://localhost:9101/metrics` | - |
| Processor metrics | `http://localhost:9102/metrics` | - |
| RabbitMQ Management | `http://localhost:15672` | `admin` / `123456789` |
| Prometheus | `http://localhost:9090` | - |
| Grafana | `http://localhost:3000` | `admin` / `123456789` |
| MongoDB | `localhost:27017` | `admin` / `123456789` |

Teste rápido:

```powershell
curl http://localhost:3001/health

curl -X POST http://localhost:3001/api/v1/orders `
  -H "Content-Type: application/json" `
  -d "{\"customerId\":\"customer-001\",\"source\":\"shopify\",\"items\":[{\"sku\":\"SKU-IPHONE-15\",\"qty\":1,\"price\":4899.9}]}"
```

Gerar carga:

```powershell
node scripts/create-random-orders.js --count 200 --failure-rate 0.35 --concurrency 15
docker compose logs -f processor
```

## Documentação

- [Rotas, payloads e exemplos de teste](docs/api/README.md)
- [Observabilidade, métricas, PromQL e prints](docs/observability/README.md)
- [Plano original do projeto](project.md)
- [Contexto técnico usado na preparação](contexto-entrevista-integrado.md)
- [Perguntas e respostas de revisão técnica](perguntas-entrevista-integrado.md)

## Estrutura

```text
api-mq-grafana/
|-- api/                         # Fastify API / producer
|   `-- src/
|       |-- domain/
|       |-- application/
|       |-- infra/
|       `-- main/
|-- processor/                   # Worker / RabbitMQ consumer
|   `-- src/
|       |-- domain/
|       |-- application/
|       |-- infra/
|       `-- main/
|-- infra/
|   |-- prometheus/
|   `-- grafana/
|-- scripts/
|   `-- create-random-orders.js
|-- docs/
|   |-- api/
|   |-- observability/
|   `-- images/
`-- docker-compose.yml
```

## Métricas Principais

| Métrica | Serviço | Descrição |
|---|---|---|
| `orders_published_total{source}` | API | Pedidos publicados no RabbitMQ |
| `http_request_duration_seconds` | API | Latência HTTP por método, rota e status |
| `orders_processed_total{source}` | Processor | Pedidos processados com sucesso |
| `orders_retried_total{source}` | Processor | Retries publicados pelo consumer |
| `orders_failed_total{reason}` | Processor | Falhas definitivas ou payloads inválidos |
| `order_processing_duration_seconds` | Processor | Tempo de processamento de mensagens |

## Decisões Técnicas

- **Fila entre API e processor:** desacopla entrada HTTP do processamento externo, evitando prender a requisição ao tempo do ERP.
- **DLQ:** mantém mensagens problemáticas inspecionáveis em vez de descartá-las silenciosamente.
- **Retry manual:** deixa o número de tentativas explícito no payload para facilitar estudo e depuração.
- **Clean Architecture:** separa regra de negócio, contratos e infraestrutura, facilitando testes e troca de adapters.
- **Prometheus + Grafana:** permite observar taxa, latência, retries, falhas e saúde dos processos em tempo real.

## Próximas Melhorias

- Implementar Outbox Pattern para reduzir o risco entre salvar no MongoDB e publicar no RabbitMQ.
- Adicionar correlation ID ponta a ponta em HTTP, mensagem e logs.
- Evoluir retry com backoff usando TTL + DLX ou delayed exchange.
- Criar testes unitários para use cases e testes de integração com MongoDB/RabbitMQ.
- Adicionar métricas nativas do RabbitMQ via exporter.
- Criar pipeline de CI com build, lint e testes.

## Autor

Desenvolvido por **Kaio Pasqualinotto** como projeto prático de estudo e portfólio em Node.js, TypeScript, mensageria e observabilidade.
