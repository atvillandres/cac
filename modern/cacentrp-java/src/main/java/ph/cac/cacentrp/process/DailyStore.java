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
    for (int i = 1; i <= n; i++) {
      CurrLedgeRow r = new CurrLedgeRow();
      r.coCode = "ALAI";
      r.foCode = "001";
      r.refNo = "DEMO" + i;
      r.refDate = "2026-11-19";
      r.sourceType = "FC";
      r.acctCode = "101001";
      r.drCr = i % 2 == 0 ? "CR" : "DR";
      r.amount = 100.0;
      r.processDate = "2026-11-19";
      r.userId = userId;
      r.recDest = "nlsp";
      currLedge.add(r);
    }
  }
}
