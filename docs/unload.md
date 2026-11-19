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

## Still pending

Richer `wf_procmail` / `wf_sendmail` (MAPI save, BDOXPMST, feedback HTML).
