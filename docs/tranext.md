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
| RB | OR group/policy | `orItemCurr` |
| RC | OR item detail | `orItemDtlCurr` |
| RD | OR cash | `orCashCurr` |
| RE | OR check | `orCheckCurr` |
| RF | OR APR | `orAprCurr` |
| VA | DIS header | `disMainCurr` |
| VB | DIS group/policy | `disItemCurr` |
| VC | DIS item detail | `disItemDtlCurr` |
| VD / VE | DIS add / ded | `disAddCurr` / `disDedCurr` |
| VF / VG | DIS cash / check | `disCashCurr` / `disCheckCurr` |
| VH | DIS plan premium | `disPlanCurr` |
| CS | Cash balance | `cashBalance` |
| DA | Deposit slip | `depositSlip` (+ `apDeposits` bank key) |

`focusWorkingFromStore` projects RC/RD/RE/VC/VF/DA into FOCUS `orCash` / `orItems` / `disCash` / `disItems` / `deposits`.

CDR path still uses separate `APTRANS` / `APDEP` writers (not in the ALAI TRANEXT sample folder).

## Modern module

- `src/process/dbf.ts` — dBase III reader  
- `src/process/tranext.ts` — schemas + `write2*` + `runTranextLoad` + FOCUS bridge  
- Fixtures: `fixtures/tranext/*.DBF` (from zip `ALAI/TRANEXT`)  
- CLI: `cacentrp daily tranext [--tranext dir]`  
- Unload: `--tranext <dir>` on `daily unload` / `daily run`

## Still pending

Typed `wf_write2aptrans` / `wf_write2apdep` (CDR path); ALAI FOCUS (`w_alaifocusproc`) polish.
