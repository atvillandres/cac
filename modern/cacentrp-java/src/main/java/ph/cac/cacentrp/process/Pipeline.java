package ph.cac.cacentrp.process;

import java.util.List;

/** Daily Processing stage model — mirrors cac_menu order (port status). */
public final class Pipeline {
  private Pipeline() {}

  public record Stage(String id, String title, String status, String notes) {}

  /** Scoped flow: login → APLN *P.GLW → publish. */
  public static final List<Stage> PGLW_STAGES = List.of(
      new Stage("odbc-login", "ODBC connect + SYRUSERID", "ported", "DSNs CACDB/APMODDTA/RAWDATA"),
      new Stage("prep-apln", "Prepare APLN CURRLEDGE", "ported", "NLSP rows for APLN"),
      new Stage("gen-pglw", "Generate *P.GLW", "ported", "w_glwalker APLANS → GLWALKER"),
      new Stage("publish", "Copy I:\\adhoc + backup", "ported", "move to backup_yyyyMMdd")
  );

  public static final List<Stage> DAILY_STAGES = PGLW_STAGES;

  public static String formatStages() {
    StringBuilder sb = new StringBuilder();
    for (Stage s : PGLW_STAGES) {
      sb.append(String.format("  [%s] %-28s %s%n", s.status(), s.title(), s.notes()));
    }
    return sb.toString();
  }

  public static String inspect() {
    return "Java P.GLW flow (login → *P.GLW → publish):\n" + formatStages();
  }
}
