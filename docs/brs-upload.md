# w_brsinterfaceprocess — BRS Interface Process

## Role

Menu **BRS Upload** opens `w_brsinterfaceprocess`. It reads BIS fixed-width **`.ALI`** files from `I:\BIS\`, validates control vs detail totals, and writes:

1. **`CURRLEDGE`** (via `dw_mapbrs`)
2. **`BRSFILEX`** (client / agent / policy enrichment for LSP later)
3. **`BDOAPMST`** (submission tracking; status `Y` → `L` on success)

Then runs `Success.bat` / `Error.bat` to archive the input file.

> Unload’s `*BPY*.dbf` path goes to **`w_bpyinterfaceprocess`** (DBF → `BPYFILE` → ACCTENT). That is a separate slice from this `.ALI` BRS window.

## Input

| Item | Value |
|------|--------|
| Path | `I:\BIS\*.ALI` |
| Control | rectype `1` — company + implied amount + record count |
| Detail | rectype `2` — ledger fields + client/agent/check clearing |

Filename stem drives effect date via `f_filedate` (`YY` + month letter `a–l` + `DD`).

## Validation

- Skip if `BDOAPMST.BDOSUBFILE` already has the short filename  
- SYRCACPARAM **`BI1`** bank account digits scale detail totals:  
  `(MID(bank,9,2) + MID(bank,15,2)) * detailSum` must equal control amount  
- Control record counts must match detail counts (ALAI / ALDC)

`ALDC` company on detail lines is remapped to **`ALAI`** in `CURRLEDGE`.

## Modern module

- `src/process/filedate.ts` — `f_filedate`  
- `src/process/brs.ts` — parse / validate / load  
- CLI: `cacentrp daily brs --inbound <dir-or-file.ALI>`
