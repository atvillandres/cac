package ph.cac.cacentrp.config;

public record DbProfile(
    String name,
    String dbms,
    String database,
    String userId,
    String databasePassword,
    String logId,
    String logPassword,
    String serverName,
    String lock,
    String dbParm,
    String prompt,
    String autoCommit
) {}
