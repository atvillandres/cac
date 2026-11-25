package ph.cac.cacentrp.config;

import java.util.List;
import java.util.Map;

public record IniConfig(
    Map<String, DbProfile> profiles,
    String appsPath,
    String extractPath,
    List<Region> regions,
    Map<String, Map<String, String>> raw
) {
  public record Region(String code, String desc) {}

  public String summarize() {
    StringBuilder sb = new StringBuilder();
    sb.append("Profiles (").append(profiles.size()).append("):\n");
    for (DbProfile p : profiles.values()) {
      sb.append("  - ").append(p.name())
          .append(": DBMS=").append(blank(p.dbms(), "?"))
          .append(" DB=").append(blank(p.database(), "?"))
          .append(" server=").append(blank(p.serverName(), "(ini/env)"))
          .append(" parm=").append(p.dbParm() != null && !p.dbParm().isBlank() ? "set" : "default")
          .append('\n');
    }
    sb.append("Apps path : ").append(appsPath != null ? appsPath : "(none)").append('\n');
    sb.append("Regions   : ");
    if (regions.isEmpty()) sb.append("(none)");
    else {
      for (int i = 0; i < regions.size(); i++) {
        if (i > 0) sb.append(", ");
        sb.append(regions.get(i).code()).append('=').append(regions.get(i).desc());
      }
    }
    return sb.toString();
  }

  private static String blank(String v, String d) {
    return v == null || v.isBlank() ? d : v;
  }
}
