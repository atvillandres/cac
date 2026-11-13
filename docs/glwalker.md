# w_glwalker — Create GL Walker Text File

## Role

Menu **Merge LSP and Non-LSP / Create GLW File** opens `w_glwalker`. It merges:

- **NLSP** lines from `CURRLEDGE` (`wf_nlspdetails`)
- **LSP** lines from `GLWDTL` (`wf_lspdetails`)
- optional GIS / NOPD / TDHO detail packs

…into fixed-width `.GLW` text files consumed by GL Walker.

## Output files

| Company | File |
|---------|------|
| AHCI | `{mmddyy}H.GLW` |
| ALAI | `{mmddyy}A.GLW` |
| APLN | `{mmddyy}P.GLW` (company code written as `APLANS`) |

Default path: `C:\CACENT~~1\GLWALKER\`

## Record types (concatenated fixed fields)

| `gwrect` | Meaning |
|---------|---------|
| `00` | Control — header count + detail count |
| `01` | Header — per control/group/date totals & account hash |
| `02` | Detail — account, DR/C, amounts (implied 2 decimals), refs |

Write order: control → for each header → matching details (sorted by control/group/date/journal).

## Key helpers

- `f_padrightspace` / `f_padleftzero` / `f_padrightzero`
- Amounts stored as 16-char zero-padded cent integers (`12.34` → `...1234`)
- Blank unit codes become `X001`
- FX: non-PHP × booking rate → local amount

## Modern module

- `src/process/pad.ts` — padding helpers  
- `src/process/glwalker.ts` — NLSP→detail→header→control→file  
- CLI: `cacentrp daily glwalker [--out dir]`

LSP `GLWDTL` merge remains a follow-up (needs LSP upload / `GLWDTL` feed).
