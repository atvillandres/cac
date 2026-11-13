# w_bpyinterfaceprocess — BPY / BRS DBF mapping

## Role

After unload loads `*BPY*.dbf` into **`BPYFILE`**, `w_bpyinterfaceprocess` (`ue_createacctent`) joins to **`ACCTENT`** and writes **`CURRLEDGE`**.

This is separate from menu **BRS Upload** (`w_brsinterfaceprocess`), which reads `I:\BIS\*.ALI` files.

## Joins

| Cursor | Join | FO code |
|--------|------|---------|
| `c_mapbpytrans` | `ACCTENT.TRANTYPE = BPYFILE.DTLTYPE` | forced `'BRS'` |
| `c_mapbpydep` | `ACCTENT.TRANTYPE = BPYFILE.INCKNO` | forced `'BRS'` |

Amount: `INPAMT / 100`. Date: `INDATE` as `YYYYMMDD`. Source type from `INPSTP`.

Unit resolution (optional): `SYRUNIT` / `SYRSPCUNIT` / `COMAIN` agent origin FO.

Requires SYRCACPARAM **`B01`** (cash balance buffer) to be present.

## Balance / archive

- DR total ≠ CR → copy to unbalanced ledger, `BDOAPMST` status **`H`**, keep `BPYFILE`
- Balanced → write `CURRLEDGE`, `INSERT BPYFILEX SELECT * FROM BPYFILE`, clear working file, `BDOAPMST` **`L`**, `Success.bat`

## Modern module

- `src/process/miscfiledate.ts` — `f_miscfiledate`
- `src/process/bpy.ts` — mapping + archive
- CLI: `cacentrp daily bpy`
