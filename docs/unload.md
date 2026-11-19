# w_unload — Auto Email Detach / daily unload

## Role

Menu **Auto Email Detach** runs `w_unload.ue_process`:

1. `MISCRENM.BAT` — `C:\tci\inbound` `RENAME *.TRN *.DBF` (ymmddBPY / ymmddGRP)
2. MAPI logon → subjects `CAC-LSP File` / `NO CAC-LSP File`
3. `wf_procmail` — attachments → FOCUS (`FCS`/`FCH`/`FCP`) or CDR
4. `wf_procmiscfiles` — scan `C:\tci\inbound\*.dbf`; ImportFile BPY/GRP; `dtltype = iacttype + inortype`
5. Opens `w_focusinterfaceprocess` / `w_cdrinterfaceprocess` / `w_bpyinterfaceprocess` / `w_grpinterfaceprocess`

Manual Loading (`w_user_unload`) shares the same writers without MAPI.

## Modern module

`src/process/unload.ts` + `miscrenm.ts` — `runUnload`:

| Step | Behavior |
|------|----------|
| `inboundDir` / MISCRENM | `renameTrnToDbf` then `scanInboundDir` (*.DBF) |
| Mail filter | Subject prefix match |
| Attach classify | extension → company + appsrce |
| Inbound | BPY→`bpyFile`, GRP→`grpFile`; if `rows` omitted, `readDbfFile` + `mapMiscFileRow` (sets `dtlType` / `inprdate`) |
| `mapDownstream` | Calls ported FOCUS/CDR/BPY/GRP mappers |
| TRANEXT plan | Lists planned `wf_write2*` codes |
| `tranextDir` | ImportFile + `wf_write2*` via `runTranextLoad` (CS/DA/RA–RF/VA–VH typed) |
| FO control | After TRANEXT load, `validateFoControl` checks `ΣFO_TCDBF.TC_COUNT` vs `Σwritten`; mismatch gates FOCUS mapping only (`foControlOk=false`) |
| FOCUS from TRANEXT | `focusFromTranext` feeds `orCheck` / `disCheck` (and related) from typed working tables |

CLI: `cacentrp daily run --map` / `daily unload [--inbound dir|file] [--tranext dir]` / `daily tranext`

Legacy bat: `modern/cacentrp/legacy-source/dosbat/MISCRENM.BAT`.

See [`docs/tranext.md`](tranext.md).

## Mail / sendmail (ported)

| Piece | Behavior |
|-------|----------|
| BDOXPMST | `store.bdoXpMst` — resolve sender email → `sntComp`/`sntBdo` (strict when table non-empty) |
| No-attach | Status `C` / `*`; letter-month `subFile` (`yy`+A–L+`dd`+bdo) |
| `wf_sendmail` | `runSendmail` — feedback HTML + **ERR.HTM** from `bdoError`/`bdoErrRef`; **send iff XT7=Y** (log-only) |
| DELFLECF | `cleanupTempDir` → delete `*.FC?` / `*.CDR` (`delflecf.ts`) |
| ARJ | `arjArchives` + `tranextDir` → FOCUSXTR/APCDRXTR plan (real extract when `arj` on PATH) |

## Still pending / out of band

- Live MAPI attach-save (caller supplies `pathname`; no Outlook session in Node)
- Misc. Files `HOTCI.EXE` (pipeline `external`)
- SYRADJPARM adj loop (empty in extracted PB — no-op)
