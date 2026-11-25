package ph.cac.cacentrp.db;

public enum DbMode {
  MOCK,
  JDBC;

  public static DbMode parse(String raw) {
    String v = raw == null ? System.getenv().getOrDefault("CAC_DB", "mock") : raw;
    v = v.trim().toLowerCase();
    return switch (v) {
      case "jdbc", "as400", "real", "odbc" -> JDBC; // odbc alias → JT400 JDBC
      case "mock", "" -> MOCK;
      default -> throw new IllegalArgumentException(
          "Unknown --db mode '" + raw + "'. Use mock or jdbc.");
    };
  }
}
