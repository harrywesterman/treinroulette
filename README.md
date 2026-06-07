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

## Stations en GPS

De app gebruikt GPS via de browser. Voor de stationslijst gebruikt de server:

1. de NS Stations API als `NS_API_KEY` is ingesteld
2. een ingebouwde fallbacklijst met Nederlandse stations als er geen key is

Maak optioneel een `.env` bestand:

```bash
NS_API_KEY=je_ns_api_key
```

Start daarna opnieuw:

```bash
docker compose up -d --build
```
