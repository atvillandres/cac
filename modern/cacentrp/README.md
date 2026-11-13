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

## Layout

- `src/exe/manifest.ts` — library list the EXE would load  
- `src/config/ini.ts` — `ProfileString`-compatible INI reader  
- `src/app/cac.ts` / `login.ts` / `frame.ts` / `menu.ts` — ports of recovered PowerScript  
- `legacy-source/` — normalized extracts from `ALAI/SOURCE/cac.pbl`  
- `src/db/adapter.ts` — mock DB (wire real ODBC/Postgres later)

## Extract more legacy source

```bash
python3 tools/pbl_extract.py "legacy/cac entrp/ALAI/SOURCE/process.pbl" -o extracted/process.pbl --source-only
```
