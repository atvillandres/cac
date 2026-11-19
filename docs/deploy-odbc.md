# Deploy modern CAC against real AS400 (ODBC)

Modern `cacentrp` can log in over **real ODBC** (same DSN shape as PowerBuilder). Daily `CURRLEDGE` mapping still runs in **process memory** until SQL persistence is ported — for full ledger I/O on AS400, keep legacy PB for those steps or wait for the next persistence slice.

## What “real” means today

| Layer | Mock (`--db mock`) | Real (`--db odbc`) |
|-------|--------------------|--------------------|
| Login connect to DSNs | Fake | Real ODBC |
| `SYRUSERID` check | Any non-empty user | `SELECT … FROM SYRUSERID` |
| Daily pipeline / CURRLEDGE | In-memory | In-memory (unchanged) |
| GLW / LSP file output | Real files | Real files |

## AP ODBC setup (Windows + IBM i)

1. Install **IBM i Access Client Solutions** (ACS) ODBC driver on the CAC workstation.
2. In **ODBC Data Source Administrator (64-bit)** create System DSNs:

   | DSN name   | Points at library / DB |
   |------------|-------------------------|
   | `CACDB`    | Main CAC (`SYRUSERID`, ledger libs) |
   | `APMODDTA` | AP module data |
   | `RAWDATA`  | Extract / destination |

3. Use naming/library list your shop already uses for legacy CAC. DSN **names** must match; library behind them is your AS400 config.
4. Copy/edit `modern/cacentrp/config/cac.ini` (already has `DbParm=ConnectString='DSN=…'`).

## Install modern CAC

```bat
cd modern\cacentrp
npm ci
npm run build
npm test
```

Needs **Node.js ≥ 20**. The `odbc` npm package talks to the OS driver manager (Windows ACS / unixODBC).

## Run real login (AP)

```bat
set CAC_DB=odbc
node dist\index.js --variant AP --db odbc --ini config\cac.ini --user YOURUSER --password YOURPASS --skip-cleanup
```

Or:

```bat
node dist\index.js --variant AP --db odbc --user YOURUSER --password YOURPASS
```

- UID/PWD are your **AS400 / ODBC** credentials (same as legacy login).
- Validation then requires that user to exist in **`SYRUSERID`** on `CACDB`.

## ALAI DSNs

Create `ALAICAC`, `ALMODDATA`, `GISDATA` and use `--variant ALAI` with `config/alaicac.ini`.

## Daily jobs

File pipeline still works without ODBC:

```bat
node dist\index.js daily run --user YOURUSER --inbound C:\tci\inbound
node dist\index.js daily glwalker --out C:\cac\out\glw
node dist\index.js daily endofday
```

Schedule via Windows Task Scheduler when ready. Ledger rows are **not** written to AS400 `CURRLEDGE` yet.

## Fallback

If ODBC drivers are missing, omit `--db odbc` (default **mock**) for offline/dev. Production login should use `--db odbc` or `CAC_DB=odbc`.
