package ph.cac.cacentrp.db;

public record ConnectParams(
    String profileName,
    String userId,
    String password,
    String dbms,
    String database,
    String serverName,
    String dbParm
) {}
