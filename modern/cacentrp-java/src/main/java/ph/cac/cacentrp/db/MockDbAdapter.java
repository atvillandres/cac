package ph.cac.cacentrp.db;

import java.sql.SQLException;
import java.util.HashSet;
import java.util.Set;

/** In-memory stand-in — accepts any non-empty credentials. */
public final class MockDbAdapter implements DbAdapter {
  private final Set<String> open = new HashSet<>();

  @Override
  public void connect(ConnectParams params) throws SQLException {
    if (params.userId() == null || params.userId().isBlank()
        || params.password() == null || params.password().isEmpty()) {
      throw new SQLException("Cannot connect to " + params.profileName() + ": missing credentials");
    }
    open.add(params.profileName());
  }

  @Override
  public void disconnect(String profileName) {
    open.remove(profileName);
  }

  @Override
  public boolean validateUser(String userId, String password) {
    return userId != null && !userId.trim().isEmpty();
  }

  @Override
  public void close() {
    open.clear();
  }
}
