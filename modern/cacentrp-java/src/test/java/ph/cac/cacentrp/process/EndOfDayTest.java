package ph.cac.cacentrp.process;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class EndOfDayTest {
  @Test
  void archivesCurrLedge() {
    DailyStore store = DailyStore.create();
    store.seedDemo(5, "DEMO");
    EndOfDay.Result r = EndOfDay.run(store, new EndOfDay.Options(true, true));
    assertEquals(5, r.archived());
    assertEquals(0, store.currLedge.size());
    assertEquals(5, store.currLedgeX.size());
  }

  @Test
  void refusesWithoutGlWalker() {
    DailyStore store = DailyStore.create();
    store.seedDemo(2, "DEMO");
    EndOfDay.Result r = EndOfDay.run(store, new EndOfDay.Options(false, true));
    assertEquals(0, r.archived());
    assertEquals(2, store.currLedge.size());
  }
}
