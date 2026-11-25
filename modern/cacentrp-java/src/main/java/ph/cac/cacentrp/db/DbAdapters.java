package ph.cac.cacentrp.db;

public final class DbAdapters {
  private DbAdapters() {}

  public static DbAdapter create(DbMode mode) {
    return switch (mode) {
      case ODBC, JDBC -> new JdbcDbAdapter();
      case MOCK -> new MockDbAdapter();
    };
  }
}
