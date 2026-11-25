# cacentrp (Java)

Institutional **Java** port of modern CAC Enterprise — use this when **Node.js is not allowed**.

Talks to IBM i / AS400 with **JT400 JDBC** (no Node, no ODBC bridge required). The TypeScript tree under `../cacentrp` remains the reference for pipeline logic still being migrated.

## Requirements

- JDK **17+**
- Maven 3.8+
- For real login: network reachability to AS400 + JT400 (bundled in the fat JAR)

## Build

```bash
cd modern/cacentrp-java
mvn -q test package
```

Artifact: `target/cacentrp.jar`

## Run (mock — no AS400)

```bash
java -jar target/cacentrp.jar --variant AP --db mock --user DEMO --password demo
java -jar target/cacentrp.jar daily list
java -jar target/cacentrp.jar daily endofday --seed-ledger
```

## Run (real AS400 login)

```bash
set CAC_DB=jdbc
set CAC_AS400_HOST=your.as400.example
rem optional per-profile overrides:
set CAC_JDBC_CACDB=jdbc:as400://your.as400.example/CACDB;naming=system;errors=full
set CAC_JDBC_APMODDTA=jdbc:as400://your.as400.example/APMODDTA;naming=system;errors=full
set CAC_JDBC_RAWDATA=jdbc:as400://your.as400.example/RAWDATA;naming=system;errors=full

java -jar target/cacentrp.jar --variant AP --db jdbc --user YOURUSER --password YOURPASS
```

AP login connects **CACDB → APMODDTA → RAWDATA**, then `SELECT … FROM SYRUSERID`.

See [`docs/deploy-java.md`](../../docs/deploy-java.md).

## Status

| Area | Java status |
|------|-------------|
| Login + INI + mock/JDBC | Done |
| End of Day (in-memory) | Done |
| Daily stage list/inspect | Done |
| Unload / TRANEXT / FOCUS / CDR / BPY / GRP / BRS / LSP / GLW | Still in TypeScript (`../cacentrp`); port next |

## Layout

- `ph.cac.cacentrp.Main` — CLI
- `config/` — INI loader
- `db/` — Mock + JT400 JDBC adapters
- `app/` — login / session / frame
- `process/` — DailyStore, EndOfDay, Pipeline
