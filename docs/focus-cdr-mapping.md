# FOCUS / CDR interface mapping

## Windows

| Window | Trigger | Source type | Role |
|--------|---------|-------------|------|
| `w_focusinterfaceprocess` | after `wf_procfocusfiles` | `FC` | Map FO OR/DIS/deposit working tables → `CURRLEDGE` |
| `w_alaifocusproc` | ALAI variant | `FC` | Same stage model as FOCUS (+ fund transfer / PDR / UNBALDOC) |
| `w_cdrinterfaceprocess` | after `wf_proccdrfiles` | `CD` | Map `APTRANS`/`APDEPOSIT` via `ACCTENT` → `CURRLEDGE` |

## FOCUS / ALAI `ue_process` stages

1. Load params: SYRCACPARAM `101` (excess cash), `102` (cash clearing), `106` (gain/loss); SYRUNIT for FO unit  
2. Retrieve OR cash / check / item / unique DataWindows  
3. **`wf_processcollection`**  
4. **`wf_proccollpdr`** (when OR items match `SYRPDRPARM.TRANTYPE`)  
5. **`wf_processdisbursement`** (ends with **`wf_fundtransfer`**)  
6. **`wf_processdeposit`**  
7. **`wf_balentries`**  
8. **`wf_processcomplete('L')`** → write `dw_mapfocus` → `CURRLEDGE`, archive working `*` → `*X`, Success.bat  

Fund-transfer / disbursement document imbalance → `f_write2unbaldoc` (`UNBALDOC`) and BDOAPMST status **`Q`** (per-doc) or **`H`** (grand total).  
`mapfocus.numbersign` = `*` on DR for accounts `214000` / `205002`.

On failure: ROLLBACK; reject path archives to `*U` tables and sets BDOAPMST error status.

## CDR `ue_createacctent`

- Cursor join `APTRANS` ⋈ `ACCTENT` on `ACCTTYPE = TRANTYPE` (+ optional PAYTYPE)  
- Cursor join `APDEPOSIT` ⋈ `ACCTENT` on `BANKACCT = TRANTYPE`  
- Build `STR_CURRLEDGE` (`sourcetype='CD'`), normalize negative amounts (flip DR/CR)  
- Excess-cash balancing via `CACPAR01` / param 101  
- Persist to `CURRLEDGE`; archive APTRANS/APDEPOSIT/CASHBALANCE → `*X`

## Shared structure (`str_currledge`)

`cocode, focode, refno, refdate, sourcetype, acctcode, drcr, amount, unit, origcy, loccy, lob, processdate, itemno, recdest, controlno, lspacctype, lsportype, paytype, effectdate, userid, trantype`

Paytype normalize: `CHK→Q`, `CSH→C`.

## Modern module

- `src/process/currledge.ts` — structure + helpers (`numberSign` optional)  
- `src/process/focus.ts` — stage pipeline (collection → collPdr → disbursement → fundTransfer → deposit → balance → complete)  
- `src/process/store.ts` — `unbalDocs` (`UNBALDOC`)  
- `src/process/cdr.ts` — APTRANS/APDEPOSIT mapper  
- CLI: `cacentrp daily focus` / `cacentrp daily cdr`

## Still pending

Net disbursement (`wf_procdisbnet`) and full DataWindow SQL joins for OR/DIS check/net paths.
