package ph.cac.cacentrp.app;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;
import org.junit.jupiter.api.Test;
import ph.cac.cacentrp.Variant;
import ph.cac.cacentrp.config.IniConfig;
import ph.cac.cacentrp.db.MockDbAdapter;

class LoginMockTest {
  @Test
  void mockLoginAp() throws Exception {
    IniConfig cfg = new IniConfig(Map.of(), null, null, java.util.List.of(), Map.of());
    try (MockDbAdapter db = new MockDbAdapter()) {
      Session s = Login.login(Variant.AP, cfg, db, "demo", "secret");
      assertEquals("DEMO", s.userId());
      assertEquals(Variant.AP, s.variant());
    }
  }

  @Test
  void requiresPassword() {
    IniConfig cfg = new IniConfig(Map.of(), null, null, java.util.List.of(), Map.of());
    assertThrows(IllegalArgumentException.class, () -> {
      try (MockDbAdapter db = new MockDbAdapter()) {
        Login.login(Variant.AP, cfg, db, "DEMO", "");
      }
    });
  }
}
