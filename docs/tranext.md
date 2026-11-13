# TRANEXT — FO extract DBF → working tables

## Role

After FOCUS attachments are accepted, `w_unload` reads control `FO_TCDBF` and ImportFile’s each pack member from:

`C:\CAC ENTRP\ALAI\ALAI\TRANEXT\{code}.DBF`

then calls `wf_write2{code}` to load repository / working tables (ORMAINCURR, CASHBALANCE, deposit slips, DIS packs, …).

## Pack members (sample fixtures)

| Code | Domain | Typed modern target |
|------|--------|---------------------|
| FO_TCDBF | Extract control / hash | `foControl` |
| RA | OR header | `orMainCurr` |
| RB–RF | OR detail / cash / check / APR | `tranextRaw[code]` |
| VA–VH | DIS packs | `tranextRaw[code]` |
| CS | Cash balance | `cashBalance` |
| DA | Deposit slip | `depositSlip` (+ `apDeposits` bank key) |

CDR path still uses separate `APTRANS` / `APDEP` writers (not in the ALAI TRANEXT sample folder).

## Modern module

- `src/process/dbf.ts` — dBase III reader  
- `src/process/tranext.ts` — schemas + `write2*` + `runTranextLoad`  
- Fixtures: `fixtures/tranext/*.DBF` (from zip `ALAI/TRANEXT`)  
- CLI: `cacentrp daily tranext [--tranext dir]`  
- Unload: `--tranext <dir>` on `daily unload` / `daily run`

## Still pending

Typed `wf_write2rb`…`vh` / `aptrans` / `apdep` field maps (rows are already imported into `tranextRaw`).
