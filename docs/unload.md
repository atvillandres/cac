# w_unload — Auto Email Detach / daily unload

## Role

Menu **Auto Email Detach** runs `w_unload.ue_process`:

1. `MISCRENM.BAT` — rename inbound BRS/SSI to `.DBF`
2. MAPI logon → subjects `CAC-LSP File` / `NO CAC-LSP File`
3. `wf_procmail` — attachments → FOCUS (`FCS`/`FCH`/`FCP`) or CDR
4. `wf_procmiscfiles` — `C:\tci\inbound\*BPY*.dbf` / `*GRP*.dbf`
5. Opens `w_focusinterfaceprocess` / `w_cdrinterfaceprocess` / `w_bpyinterfaceprocess` / `w_grpinterfaceprocess`

Manual Loading (`w_user_unload`) shares the same writers without MAPI.

## Modern module

`src/process/unload.ts` — `runUnload`:

| Step | Behavior |
|------|----------|
| Mail filter | Subject prefix match |
| Attach classify | extension → company + appsrce |
| Inbound | BPY→`bpyFile`, GRP→`grpFile` (append) |
| `mapDownstream` | Calls ported FOCUS/CDR/BPY/GRP mappers |
| TRANEXT plan | Lists planned `wf_write2*` codes |
| `tranextDir` | ImportFile + `wf_write2*` via `runTranextLoad` (CS/DA/RA–RF/VA–VH typed) |

CLI: `cacentrp daily run --map` (default on) / `daily unload [--tranext dir]` / `daily tranext`

See [`docs/tranext.md`](tranext.md).
