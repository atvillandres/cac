package ph.cac.cacentrp.process;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GlWalkerTest {
  @TempDir Path tmp;

  @Test
  void writesPglwForApln() throws Exception {
    DailyStore store = DailyStore.create();
    store.seedApln(4, "DEMO");
    GlWalker.Result r = GlWalker.runAplnPglw(store.currLedge, GlWalker.Options.defaults(tmp));
    assertTrue(r.ok());
    assertTrue(r.filename().endsWith("P.GLW"));
    assertEquals(4, r.detailCount());
    assertTrue(Files.isRegularFile(r.path()));
    String body = Files.readString(r.path());
    assertTrue(body.startsWith("00"));
    assertTrue(body.contains("APLANS"));
  }
}
