# cacentrp (modern)

TypeScript replacement for the PowerBuilder 7 stub **`cacentrp.exe`**, bootstrapping **CAC Enterprise** (*Centralized Accounting Channel*).

## Run

```bash
cd modern/cacentrp
npm install
npm run build
node dist/index.js --inspect
node dist/index.js --variant ALAI --user DEMO --password demo --skip-cleanup
```

Or without build:

```bash
npx tsx src/index.ts --inspect
```

Default INI files live under `config/` (scrubbed samples from the legacy ALAI/AP installs).

## Daily processing (`process.pbl`)

```bash
npm run daily -- list
npm run daily -- inspect
npm run daily -- run --seed-ledger --user DEMO
npm run daily -- endofday --seed-ledger
npm run daily -- focus
npm run daily -- cdr
npm test
```

See [`docs/process-pbl-analysis.md`](../../docs/process-pbl-analysis.md) and [`docs/focus-cdr-mapping.md`](../../docs/focus-cdr-mapping.md).

## Layout

- `src/exe/manifest.ts` — library list the EXE would load  
- `src/config/ini.ts` — `ProfileString`-compatible INI reader  
- `src/app/*` — ports of recovered shell PowerScript  
- `src/process/*` — daily pipeline (unload skeleton + end-of-day)  
- `legacy-source/` — recovered PowerScript (`cac.pbl` + key `process.pbl` objects)  
- `src/db/adapter.ts` — mock DB (wire real ODBC/Postgres later)

## Extract more legacy source

```bash
python3 tools/pbl_extract.py "legacy/cac entrp/ALAI/SOURCE/process.pbl" -o extracted/process.pbl --source-only
```
