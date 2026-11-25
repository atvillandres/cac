package ph.cac.cacentrp.db;

public enum DbMode {
  MOCK,
  /** ODBC DSN profiles (CACDB / APMODDTA / RAWDATA) via JT400 libraries — same DSNs as PB. */
  ODBC,
  JDBC;

  public static DbMode parse(String raw) {
    String v = raw == null ? System.getenv().getOrDefault("CAC_DB", "mock") : raw;
    v = v.trim().toLowerCase();
    return switch (v) {
      case "odbc", "real" -> ODBC;
      case "jdbc", "as400" -> JDBC;
      case "mock", "" -> MOCK;
      default -> throw new IllegalArgumentException(
          "Unknown --db mode '" + raw + "'. Use mock, odbc, or jdbc.");
    };
  }
}
