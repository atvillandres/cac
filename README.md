# CAC Enterprise modernization

Legacy archive: `cac entrp.zip` — Sybase **PowerBuilder 7** desktop app (**CAC Enterprise** / Centralized Accounting Channel).

## Start here

- Analysis of `cacentrp.exe`: [`docs/cacentrp-analysis.md`](docs/cacentrp-analysis.md)
- Modern launcher (replaces the EXE stub): [`modern/cacentrp`](modern/cacentrp)
- PBL extractor: [`tools/pbl_extract.py`](tools/pbl_extract.py)

```bash
cd modern/cacentrp && npm install && npm run build
node dist/index.js --inspect
node dist/index.js --variant ALAI --user DEMO --password demo --skip-cleanup
node dist/index.js daily list
node dist/index.js daily run --seed-ledger
node dist/index.js daily focus
node dist/index.js daily cdr
node dist/index.js daily glwalker --out /tmp/glw
node dist/index.js daily lspupload --out /tmp/lsp
node dist/index.js daily brs --inbound /tmp/bis
node dist/index.js daily bpy
node dist/index.js daily grp
npm test
```

Analysis: [`docs/cacentrp-analysis.md`](docs/cacentrp-analysis.md), [`docs/process-pbl-analysis.md`](docs/process-pbl-analysis.md), [`docs/focus-cdr-mapping.md`](docs/focus-cdr-mapping.md), [`docs/glwalker.md`](docs/glwalker.md), [`docs/lsp-upload.md`](docs/lsp-upload.md), [`docs/brs-upload.md`](docs/brs-upload.md), [`docs/bpy-mapping.md`](docs/bpy-mapping.md), [`docs/grp-ssi-mapping.md`](docs/grp-ssi-mapping.md).
