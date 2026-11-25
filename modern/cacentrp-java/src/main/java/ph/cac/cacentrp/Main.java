package ph.cac.cacentrp;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
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
import ph.cac.cacentrp.process.GlWalker;
import ph.cac.cacentrp.process.GlwPublish;
import ph.cac.cacentrp.process.Pipeline;

/**
 * Java CAC — scoped flow: ODBC login → APLN *P.GLW → publish to I:\adhoc + backup.
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
          cacentrp daily <list|inspect|pglw|publish|endofday> [options]

        Login options:
          --variant ALAI|AP|PBL   Deployment flavor (default: AP for P.GLW)
          --db mock|odbc|jdbc     Database mode (default: mock; env CAC_DB=odbc)
          --ini <path>            Path to cac.ini / alaicac.ini
          --user <id>             Non-interactive login user
          --password <pwd>        Non-interactive login password
          --inspect               Print INI summary and exit

        daily pglw options:
          --user <id>             Operator (default: DEMO)
          --seed-ledger           Seed demo APLN CURRLEDGE rows
          --out <dir>             GLWALKER output (default: C:\\CACENT~~1\\GLWALKER)

        daily publish options:
          --glwalker <dir>        Source GLWALKER folder
          --adhoc <dir>           Destination (default: I:\\adhoc)

        ODBC (same DSNs as PowerBuilder):
          set CAC_DB=odbc
          set CAC_AS400_HOST=your.as400.host
          set CAC_JDBC_CACDB=jdbc:as400://host/CACDB;naming=system
          set CAC_JDBC_APMODDTA=jdbc:as400://host/APMODDTA;naming=system
          set CAC_JDBC_RAWDATA=jdbc:as400://host/RAWDATA;naming=system
        """);
  }

  private static void runLoginShell(List<String> argv) throws Exception {
    Variant variant = Variant.AP;
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

    System.out.println("=== CAC Enterprise (Java · APLN *P.GLW) ===\n");
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
        + (dbMode == DbMode.MOCK ? " (set --db odbc or CAC_DB=odbc for AS400 DSNs)" : " · ODBC DSN profiles"));

    try (DbAdapter db = DbAdapters.create(dbMode)) {
      Session session = Login.login(variant, config, db, user, password == null ? "" : password);
      System.out.println("\nOpening CAC Enterprise...\n");
      System.out.println(Frame.render(session));
      System.out.println("P.GLW flow: cacentrp daily pglw --seed-ledger | publish");
      System.out.println(Pipeline.inspect());
    }
  }

  private static void runDaily(List<String> argv) throws Exception {
    if (argv.isEmpty()) {
      usage();
      return;
    }
    String cmd = argv.get(0);
    String userId = "DEMO";
    boolean seed = false;
    Path outDir = Path.of(GlWalker.DEFAULT_GLWALKER_DIR);
    Path glwalkerDir = Path.of(GlWalker.DEFAULT_GLWALKER_DIR);
    Path adhocDir = Path.of(GlwPublish.DEFAULT_ADHOC);

    for (int i = 1; i < argv.size(); i++) {
      String a = argv.get(i);
      switch (a) {
        case "--user" -> userId = argv.get(++i);
        case "--seed-ledger" -> seed = true;
        case "--out" -> outDir = Path.of(argv.get(++i));
        case "--glwalker" -> glwalkerDir = Path.of(argv.get(++i));
        case "--adhoc" -> adhocDir = Path.of(argv.get(++i));
        default -> throw new IllegalArgumentException("Unknown daily argument: " + a);
      }
    }

    switch (cmd) {
      case "list" -> {
        System.out.println("=== P.GLW flow stages ===\n");
        System.out.print(Pipeline.formatStages());
      }
      case "inspect" -> System.out.print(Pipeline.inspect());
      case "pglw" -> {
        DailyStore store = DailyStore.create();
        if (seed || store.currLedge.isEmpty()) store.seedApln(8, userId);
        GlWalker.Result r = GlWalker.runAplnPglw(store.currLedge, GlWalker.Options.defaults(outDir));
        System.out.println((r.ok() ? "OK" : "!!") + " " + r.detail());
        if (r.path() != null) System.out.println("path=" + r.path());
        System.out.println("headers=" + r.headerCount() + " details=" + r.detailCount()
            + " CURRLEDGE=" + store.currLedge.size());
      }
      case "publish" -> {
        GlwPublish.Result r = GlwPublish.publishPglw(glwalkerDir, adhocDir, LocalDate.now());
        System.out.println(r.detail());
        for (String f : r.files()) System.out.println("  " + f);
      }
      case "endofday" -> {
        DailyStore store = DailyStore.create();
        if (seed) store.seedDemo(5, userId);
        EndOfDay.Result r = EndOfDay.run(store, new EndOfDay.Options(true, true));
        System.out.println(r.message());
        System.out.println("CURRLEDGE=" + store.currLedge.size() + " CURRLEDGEX=" + store.currLedgeX.size());
      }
      default -> throw new IllegalArgumentException(
          "Unknown daily command: " + cmd + " (use list|inspect|pglw|publish|endofday)");
    }
  }

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
    Path tmp = Files.createTempFile("cac-", "-" + Path.of(resource).getFileName());
    try (var in = Main.class.getClassLoader().getResourceAsStream(resource)) {
      if (in == null) throw new IllegalStateException("Missing resource stream " + resource);
      Files.write(tmp, in.readAllBytes());
    }
    tmp.toFile().deleteOnExit();
    return tmp;
  }
}
