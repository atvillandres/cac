package ph.cac.cacentrp.process;

import java.util.ArrayList;
import java.util.List;

/** In-memory stand-in for CAC working tables (CURRLEDGE / CURRLEDGEX). */
public final class DailyStore {
  public final List<CurrLedgeRow> currLedge = new ArrayList<>();
  public final List<CurrLedgeRow> currLedgeX = new ArrayList<>();

  public static DailyStore create() {
    return new DailyStore();
  }

  public void seedDemo(int n, String userId) {
    seedApln(n, userId);
  }

  /** Demo NLSP rows for APLN → *P.GLW. */
  public void seedApln(int n, String userId) {
    for (int i = 1; i <= n; i++) {
      CurrLedgeRow r = new CurrLedgeRow();
      r.coCode = "APLN";
      r.foCode = "001";
      r.refNo = "APLN" + i;
      r.refDate = java.time.LocalDate.now().toString();
      r.sourceType = "FC";
      r.acctCode = i % 2 == 0 ? "401001" : "101001";
      r.drCr = i % 2 == 0 ? "CR" : "DR";
      r.amount = 100.0;
      r.origCy = "PHP";
      r.lob = "01";
      r.unit = "X001";
      r.processDate = java.time.LocalDate.now().toString();
      r.userId = userId;
      r.recDest = "nlsp";
      currLedge.add(r);
    }
  }
}
