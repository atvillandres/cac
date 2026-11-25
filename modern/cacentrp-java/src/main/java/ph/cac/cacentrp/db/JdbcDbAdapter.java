package ph.cac.cacentrp.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Real AS400/IBM i login via JT400 JDBC (institutional replacement for PB ODBC).
 * Validates USERID against SYRUSERID like legacy w_user_login.
 */
public final class JdbcDbAdapter implements DbAdapter {
  private final Map<String, Connection> connections = new LinkedHashMap<>();
  private final List<String> preferredAuth = List.of("CACDB", "ALAICAC", "APMODDTA");
  private String authProfile;

  static {
    try {
      Class.forName("com.ibm.as400.access.AS400JDBCDriver");
    } catch (ClassNotFoundException e) {
      // Driver may still be discoverable via ServiceLoader when shaded
    }
  }

  @Override
  public void connect(ConnectParams params) throws SQLException {
    if (params.userId() == null || params.userId().isBlank()
        || params.password() == null || params.password().isEmpty()) {
      throw new SQLException("Cannot connect to " + params.profileName() + ": missing credentials");
    }
    String url = JdbcUrls.buildUrl(params);
    String safe = url; // URL has no password
    System.out.println("  JDBC → " + params.profileName() + " (" + safe + ")");
    try {
      Connection c = DriverManager.getConnection(url, params.userId().trim(), params.password());
      connections.put(params.profileName(), c);
      chooseAuth(params.profileName());
    } catch (SQLException e) {
      throw new SQLException("Cannot connect to Database " + params.profileName() + ": " + e.getMessage(), e);
    }
  }

  private void chooseAuth(String profile) {
    if (authProfile == null) {
      authProfile = preferredAuth.contains(profile) ? profile : profile;
      return;
    }
    int cur = preferredAuth.indexOf(authProfile);
    int next = preferredAuth.indexOf(profile);
    if (next >= 0 && (cur < 0 || next < cur)) authProfile = profile;
  }

  @Override
  public void disconnect(String profileName) throws SQLException {
    Connection c = connections.remove(profileName);
    if (c != null) c.close();
    if (profileName.equals(authProfile)) authProfile = null;
  }

  @Override
  public boolean validateUser(String userId, String password) throws SQLException {
    String uid = userId.trim().toUpperCase(Locale.ROOT);
    String profile = authProfile;
    if (profile == null || !connections.containsKey(profile)) {
      for (String p : preferredAuth) {
        if (connections.containsKey(p)) {
          profile = p;
          break;
        }
      }
    }
    if (profile == null && !connections.isEmpty()) {
      profile = connections.keySet().iterator().next();
    }
    if (profile == null) throw new SQLException("validateUser: no open JDBC connection");

    Connection c = connections.get(profile);
    String sql = "SELECT USERID, PASSWORD FROM SYRUSERID WHERE TRIM(USERID) = ?";
    try (PreparedStatement ps = c.prepareStatement(sql)) {
      ps.setString(1, uid);
      try (ResultSet rs = ps.executeQuery()) {
        if (!rs.next()) return false;
        String found = rs.getString(1);
        return found != null && !found.trim().isEmpty();
      }
    }
  }

  @Override
  public void close() throws SQLException {
    List<String> names = new ArrayList<>(connections.keySet());
    for (int i = names.size() - 1; i >= 0; i--) {
      disconnect(names.get(i));
    }
  }
}
