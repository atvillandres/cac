# Deploy CAC Enterprise on Java (no Node.js)

Use **`modern/cacentrp-java`** when Node.js is prohibited. Runtime is a fat JAR + JDK 17+, talking to IBM i via **JT400 JDBC**.

## Why Java instead of Node

| | TypeScript (`modern/cacentrp`) | Java (`modern/cacentrp-java`) |
|--|-------------------------------|-------------------------------|
| Runtime | Node.js 20+ | JDK 17+ only |
| AS400 driver | ODBC (`odbc` npm) | JT400 JDBC (in JAR) |
| Institutional fit | Often blocked | Typical bank/enterprise stack |

## Build on a build PC / CI

```bash
cd modern/cacentrp-java
mvn -q clean test package
```

Copy `target/cacentrp.jar` plus optional `config/cac.ini` to the CAC workstation.

## AP real login

1. Confirm AS400 host and libraries (`CACDB`, `APMODDTA`, `RAWDATA`).
2. Set environment (Windows example):

```bat
set CAC_DB=jdbc
set CAC_AS400_HOST=AS400HOST
set CAC_JDBC_CACDB=jdbc:as400://AS400HOST/CACDB;naming=system;errors=full;prompt=false
set CAC_JDBC_APMODDTA=jdbc:as400://AS400HOST/APMODDTA;naming=system;errors=full;prompt=false
set CAC_JDBC_RAWDATA=jdbc:as400://AS400HOST/RAWDATA;naming=system;errors=full;prompt=false
```

3. Run:

```bat
java -jar cacentrp.jar --variant AP --db jdbc --user YOURUSER --password YOURPASS
```

Login uses your AS400 user/password, then checks **`SYRUSERID`** on `CACDB`.

Offline/dev without AS400:

```bat
java -jar cacentrp.jar --variant AP --db mock --user DEMO --password demo
```

## P.GLW-only flow (APLN)

Scoped Java path (login → `*P.GLW` → publish):

```bat
java -jar cacentrp.jar --variant AP --db odbc --user YOURUSER --password YOURPASS
java -jar cacentrp.jar daily pglw --seed-ledger --out C:\CACENT~~1\GLWALKER
java -jar cacentrp.jar daily publish --glwalker C:\CACENT~~1\GLWALKER --adhoc I:\adhoc
```

`daily publish` copies every `*P.GLW` to `I:\adhoc`, then moves each file into `GLWALKER\backup_yyyyMMdd\`.

`--db odbc` uses the same DSN **names** as PowerBuilder (`CACDB`, `APMODDTA`, `RAWDATA`) via JT400 JDBC URLs (`CAC_JDBC_*` / `CAC_AS400_HOST`).

## What is / isn’t real yet

- **Real (Java):** ODBC/JDBC login + `SYRUSERID`; APLN `*P.GLW` writer; publish copy/backup; End-of-Day in-memory archive.
- **Still TypeScript / pending Java:** full unload, TRANEXT, FOCUS, CDR, BPY, GRP, BRS, LSP, H/A GLW packs.

UI mock for this flow: `apps/cac-enterprise-ui` (dark mode toggle).

## INI

Bundled samples: classpath `config/cac.ini` (AP), `config/alaicac.ini` (ALAI). Override with `--ini C:\cac\cac.ini`. You may set `ServerName=` per profile instead of `CAC_AS400_HOST`.
