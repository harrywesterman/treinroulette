# Treinroulette

Mobiele webapp voor een treinreis-side-questspel. Spelers kunnen een spelcode delen, stemmen op een modus, quests afvinken en de spelstatus per code bewaren.

## Lokaal draaien

```bash
node server.js
```

Open daarna:

```text
http://localhost:3000
```

## Docker

```bash
docker compose up -d --build
```

De app draait op:

```text
http://localhost:8031
```

## Serverstate

Spelstatus wordt per viercijferige code opgeslagen via de API:

```text
/api/games/:code
```

In Docker wordt deze status bewaard in het volume `treinroulette_data`.
