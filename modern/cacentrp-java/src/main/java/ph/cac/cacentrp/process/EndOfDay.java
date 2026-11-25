package ph.cac.cacentrp.process;

import java.util.ArrayList;
import java.util.List;

/** Port of w_endofday — archive CURRLEDGE → CURRLEDGEX. */
public final class EndOfDay {
  private EndOfDay() {}

  public record Options(boolean glWalkerDone, boolean confirmArchive) {}

  public record Result(int archived, String message) {}

  public static Result run(DailyStore store, Options opts) {
    int total = store.currLedge.size();
    if (total <= 0) {
      return new Result(0, "No transactions to process");
    }
    if (!opts.glWalkerDone()) {
      return new Result(0, "Please run the GL Walker Interface first before proceeding!");
    }
    if (!opts.confirmArchive()) {
      return new Result(0, "End of day cancelled");
    }
    List<CurrLedgeRow> copy = new ArrayList<>();
    for (CurrLedgeRow r : store.currLedge) copy.add(r.copy());
    store.currLedgeX.addAll(copy);
    int archived = store.currLedge.size();
    store.currLedge.clear();
    return new Result(archived, "Archived " + archived + " CURRLEDGE row(s) into CURRLEDGEX");
  }
}
