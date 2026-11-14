# process.pbl — daily processing analysis

## Role

`process.pbl` / `process.pbd` is the **daily operations** library for CAC Enterprise. Menu **Daily Processing** opens windows from this library.

## Menu → window map

| Menu item | Window | Purpose |
|-----------|--------|---------|
| Misc. Files Process | external `HOTCI.EXE` | Misc FO tools |
| Auto Email Detach | `w_unload` | Mail logon → FOCUS/CDR attachments → BRS/SSI inbound |
| Manual Loading | `w_user_unload` | Same unload path without mailbox automation |
| BRS Upload | `w_brsinterfaceprocess` | BRS interface |
| Load LSP records | `w_lspupload` | Build LSP upload from `CURRLEDGE` |
| Merge LSP / Create GLW | `w_glwalker` | GL Walker text file |
| End of Day | `w_endofday` | Archive `CURRLEDGE` → `CURRLEDGEX` |

## `w_unload` orchestration (`ue_process`)

1. Run `MISCRENM.BAT` (rename BRS/SSI → DBF).
2. MAPI logon; collect messages whose subject starts with `CAC-LSP File` / `NO CAC-LSP File`.
3. `wf_procmail()` — for each attachment:
   - Extensions: `CDR`, `FCS`, `FCH`, `FCP`
   - Resolve company via `SYRPARAM` (`FCSARJAP` / `FCSARJALAI` / `FCSARJAHCI`)
   - `appsrce='1'` → FOCUS (`wf_procfocusfiles` → `w_focusinterfaceprocess`)
   - `appsrce='2'` (CDR) → `wf_proccdrfiles` → `w_cdrinterfaceprocess`
4. Scan `C:\tci\inbound\*.dbf` → `wf_procmiscfiles()`:
   - `*BPY*.dbf` → BRS → `BPYFILE` → `w_bpyinterfaceprocess`
   - `*GRP*.dbf` → SSI → `GRPFILE` → `w_grpinterfaceprocess`
5. Track submissions in `BDOAPMST` / errors in `BDOERROR`.

## TRANEXT file types (FO extract pack)

Writers in `w_unload`: `wf_write2{ra,rb,rc,rc1,rd,re,rf,va…vh,cs,da,apdep,aptrans,…}`.

| Code | Domain | Meaning (from sample DBF) |
|------|--------|---------------------------|
| RA–RF | OR (receipt) | Header, items, cash, check, APR |
| VA–VH | DIS (disbursement) | Header, items, add/ded, cash, check, plan |
| CS | Cash balance | FO cash bal |
| DA | Deposit | Deposit slip |
| FO_TCDBF | Control | Extract control / hash |

## `w_endofday`

Confirmed GL Walker already run → `INSERT INTO CURRLEDGEX SELECT * FROM CURRLEDGE` → `DELETE FROM CURRLEDGE` → `COMMIT`.

## Modernization status

- Pipeline stage model + CLI (`daily list|run|endofday|focus|cdr|glwalker|lspupload|brs|bpy|grp|inspect`)
- End-of-day against in-memory ledger store
- Unload orchestrator with optional mapDownstream → FOCUS/CDR/BPY/GRP — see [`docs/unload.md`](unload.md)
- FOCUS / CDR → `CURRLEDGE` mapping (PDR / add-ded / `wf_spcexcsh` / fund transfer / net DIS / UNBALDOC / ERRCASHBAL / OR check-path + param 105 / `wf_processreject` `*U` / `wf_processcomplete` `*X` / param 106) — see [`docs/focus-cdr-mapping.md`](focus-cdr-mapping.md)
- GL Walker NLSP + LSP `GLWDTL` → fixed-width `.GLW` (H/A/P) — see [`docs/glwalker.md`](glwalker.md)
- LSP upload → `UN_mmdd.lsp` + `INTINPFL` — see [`docs/lsp-upload.md`](lsp-upload.md)
- BRS `.ALI` upload — see [`docs/brs-upload.md`](brs-upload.md)
- BPY DBF mapping — see [`docs/bpy-mapping.md`](bpy-mapping.md)
- SSI/GRP DBF mapping — see [`docs/grp-ssi-mapping.md`](grp-ssi-mapping.md)
- TRANEXT DBF ImportFile + typed CS/DA/RA–RF/VA–VH/RC1/VI/HA/OA/OB + APTRANS/APDEP — see [`docs/tranext.md`](tranext.md)
- Object inventory (166 source objects)

Next slice: richer OR/DIS check DataWindow column joins (SYRADJPARM adj loop is empty in extracted PB source).
