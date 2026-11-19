# FOCUS / CDR interface mapping

## Windows

| Window | Trigger | Source type | Role |
|--------|---------|-------------|------|
| `w_focusinterfaceprocess` | after `wf_procfocusfiles` | `FC` | Map FO OR/DIS/deposit working tables → `CURRLEDGE` |
| `w_alaifocusproc` | ALAI variant | `FC` | Same stage model as FOCUS (+ PDR / fund transfer / net DIS / UNBALDOC) |
| `w_cdrinterfaceprocess` | after `wf_proccdrfiles` | `CD` | Map `APTRANS`/`APDEPOSIT` via `ACCTENT` → `CURRLEDGE` |

## FOCUS / ALAI `ue_process` stages

1. Load params: SYRCACPARAM `101` (excess cash), `102` (cash clearing), `103`/`104` (excess/short PAYTYPE), `105` (OR excess/short tol), `106` (gain/loss); SYRUNIT for FO unit  
2. Retrieve OR cash / check / item / unique DataWindows  
3. **`wf_processcollection`** — gate each OR: must appear in cash and/or check (`ORAMTPDFAIL` → BDO **`J`**); `|paid − items|` ≤ param **105** (`ORSHRTEXEFAIL` → **`K`**); within-tol short/over → adjust first item or insert param **103/104** line + **`ORSHORTOVER`**; **`dw_dtlcshchk`** counters (`dtl`/`cash`/`check`) drive `COLL`/`CSHD`/`CHKD` and reject unsupported USD multi-detail mixes; USD single-detail cash+check uses tender-amount path (`modes=2`); **`f_getspcunitcode`** unit override via `agtNo` + `unitMaps`; skip `ORSTATCODE='C'`  
4. **`wf_proccollpdr`** (when OR items match `SYRPDRPARM.TRANTYPE`)  
5. **`wf_processdisbursement`** (maps DIS cash + **check** + items + **add/ded**; DIS check prefers `ACCTENT.BANKCODE` = `DISCHECKCURR.BANKCODE` + `SRCMAP=DISB`; applies **`wf_spcexcsh`**; ends with **`wf_fundtransfer`**, then **`wf_procdisbnet`** when `SYRNETPARM` products exist)  
6. **`wf_processdeposit`**  
7. **`wf_balentries`** — trial must balance (else BDO **`H`**); excess-cash PHP/USD vs `CASHBALANCE` (else `ERRCASHBAL` + **`I`**)  
8. **`wf_processcomplete('L')`** → write `dw_mapfocus` → `CURRLEDGE`, archive working `*` → `*X` (`focusWorkingX`), Success.bat  

**Add/ded** maps `DISADDAMT` / `DISDEDAMT` lines; skips SYRBANK and `wf_spcexcsh` hits.  
**Net disbursement (`wf_procdisbnet`)** maps cash-net / check-net at `disnetamt`; skips SYRBANK on non-bank pass; check path posts bank lines as **CR**; all-bank check docs defer to fund transfer; USD param-**106** × booking rate → PHP.

Fund-transfer / net-DIS / disbursement document imbalance → `f_write2unbaldoc` (`UNBALDOC`) and BDOAPMST status **`Q`** (per-doc) or **`H`** (grand total).  
`mapfocus.numbersign` = `*` on DR for accounts `214000` / `205002`.

On failure: **`wf_processreject`** — set BDOAPMST status, copy `mapfocus` → `unbalCurrLedge`, archive OR/DIS/cash/deposit working tables to `*U` (`focusWorkingU`), clear live working tables; batch `Error.bat`.

## CDR `ue_createacctent`

- Cursor join `APTRANS` ⋈ `ACCTENT` on `ACCTTYPE = TRANTYPE` (+ optional PAYTYPE)  
- Cursor join `APDEPOSIT` ⋈ `ACCTENT` on `BANKACCT = TRANTYPE`  
- Build `STR_CURRLEDGE` (`sourcetype='CD'`), normalize negative amounts (flip DR/CR)  
- Apply `numberSign` (`*` on DR for `214000` / `205002`) and `f_getspcunitcode` via optional `unitMaps` + `agtNo`  
- Excess-cash balancing via `ACCTENT` tranType **`CACPAR01`** (else param **101** excess cash acct); set `autoBalanceExcessCash=false` for strict FOCUS-style fail → `unbalCurrLedge` + BDO **`J`**  
- Persist to `CURRLEDGE`; archive APTRANS/APDEPOSIT/CASHBALANCE → `*X`; BDO **`L`** on success

## Shared structure (`str_currledge`)

`cocode, focode, refno, refdate, sourcetype, acctcode, drcr, amount, unit, origcy, loccy, lob, processdate, itemno, recdest, controlno, lspacctype, lsportype, paytype, effectdate, userid, trantype`

Paytype normalize: `CHK→Q`, `CSH→C`.

## Modern module

- `src/process/currledge.ts` — structure + helpers (`numberSign` optional)  
- `src/process/focus.ts` — stage pipeline (collection → collPdr → disbursement → disAddDed → fundTransfer → disbNet → deposit → balance → complete)  
- `src/process/store.ts` — `unbalDocs` (`UNBALDOC`), `errCashBal` (`ERRCASHBAL`), `orAmtPdFail` / `orShrtExeFail` / `orShortOver`, `focusWorkingU` (`*U`) / `focusWorkingX` (`*X`)  
- `src/process/cdr.ts` — APTRANS/APDEPOSIT mapper (`CACPAR01`, unitMaps, fail → `unbalCurrLedge`)  
- CLI: `cacentrp daily focus` / `cacentrp daily cdr`

## Still pending

SYRADJPARM adj loop is empty in extracted PB source (no-op). FOCUS + CDR core mapping depth is otherwise complete for this modernization track.
