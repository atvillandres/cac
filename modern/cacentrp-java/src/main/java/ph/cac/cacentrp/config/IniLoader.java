package ph.cac.cacentrp.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** PowerBuilder ProfileString-compatible INI reader (cac.ini / alaicac.ini). */
public final class IniLoader {
  private IniLoader() {}

  public static IniConfig load(Path path) throws IOException {
    if (!Files.isRegularFile(path)) {
      throw new IOException("INI not found: " + path);
    }
    Map<String, Map<String, String>> raw = parse(Files.readString(path, StandardCharsets.UTF_8));
    Map<String, DbProfile> profiles = new LinkedHashMap<>();
    for (Map.Entry<String, Map<String, String>> e : raw.entrySet()) {
      String section = e.getKey();
      if (section.toLowerCase(Locale.ROOT).startsWith("profile ")) {
        String name = section.substring("profile ".length()).trim();
        profiles.put(name, fromSection(name, e.getValue()));
      }
    }
    List<IniConfig.Region> regions = new ArrayList<>();
    Map<String, String> regionSec = raw.getOrDefault("Region", Map.of());
    for (int i = 1; i <= 9; i++) {
      String code = regionSec.get("RegionCode" + i);
      String desc = regionSec.get("RegionDesc" + i);
      if (code != null || desc != null) {
        regions.add(new IniConfig.Region(code != null ? code : "", desc != null ? desc : ""));
      }
    }
    Map<String, String> apps = raw.getOrDefault("APPSPATH", Map.of());
    Map<String, String> extract = raw.getOrDefault("EXTRACT", Map.of());
    return new IniConfig(
        profiles,
        first(apps.get("Appspath"), extract.get("Appspath")),
        extract.get("Appspath"),
        regions,
        raw
    );
  }

  private static String first(String a, String b) {
    if (a != null && !a.isBlank()) return a;
    return b;
  }

  private static DbProfile fromSection(String name, Map<String, String> sec) {
    return new DbProfile(
        name,
        sec.getOrDefault("DBMS", ""),
        sec.getOrDefault("Database", ""),
        sec.get("UserId"),
        sec.get("DatabasePassword"),
        sec.get("LogId"),
        sec.get("LogPassword"),
        sec.get("ServerName"),
        sec.get("Lock"),
        first(sec.get("DbParm"), sec.get("DBParm")),
        sec.get("Prompt"),
        sec.get("AutoCommit")
    );
  }

  static Map<String, Map<String, String>> parse(String text) {
    Map<String, Map<String, String>> sections = new LinkedHashMap<>();
    String current = "";
    for (String rawLine : text.split("\\R")) {
      String line = rawLine.trim();
      if (line.isEmpty() || line.startsWith(";") || line.startsWith("#")) continue;
      if (line.startsWith("[") && line.endsWith("]")) {
        current = line.substring(1, line.length() - 1).trim();
        sections.computeIfAbsent(current, k -> new LinkedHashMap<>());
        continue;
      }
      if (current.isEmpty()) continue;
      int eq = line.indexOf('=');
      if (eq < 0) continue;
      String key = line.substring(0, eq).trim();
      String value = line.substring(eq + 1).trim();
      sections.get(current).put(key, value);
    }
    return sections;
  }
}
