package ph.cac.cacentrp.process;

/** Port of str_currledge. */
public class CurrLedgeRow {
  public String coCode = "";
  public String foCode = "";
  public String refNo = "";
  public String refDate = "";
  public String sourceType = "";
  public String acctCode = "";
  public String drCr = "DR";
  public double amount;
  public String unit = "";
  public String origCy = "";
  public String locCy = "";
  public String lob = "";
  public String processDate = "";
  public Integer itemNo;
  public String recDest = "";
  public String controlNo = "";
  public String lspAccType = "";
  public String lspOrType = "";
  public String payType = "";
  public String effectDate = "";
  public String userId = "";
  public String tranType;

  public CurrLedgeRow copy() {
    CurrLedgeRow r = new CurrLedgeRow();
    r.coCode = coCode;
    r.foCode = foCode;
    r.refNo = refNo;
    r.refDate = refDate;
    r.sourceType = sourceType;
    r.acctCode = acctCode;
    r.drCr = drCr;
    r.amount = amount;
    r.unit = unit;
    r.origCy = origCy;
    r.locCy = locCy;
    r.lob = lob;
    r.processDate = processDate;
    r.itemNo = itemNo;
    r.recDest = recDest;
    r.controlNo = controlNo;
    r.lspAccType = lspAccType;
    r.lspOrType = lspOrType;
    r.payType = payType;
    r.effectDate = effectDate;
    r.userId = userId;
    r.tranType = tranType;
    return r;
  }
}
