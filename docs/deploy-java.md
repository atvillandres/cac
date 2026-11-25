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

## What is / isn’t real yet

- **Real:** JDBC connect + `SYRUSERID` validation; End-of-Day in-memory archive; CLI packaging.
- **Still TypeScript / pending Java port:** unload, TRANEXT, FOCUS, CDR, BPY, GRP, BRS, LSP, GL Walker writers.

Until those modules are migrated, keep legacy PB (or the TS tree on a non-restricted build host) for full daily file mapping — or request the next Java pipeline slice.

## INI

Bundled samples: classpath `config/cac.ini` (AP), `config/alaicac.ini` (ALAI). Override with `--ini C:\cac\cac.ini`. You may set `ServerName=` per profile instead of `CAC_AS400_HOST`.
