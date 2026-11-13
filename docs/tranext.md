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

### CDR pack (`APTRANS.DBF` / `APDEP.DBF`)

| Code | Domain | Typed modern target |
|------|--------|---------------------|
| APTRANS | AP transactions | `apTrans` (accttype remaps + unit lookup) |
| APDEP | AP deposits | `apDeposits` (CSH/CHK from DEPCHKNO; date checks) |

Not in the ALAI FOCUS `TRANEXT` sample folder — CDR unload imports them separately. Demo rows: `demoApTransRows` / `demoApDepRows`.

## Modern module

- `src/process/dbf.ts` — dBase III reader  
- `src/process/tranext.ts` — schemas + `write2*` + `runTranextLoad` + FOCUS/CDR bridges  
- Fixtures: `fixtures/tranext/*.DBF` (from zip `ALAI/TRANEXT`)  
- CLI: `cacentrp daily tranext [--tranext dir]` / `daily aptrans`  
- Unload: `--tranext <dir>` on `daily unload` / `daily run`

## Still pending

Remaining stub writers HA/OA/OB/VI/RC1 (see open PR if any); FOCUS DataWindow SQL depth.
