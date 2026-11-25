package ph.cac.cacentrp.process;

import java.util.List;

/** Daily Processing stage model — mirrors cac_menu order (port status). */
public final class Pipeline {
  private Pipeline() {}

  public record Stage(String id, String title, String status, String notes) {}

  public static final List<Stage> DAILY_STAGES = List.of(
      new Stage("misc-files", "Misc. Files Process", "external", "Legacy HOTCI.EXE"),
      new Stage("auto-email", "Auto Email Detach", "pending-java", "TS ported; Java unload TBD"),
      new Stage("tranext-load", "TRANEXT DBF → working tables", "pending-java", "TS ported; Java TBD"),
      new Stage("focus-map", "FOCUS transaction mapping", "pending-java", "TS ported; Java TBD"),
      new Stage("cdr-map", "CDR accounting entry mapping", "pending-java", "TS ported; Java TBD"),
      new Stage("bpy-map", "BPY / BRS DBF mapping", "pending-java", "TS ported; Java TBD"),
      new Stage("grp-map", "SSI / GRP DBF mapping", "pending-java", "TS ported; Java TBD"),
      new Stage("brs-upload", "BRS Upload", "pending-java", "TS ported; Java TBD"),
      new Stage("lsp-upload", "Load LSP records", "pending-java", "TS ported; Java TBD"),
      new Stage("glwalker", "Create GLW File", "pending-java", "TS ported; Java TBD"),
      new Stage("endofday", "End of Day", "ported", "CURRLEDGE → CURRLEDGEX archive")
  );

  public static String formatStages() {
    StringBuilder sb = new StringBuilder();
    for (Stage s : DAILY_STAGES) {
      sb.append(String.format("  [%s] %-28s %s%n", s.status(), s.title(), s.notes()));
    }
    return sb.toString();
  }

  public static String inspect() {
    long ported = DAILY_STAGES.stream().filter(s -> "ported".equals(s.status())).count();
    long pending = DAILY_STAGES.stream().filter(s -> s.status().startsWith("pending")).count();
    return "Java daily stages: ported=" + ported + " pending-java=" + pending
        + " (full FOCUS/CDR/… pipeline still in modern/cacentrp TypeScript until migrated)\n"
        + formatStages();
  }
}
