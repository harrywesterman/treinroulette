# Treinroulette deployen

## DNS

Zet een DNS-record voor:

```text
treinroulette.westermanonline.com
```

naar het publieke IP-adres van je server. Gebruik meestal een `A` record voor IPv4 en eventueel een `AAAA` record voor IPv6.

## Poort

De container luistert op hostpoort `8031` en bewaart spelstatus in het Docker volume `treinroulette_data`.

Gebruik je een bestaande reverse proxy voor `https://treinroulette.westermanonline.com`, stuur die dan door naar:

```text
http://127.0.0.1:8031
```

## Starten

Upload deze map naar je server en draai:

```bash
docker compose up -d --build
```

De app draait daarna op:

```text
http://server-ip:8031
```

Met je reverse proxy is hij bereikbaar op `https://treinroulette.westermanonline.com`.

## Logs bekijken

```bash
docker compose logs -f
```

## Updaten

Na nieuwe bestanden uploaden:

```bash
docker compose up -d --build
```
