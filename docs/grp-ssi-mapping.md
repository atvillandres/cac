# w_grpinterfaceprocess — SSI / GRP mapping

## Role

After unload loads `*GRP*.dbf` into **`GRPFILE`**, `w_grpinterfaceprocess` joins to **`ACCTENT`** and writes **`CURRLEDGE`** (FO code forced to **`SSI`**).

## Join

| Cursor | Join |
|--------|------|
| `c_mapgrptrans` | `ACCTENT.TRANTYPE = GRPFILE.DTLTYPE` |

- Ref no = `TRIM(IPOLNO) + TRIM(INPENT)`  
- Amount = `INPAMT / 100`  
- Date from `INDATE` (`YYYYMMDD`) via `f_miscfiledate` for the batch filename  

## Balance / archive

- Unbalanced → `unbalCurrLedge`, `BDOAPMST` **`H`**  
- Balanced → `CURRLEDGE`, `INSERT GRPFILEX SELECT * FROM GRPFILE`, clear working file, `BDOAPMST` **`L`**, `Success.bat`

## Modern module

- `src/process/grp.ts`  
- CLI: `cacentrp daily grp` / `daily ssi`
