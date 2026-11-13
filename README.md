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
```
