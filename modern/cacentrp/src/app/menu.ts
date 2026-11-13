/** Menu tree recovered from cac_menu.srm (ALAI SOURCE). */
import type { MenuItem } from "../types.js";

export const CAC_MENU: MenuItem[] = [
  {
    id: "m_dailyprocessing",
    text: "&Daily Processing",
    children: [
      { id: "m_rundaily", text: "Run Daily Process" },
      { id: "m_miscfilesprocess", text: "Misc. &Files Process" },
      { id: "m_autoemaildetach", text: "&Auto Email Detach" },
      { id: "m_manualloading", text: "&Manual Loading" },
      { id: "m_brsupload", text: "BRS &Upload" },
      { id: "m_createlspupload", text: "L&oad LSP records to LSP" },
      { id: "m_createglwfile", text: "&Merge LSP and Non-LSP/Create GLW File" },
      { id: "m_endofdayprocessing", text: "&End of Day Processing" },
    ],
  },
  {
    id: "m_reports",
    text: "&Reports",
    children: [
      { id: "m_priorlsptb", text: "&Prior LSP Account Summary" },
      { id: "m_foexcesscash", text: "&F.O. Excess Cash" },
      { id: "m_miscreports", text: "&Misc. Reports" },
      { id: "m_disbursementreport", text: "Disbursement Report" },
      { id: "m_agentwtpfsl", text: "Extract Agent's WTax & P. Fund SL" },
      { id: "m_alphalistwtaxgroup", text: "&Alphalist W/Tax (Group)" },
      { id: "m_bpirm2xtract", text: "&BPI RM2 File Extract" },
      { id: "m_checkdisbxtract", text: "&Check Disbursement Extract" },
      { id: "m_submission2bdo", text: "&Submission Report To BDO" },
      { id: "m_cashbalancereport", text: "Cash Balance Report" },
      { id: "m_processstat", text: "Submission Processing Status" },
      { id: "m_detailederrorlist", text: "&Detailed Error Listing" },
      { id: "m_special", text: "Special" },
      { id: "m_alaitablist", text: "ALAI &Tablist" },
      { id: "m_ahciun_mmddorffile", text: "AHCI Un_mmdd.orf file extract" },
    ],
  },
  {
    id: "m_administration",
    text: "&Tools",
    children: [
      { id: "m_referencefilemaint", text: "Reference File Maintenance" },
      { id: "m_transactionmappingtable", text: "Transaction Mapping Table" },
      { id: "m_systemreferencetables", text: "System Reference Tables" },
      { id: "m_usermaintenance", text: "User Maintenance" },
      { id: "m_audittrail", text: "Audit Trail" },
      { id: "m_printsystemlog", text: "Print System Log" },
      { id: "m_printmaintenancelog", text: "Print Maintenance Log" },
      { id: "m_resubmitfile", text: "Pre-resubmission Process" },
      { id: "m_dailycdrfileconversion", text: "Daily CDR File Conversion" },
      { id: "m_oldbrsfileconversion", text: "Old BRS File Conversion" },
      { id: "m_fcsrefreshreffiles", text: "&FOCUS Interface" },
    ],
  },
  {
    id: "m_window",
    text: "&Window",
    children: [
      { id: "m_vertical", text: "Tile &Vertical" },
      { id: "m_horizontal", text: "Tile &Horizontal" },
      { id: "m_layer", text: "&Layer" },
      { id: "m_cascade", text: "&Cascade" },
    ],
  },
  { id: "m_help", text: "&Help" },
  { id: "m_exit", text: "E&xit" },
];

export function formatMenu(items: MenuItem[] = CAC_MENU, indent = 0): string {
  const pad = "  ".repeat(indent);
  return items
    .map((item) => {
      const line = `${pad}- ${item.text.replace(/&/g, "")}  [${item.id}]`;
      const kids = item.children ? "\n" + formatMenu(item.children, indent + 1) : "";
      return line + kids;
    })
    .join("\n");
}
