# w_lspupload — Load LSP records

## Role

Menu **Load LSP records to LSP** opens `w_lspupload`. It reads `CURRLEDGE` rows destined for LSP and writes:

1. Fixed-width **`.lsp`** text files (per company)
2. Rows into **`INTINPFL`** (downstream LSP / ALMOD feed)

Then optionally appends selected **NLSP** accounts listed in `SYRNLSPUPLD` (`wf_loadnlsp`).

## Input

| Source | Filter |
|--------|--------|
| `CURRLEDGE` | `RECDEST = 'lsp'` and `AMOUNT > 0` |
| `CURRLEDGE` + `SYRNLSPUPLD` | `RECDEST = 'nlsp'` for listed `ACCTCODE`s |

Enrichment joins (when present): `APTRANSX`, `ORITEMCURRX`, `DISITEMCURRX`, `BPYTRANS`, `GRPTRANS`, `BRSTRANS`.

## Output files

| Company | Path |
|---------|------|
| APLN | `c:\cacent~~1\lspapln\UN_{mm}{dd}.lsp` |
| ALAI | `c:\cacent~~1\lspalai\UN_{mm}{dd}.lsp` |

Record layout (`STR_LSPCURRENT`): company(4) + FO(3) + policy(10) + name(15+1+1) + types(1+1) + account(6) + sign(1) + amount(13) + OR(7) + dates + pay/source/agent/CV/check/clearing — concatenated fixed fields.

## GL Walker link

`w_lspupload` does **not** write `GLWDTL`. LSP detail for `.GLW` merge comes from table **`GLWDTL`** via `w_glwalker.wf_lspdetails`. The modern store exposes `glwDtl` for that merge.

## Modern module

- `src/process/lspupload.ts` — `.lsp` + `INTINPFL`
- `src/process/glwalker.ts` — merges `glwDtl` with NLSP details
- CLI: `cacentrp daily lspupload [--out dir]`
