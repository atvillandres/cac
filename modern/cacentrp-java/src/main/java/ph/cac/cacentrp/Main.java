package ph.cac.cacentrp;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import ph.cac.cacentrp.app.Frame;
import ph.cac.cacentrp.app.Login;
import ph.cac.cacentrp.app.Session;
import ph.cac.cacentrp.config.IniConfig;
import ph.cac.cacentrp.config.IniLoader;
import ph.cac.cacentrp.db.DbAdapter;
import ph.cac.cacentrp.db.DbAdapters;
import ph.cac.cacentrp.db.DbMode;
import ph.cac.cacentrp.process.DailyStore;
import ph.cac.cacentrp.process.EndOfDay;
import ph.cac.cacentrp.process.Pipeline;

/**
 * Java entry point for CAC Enterprise — institutional alternative to Node cacentrp.
 *
 * <pre>
 *   java -jar cacentrp.jar [--variant AP] [--db mock|jdbc] [--ini path] [--user U] [--password P]
 *   java -jar cacentrp.jar daily list|inspect|endofday [--seed-ledger] [--user U]
 * </pre>
 */
public final class Main {
  private Main() {}

  public static void main(String[] args) throws Exception {
    List<String> argv = new ArrayList<>(List.of(args));
    if (argv.isEmpty() || "-h".equals(argv.get(0)) || "--help".equals(argv.get(0))) {
      usage();
      return;
    }
    if ("daily".equals(argv.get(0))) {
      runDaily(argv.subList(1, argv.size()));
      return;
    }
    runLoginShell(argv);
  }

  private static void usage() {
    System.out.println("""
        Usage:
          cacentrp [login options]
          cacentrp daily <list|inspect|endofday> [daily-options]

        Login options:
          --variant ALAI|AP|PBL   Deployment flavor (default: ALAI)
          --db mock|jdbc          Database mode (default: mock; env CAC_DB=jdbc)
          --ini <path>            Path to cac.ini / alaicac.ini
          --user <id>             Non-interactive login user
          --password <pwd>        Non-interactive login password
          --inspect               Print INI summary and exit

        Daily options:
          --user <id>             Operator user id (default: DEMO)
          --seed-ledger           Seed demo CURRLEDGE rows before endofday

        AS400 JDBC (real login):
          set CAC_DB=jdbc
          set CAC_AS400_HOST=your.as400.host
          set CAC_JDBC_CACDB=jdbc:as400://host/CACDB;naming=system
          (also CAC_JDBC_APMODDTA, CAC_JDBC_RAWDATA — see docs/deploy-java.md)
        """);
  }

  private static void runLoginShell(List<String> argv) throws Exception {
    Variant variant = Variant.ALAI;
    DbMode dbMode = DbMode.parse(null);
    Path iniPath = null;
    String user = null;
    String password = null;
    boolean inspect = false;

    for (int i = 0; i < argv.size(); i++) {
      String a = argv.get(i);
      switch (a) {
        case "--inspect" -> inspect = true;
        case "--variant" -> variant = Variant.parse(argv.get(++i));
        case "--db" -> dbMode = DbMode.parse(argv.get(++i));
        case "--ini" -> iniPath = Path.of(argv.get(++i));
        case "--user" -> user = argv.get(++i);
        case "--password" -> password = argv.get(++i);
        default -> throw new IllegalArgumentException("Unknown argument: " + a);
      }
    }

    if (iniPath == null) {
      String resource = variant == Variant.ALAI ? "config/alaicac.ini" : "config/cac.ini";
      iniPath = resolveIni(resource);
    }

    IniConfig config;
    try {
      config = IniLoader.load(iniPath);
    } catch (Exception e) {
      System.err.println("INI not loaded (" + iniPath + "); empty profiles. " + e.getMessage());
      config = new IniConfig(java.util.Map.of(), null, null, List.of(), java.util.Map.of());
    }

    System.out.println("=== CAC Enterprise (Java cacentrp) ===\n");
    System.out.println("Variant : " + variant);
    System.out.println(config.summarize());
    System.out.println();
    if (inspect) return;

    if (user == null) {
      BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
      System.out.print("User ID: ");
      user = br.readLine();
      System.out.print("Password: ");
      password = br.readLine();
    }

    System.out.println("Database mode: " + dbMode.name().toLowerCase(Locale.ROOT)
        + (dbMode == DbMode.MOCK ? " (set --db jdbc or CAC_DB=jdbc for AS400)" : ""));

    try (DbAdapter db = DbAdapters.create(dbMode)) {
      Session session = Login.login(variant, config, db, user, password == null ? "" : password);
      System.out.println("\nOpening CAC Enterprise...\n");
      System.out.println(Frame.render(session));
      System.out.println("Daily processing: cacentrp daily list | inspect | endofday");
      if (dbMode == DbMode.JDBC) {
        System.out.println("Note: daily CURRLEDGE mappers are still migrating from TypeScript; JDBC is used for login/SYRUSERID.");
      }
    }
  }

  private static void runDaily(List<String> argv) {
    if (argv.isEmpty()) {
      usage();
      return;
    }
    String cmd = argv.get(0);
    String userId = "DEMO";
    boolean seed = false;
    for (int i = 1; i < argv.size(); i++) {
      String a = argv.get(i);
      if ("--user".equals(a)) userId = argv.get(++i);
      else if ("--seed-ledger".equals(a)) seed = true;
      else throw new IllegalArgumentException("Unknown daily argument: " + a);
    }

    switch (cmd) {
      case "list" -> {
        System.out.println("=== Daily Processing stages (Java) ===\n");
        System.out.print(Pipeline.formatStages());
      }
      case "inspect" -> System.out.print(Pipeline.inspect());
      case "endofday" -> {
        DailyStore store = DailyStore.create();
        if (seed) store.seedDemo(5, userId);
        EndOfDay.Result r = EndOfDay.run(store, new EndOfDay.Options(true, true));
        System.out.println(r.message());
        System.out.println("CURRLEDGE=" + store.currLedge.size() + " CURRLEDGEX=" + store.currLedgeX.size());
      }
      default -> throw new IllegalArgumentException(
          "Unknown daily command: " + cmd + " (use list|inspect|endofday)");
    }
  }

  /** Prefer filesystem path next to CWD, else extract from classpath resources. */
  static Path resolveIni(String resource) throws Exception {
    Path local = Path.of("src/main/resources", resource);
    if (Files.isRegularFile(local)) return local.toAbsolutePath();
    Path cwd = Path.of(resource);
    if (Files.isRegularFile(cwd)) return cwd.toAbsolutePath();
    Path configDir = Path.of("config", Path.of(resource).getFileName().toString());
    if (Files.isRegularFile(configDir)) return configDir.toAbsolutePath();

    var url = Main.class.getClassLoader().getResource(resource);
    if (url == null) throw new IllegalStateException("Missing resource " + resource);
    if ("file".equals(url.getProtocol())) {
      return Path.of(url.toURI());
    }
    // shaded jar: copy to temp
    Path tmp = Files.createTempFile("cac-", "-" + Path.of(resource).getFileName());
    try (var in = Main.class.getClassLoader().getResourceAsStream(resource)) {
      if (in == null) throw new IllegalStateException("Missing resource stream " + resource);
      Files.write(tmp, in.readAllBytes());
    }
    tmp.toFile().deleteOnExit();
    return tmp;
  }
}
