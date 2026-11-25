package ph.cac.cacentrp.app;

public final class Frame {
  private Frame() {}

  public static String render(Session session) {
    return """
        Centralized Accounting Channel - %s (%s), Version 2.11 (Java)
        Session : %s
        Login   : %s
        """.formatted(
        session.variant(),
        session.userId(),
        session.sessionId(),
        session.loginAt()
    );
  }
}
