package ph.cac.cacentrp.db;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Build JDBC URLs for IBM i (JT400) from INI / env, replacing PB ODBC DSNs. */
public final class JdbcUrls {
  private static final Pattern DSN = Pattern.compile("DSN\\s*=\\s*([^;'\"}\\s]+)", Pattern.CASE_INSENSITIVE);

  private JdbcUrls() {}

  public static String extractDsn(String dbParm) {
    if (dbParm == null || dbParm.isBlank()) return null;
    Matcher m = DSN.matcher(dbParm);
    return m.find() ? m.group(1).trim() : null;
  }

  /**
   * Resolution order:
   * 1. env CAC_JDBC_&lt;PROFILE&gt; (e.g. CAC_JDBC_CACDB)
   * 2. dbParm already a jdbc: URL
   * 3. jdbc:as400://host/library from ServerName + Database/DSN
   */
  public static String buildUrl(ConnectParams params) {
    String envKey = "CAC_JDBC_" + params.profileName().toUpperCase(Locale.ROOT);
    String fromEnv = System.getenv(envKey);
    if (fromEnv != null && !fromEnv.isBlank()) return fromEnv.trim();

    String parm = params.dbParm() == null ? "" : params.dbParm().trim();
    if (parm.toLowerCase(Locale.ROOT).startsWith("jdbc:")) return parm;

    String host = firstNonBlank(
        params.serverName(),
        System.getenv("CAC_AS400_HOST"),
        System.getenv("CAC_IBMI_HOST")
    );
    if (host == null) {
      throw new IllegalStateException(
          "No JDBC URL for profile " + params.profileName()
              + ". Set " + envKey + "=jdbc:as400://HOST/LIBRARY;naming=system"
              + " or ServerName in INI / CAC_AS400_HOST.");
    }

    String library = firstNonBlank(params.database(), extractDsn(parm), params.profileName());
    StringBuilder url = new StringBuilder("jdbc:as400://").append(host);
    if (library != null && !library.isBlank()) {
      url.append('/').append(library);
    }
    url.append(";naming=system;errors=full;prompt=false");
    return url.toString();
  }

  private static String firstNonBlank(String... vals) {
    for (String v : vals) {
      if (v != null && !v.isBlank()) return v.trim();
    }
    return null;
  }
}
