package ph.cac.cacentrp.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class JdbcUrlsTest {
  @Test
  void extractDsnFromPbParm() {
    assertEquals("CACDB", JdbcUrls.extractDsn("ConnectString='DSN=CACDB;UID=x',StaticBind=0"));
  }

  @Test
  void buildUrlFromHostAndLibrary() {
    ConnectParams p = new ConnectParams("CACDB", "U", "P", "ODBC", "CACDB", "as400.example.com", null);
    String url = JdbcUrls.buildUrl(p);
    assertTrue(url.startsWith("jdbc:as400://as400.example.com/CACDB"));
    assertTrue(url.contains("naming=system"));
  }

  @Test
  void passthroughJdbcParm() {
    ConnectParams p = new ConnectParams(
        "CACDB", "U", "P", "ODBC", "CACDB", null, "jdbc:as400://box/CACDB;naming=system");
    assertEquals("jdbc:as400://box/CACDB;naming=system", JdbcUrls.buildUrl(p));
  }
}
