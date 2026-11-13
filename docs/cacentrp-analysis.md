# cacentrp.exe — scan & interpretation

## Verdict

`cacentrp.exe` is **not** a standalone business application. It is a **Sybase PowerBuilder 7.0 Enterprise** generated EXE stub (file version `7.0.00.5031`, PE32 GUI, links `PBVM70.dll` ordinal 137). All real logic lives in the companion `.pbd` / `.pbl` libraries.

## What the EXE does

1. Loads the PowerBuilder VM (`PBVM70.dll`).
2. Reads its embedded library object `ob.exe` (DAT* chain inside the EXE trailer / `TRL*` → `HDR*` library).
3. Initializes application object **`cac`** (`cac.apl` / `cac.sra`).
4. Resolves objects from the listed `.pbd` files on the library path.

### Variants in the zip

| Path | Size | Notes |
|------|------|-------|
| `cac entrp/PBL/cacentrp.exe` | 31 744 | Baseline build; libs include `process`, `AGT_PIPE`, `ap_taxes`, … |
| `cac entrp/AP/cacentrp.exe` | 31 744 | Accounts Payable flavor; same stub, different lib order |
| `cac entrp/ALAI/cacentrp.exe` | 36 864 | ALAI flavor; uses `alai_taxes.pbd`, extra report windows, custom icon resources |

## Application open sequence (from recovered source)

Recovered from `ALAI/SOURCE/cac.pbl`:

1. **`cac` open** → `OPEN(w_user_login)` then `RUN` of `DELFLECF.BAT` (cleanup old CDR/FCS files).
2. **`w_user_login` OK** → ODBC connect to profiles (`ALAICAC`, `ALMODDATA`, `GISDATA` for ALAI) via `alaicac.ini`, validate `SYRUSERID`, then `OPEN(w_cac_frame)` + `OPENSHEET(w_cac_logo)`.
3. **`w_cac_frame` ue_open** → build `gs_sessionid`, insert `LOGHISTORY`, set title  
   `Centralized Accounting Channel - ALAI (<userid>), Version 2.11`.

Display name: **CAC Enterprise** — *Centralized Accounting Channel (Enterprise Version)*. Philippine regional codes in INI (Metro Manila … Mindanao). Domain: FO/LSP accounting, CDR/BRS interfaces, disbursements, withholding tax extracts, BDO submission, FOCUS refresh.

## Library map (ALAI project `cacentrp.srj`)

- `cac.pbl` — app shell, login, frame, menu  
- `process.pbl` — daily pipelines / mappings  
- `report.pbl` — reports & extracts  
- `lextract.pbl` — raw data / agent pipe maintenance  
- `libraries.pbl` — shared functions/structures  
- `utilities.pbl` — transaction map maint, etc.  
- `sysadm.pbl` — users, logs  
- `special.pbl`, `alai_taxes.pbl` — special / tax extracts  

## Modernization status

| Piece | Status |
|-------|--------|
| EXE stub → Node/TS launcher | Done (`modern/cacentrp`) |
| INI profile loader | Done |
| Login + frame bootstrap | Done (mock DB) |
| Menu tree from `cac_menu.srm` | Done |
| `process` / `report` / `lextract` business logic | Next |

Use `tools/pbl_extract.py` to dump further SOURCE `.pbl` libraries.
