package ph.cac.cacentrp.process;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Copy *P.GLW from GLWALKER → I:\adhoc, then move original into
 * GLWALKER\backup_yyyyMMdd\.
 */
public final class GlwPublish {
  public static final String DEFAULT_ADHOC = "I:\\adhoc";

  private GlwPublish() {}

  public record Result(int copied, int moved, Path adhocDir, Path backupDir, List<String> files, String detail) {}

  public static Result publishPglw(Path glwalkerDir, Path adhocDir, LocalDate day) throws IOException {
    if (glwalkerDir == null) glwalkerDir = Path.of(GlWalker.DEFAULT_GLWALKER_DIR);
    if (adhocDir == null) adhocDir = Path.of(DEFAULT_ADHOC);
    LocalDate d = day != null ? day : LocalDate.now();
    Path backupDir = glwalkerDir.resolve("backup_" + Pad.formatYyyyMmDd(d));

    Files.createDirectories(adhocDir);
    Files.createDirectories(backupDir);

    List<Path> sources = new ArrayList<>();
    if (Files.isDirectory(glwalkerDir)) {
      try (DirectoryStream<Path> stream = Files.newDirectoryStream(glwalkerDir, "*P.GLW")) {
        for (Path p : stream) {
          if (Files.isRegularFile(p)) sources.add(p);
        }
      }
    }
    if (sources.isEmpty()) {
      return new Result(0, 0, adhocDir, backupDir, List.of(),
          "No *P.GLW files in " + glwalkerDir);
    }

    List<String> names = new ArrayList<>();
    int copied = 0;
    int moved = 0;
    for (Path src : sources) {
      String name = src.getFileName().toString();
      Path destCopy = adhocDir.resolve(name);
      Files.copy(src, destCopy, StandardCopyOption.REPLACE_EXISTING);
      copied++;
      Path destMove = backupDir.resolve(name);
      Files.move(src, destMove, StandardCopyOption.REPLACE_EXISTING);
      moved++;
      names.add(name);
    }

    return new Result(
        copied,
        moved,
        adhocDir,
        backupDir,
        names,
        "Copied " + copied + " → " + adhocDir + "; moved " + moved + " → " + backupDir
    );
  }
}
