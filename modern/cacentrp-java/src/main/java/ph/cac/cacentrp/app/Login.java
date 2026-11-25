package ph.cac.cacentrp.app;

import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import ph.cac.cacentrp.Variant;
import ph.cac.cacentrp.config.DbProfile;
import ph.cac.cacentrp.config.IniConfig;
import ph.cac.cacentrp.db.ConnectParams;
import ph.cac.cacentrp.db.DbAdapter;

/** Port of w_user_login OK-click: connect profiles then validate SYRUSERID. */
public final class Login {
  private Login() {}

  public static List<String> requiredProfiles(Variant variant) {
    if (variant == Variant.ALAI) {
      return List.of("ALAICAC", "ALMODDATA", "GISDATA");
    }
    return List.of("CACDB", "APMODDTA", "RAWDATA");
  }

  public static Session login(Variant variant, IniConfig config, DbAdapter db, String userId, String password)
      throws SQLException {
    String uid = userId == null ? "" : userId.trim().toUpperCase(Locale.ROOT);
    String pwd = password == null ? "" : password.trim();
    if (uid.isEmpty()) throw new IllegalArgumentException("Missing Information: You have not supplied a User ID");
    if (pwd.isEmpty()) throw new IllegalArgumentException("Missing Information: You have not supplied a Password");

    for (String name : requiredProfiles(variant)) {
      DbProfile profile = lookup(config, name);
      System.out.println("Connecting to " + name + "...");
      db.connect(new ConnectParams(
          name,
          uid,
          pwd,
          profile != null ? profile.dbms() : "ODBC",
          profile != null ? profile.database() : name,
          profile != null ? profile.serverName() : null,
          profile != null ? profile.dbParm() : null
      ));
    }

    System.out.println("Validating the user profile...");
    if (!db.validateUser(uid, pwd)) {
      for (int i = requiredProfiles(variant).size() - 1; i >= 0; i--) {
        db.disconnect(requiredProfiles(variant).get(i));
      }
      throw new IllegalArgumentException("User ID '" + userId + "' is invalid");
    }

    Instant now = Instant.now();
    LocalDateTime ldt = LocalDateTime.now();
    String stamp = ldt.format(DateTimeFormatter.ofPattern("MMddyyyyHHmmss"));
    return new Session(uid, uid, uid + stamp, variant, now);
  }

  private static DbProfile lookup(IniConfig config, String name) {
    if (config.profiles().containsKey(name)) return config.profiles().get(name);
    for (var e : config.profiles().entrySet()) {
      if (e.getKey().equalsIgnoreCase(name)) return e.getValue();
    }
    return null;
  }
}
