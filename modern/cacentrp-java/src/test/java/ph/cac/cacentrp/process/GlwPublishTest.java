package ph.cac.cacentrp.process;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GlwPublishTest {
  @TempDir Path tmp;

  @Test
  void copiesToAdhocAndMovesToBackup() throws Exception {
    Path glw = tmp.resolve("GLWALKER");
    Path adhoc = tmp.resolve("adhoc");
    Files.createDirectories(glw);
    Path src = glw.resolve("112526P.GLW");
    Files.writeString(src, "00demo\r\n");

    LocalDate day = LocalDate.of(2026, 11, 25);
    GlwPublish.Result r = GlwPublish.publishPglw(glw, adhoc, day);
    assertEquals(1, r.copied());
    assertEquals(1, r.moved());
    assertTrue(Files.isRegularFile(adhoc.resolve("112526P.GLW")));
    assertTrue(Files.isRegularFile(glw.resolve("backup_20261125").resolve("112526P.GLW")));
    assertFalse(Files.exists(src));
  }
}
