package ph.cac.cacentrp.db;

import java.sql.SQLException;

public interface DbAdapter extends AutoCloseable {
  void connect(ConnectParams params) throws SQLException;

  void disconnect(String profileName) throws SQLException;

  boolean validateUser(String userId, String password) throws SQLException;

  @Override
  void close() throws SQLException;
}
