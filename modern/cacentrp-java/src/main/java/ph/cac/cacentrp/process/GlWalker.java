package ph.cac.cacentrp.process;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Port of w_glwalker for <strong>APLN → *P.GLW</strong> only.
 * NLSP CURRLEDGE rows → fixed-width 00/01/02 lines.
 */
public final class GlWalker {
  public static final String DEFAULT_GLWALKER_DIR = "C:\\CACENT~~1\\GLWALKER";
  private static final Charset LATIN1 = Charset.forName("ISO-8859-1");

  private GlWalker() {}

  public record Options(
      LocalDate processDate,
      String controlCode,
      String groupNumber,
      String journalNumber,
      double bookingRate,
      Path outDir
  ) {
    public static Options defaults(Path outDir) {
      LocalDate d = LocalDate.now();
      String stamp = Pad.formatMmDdYy(d);
      return new Options(d, "CAC1", stamp, "CAC" + stamp, 1.0, outDir);
    }
  }

  public record Result(
      boolean ok,
      String filename,
      Path path,
      int headerCount,
      int detailCount,
      List<String> lines,
      String detail
  ) {}

  public static Result runAplnPglw(List<CurrLedgeRow> currLedge, Options options) throws IOException {
    LocalDate processDate = options.processDate() != null ? options.processDate() : LocalDate.now();
    String controlCode = blankTo(options.controlCode(), "CAC1");
    String groupNumber = blankTo(options.groupNumber(), Pad.formatMmDdYy(processDate));
    String journalNumber = blankTo(options.journalNumber(), "CAC" + Pad.formatMmDdYy(processDate));
    double rate = options.bookingRate() <= 0 ? 1.0 : options.bookingRate();

    List<CurrLedgeRow> filtered = new ArrayList<>();
    for (CurrLedgeRow r : currLedge) {
      if (r.coCode == null || r.coCode.isBlank() || "APLN".equalsIgnoreCase(r.coCode)) {
        filtered.add(r);
      }
    }

    List<Detail> details = toDetails(filtered, controlCode, groupNumber, journalNumber, processDate, rate);
    String filename = Pad.formatMmDdYy(processDate) + "P.GLW";
    if (details.isEmpty()) {
      return new Result(true, filename, null, 0, 0, List.of(), "No CURRLEDGE rows for APLN");
    }

    List<Header> headers = buildHeaders(details);
    Control control = new Control(
        "00",
        Pad.padLeftZero(headers.size(), 12),
        Pad.padLeftZero(details.size(), 12),
        Pad.padRightSpace("", 100)
    );

    List<String> lines = new ArrayList<>();
    lines.add(control.gwrect + control.gwtoth + control.gwtotd + control.filler);
    for (Header h : headers) {
      lines.add(headerLine(h));
      for (Detail d : details) {
        if (d.gwctle.trim().equals(h.gwctle.trim())
            && d.gwgrpn.trim().equals(h.gwgrpn.trim())
            && d.gwgrpd.equals(h.gwgrpd)) {
          lines.add(detailLine(d));
        }
      }
    }

    Path path = null;
    if (options.outDir() != null) {
      Files.createDirectories(options.outDir());
      path = options.outDir().resolve(filename);
      Files.writeString(path, String.join("\r\n", lines) + "\r\n", LATIN1);
    }

    return new Result(
        true,
        filename,
        path,
        headers.size(),
        details.size(),
        lines,
        "Wrote " + headers.size() + " header(s), " + details.size() + " detail(s) → " + filename
    );
  }

  private static List<Detail> toDetails(
      List<CurrLedgeRow> rows,
      String controlCode,
      String groupNumber,
      String journalNumber,
      LocalDate processDate,
      double rate
  ) {
    List<Detail> details = new ArrayList<>();
    String gwgrpd = Pad.formatMmDdYyyy(processDate);
    int seq = 0;
    for (CurrLedgeRow row : rows) {
      String dest = row.recDest == null ? "" : row.recDest.toLowerCase(Locale.ROOT);
      if ("lsp".equals(dest)) continue;
      seq++;
      String unit = row.unit == null || row.unit.isBlank() ? "X001" : row.unit.trim();
      double orig = row.amount;
      double local = row.origCy != null && !row.origCy.isBlank() && !"PHP".equalsIgnoreCase(row.origCy)
          ? orig * rate
          : orig;
      String refDate = row.refDate == null || row.refDate.isBlank()
          ? Pad.formatMmDdYyyy(processDate)
          : formatRefDate(row.refDate, processDate);
      details.add(new Detail(
          "02",
          Pad.padRightSpace(controlCode, 4),
          Pad.padRightSpace(groupNumber, 10),
          gwgrpd,
          Pad.padRightSpace(journalNumber, 20),
          gwgrpd,
          Pad.padLeftZero(seq, 4),
          " ",
          Pad.padRightSpace("APLANS", 7),
          Pad.padRightSpace(row.acctCode, 10),
          Pad.padRightSpace(blankTo(row.origCy, "PHP"), 3),
          Pad.padRightSpace(unit, 7),
          Pad.padRightSpace(blankTo(row.lob, "01"), 4),
          "CR".equalsIgnoreCase(row.drCr) ? "C" : "D",
          Pad.amountToImplied2(orig, 16),
          Pad.amountToImplied2(local, 16),
          Pad.padRightSpace("", 3),
          Pad.padRightSpace(safeSlice(row.refNo, 12), 12),
          Pad.padRightSpace("", 12),
          Pad.padRightSpace("", 20),
          Pad.padRightSpace(blankTo(row.foCode, ""), 13),
          "N",
          Pad.padRightSpace("", 1),
          Pad.padRightZero("", 16),
          Pad.padRightSpace("", 2),
          "N",
          Pad.padRightSpace(refDate, 10),
          Pad.padRightSpace("", 8),
          Pad.padRightSpace("", 34),
          Pad.padRightSpace("", 4),
          Pad.padRightSpace("", 4),
          Pad.padRightSpace("", 15),
          Pad.padRightSpace("", 8),
          Pad.padRightSpace("", 34),
          Pad.padRightSpace("", 1)
      ));
    }
    return details;
  }

  private static List<Header> buildHeaders(List<Detail> details) {
    Map<String, List<Detail>> groups = new LinkedHashMap<>();
    for (Detail d : details) {
      String key = d.gwctle + "|" + d.gwgrpn + "|" + d.gwgrpd;
      groups.computeIfAbsent(key, k -> new ArrayList<>()).add(d);
    }
    List<Header> headers = new ArrayList<>();
    int seq = 0;
    for (List<Detail> rows : groups.values()) {
      seq++;
      long hash = 0;
      double origDr = 0, origCr = 0, locDr = 0, locCr = 0;
      for (Detail r : rows) {
        try {
          hash += Long.parseLong(r.gwactc.trim());
        } catch (NumberFormatException ignored) {
          // non-numeric account codes
        }
        double o = parseImplied2(r.gwoamt);
        double l = parseImplied2(r.gwlamt);
        if ("D".equals(r.gwdccd)) {
          origDr += o;
          locDr += l;
        } else {
          origCr += o;
          locCr += l;
        }
      }
      Detail first = rows.get(0);
      headers.add(new Header(
          "01",
          first.gwctle,
          first.gwgrpn,
          first.gwgrpd,
          Pad.padRightSpace("", 28),
          Pad.padLeftZero(seq, 4),
          Pad.padRightSpace("", 1),
          "P",
          Pad.padRightZero("0", 2),
          "N",
          Pad.padRightSpace("", 2),
          Pad.padRightSpace("", 4),
          Pad.padLeftZero(rows.size(), 12),
          Pad.padLeftZero(String.valueOf(hash), 12),
          Pad.amountToImplied2(origDr, 16),
          Pad.amountToImplied2(origCr, 16),
          Pad.amountToImplied2(locDr, 16),
          Pad.amountToImplied2(locCr, 16),
          Pad.padRightSpace("", 8),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 3),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 8),
          Pad.padRightSpace("", 1),
          Pad.padRightSpace("", 30),
          Pad.padRightSpace("", 1)
      ));
    }
    return headers;
  }

  private static String headerLine(Header h) {
    return h.gwrect + h.gwctle + h.gwgrpn + h.gwgrpd + h.filler + h.gwgrps + h.filler1
        + h.gwmbar + h.gwvers + h.gwcloa + h.gwclop + h.gwcloy + h.gwtotd + h.gwtota
        + h.gwtotod + h.gwtotoc + h.gwtotld + h.gwtotlc + h.filler2 + h.gwrecs + h.gwrecj
        + h.gwjoub + h.gwcurc + h.gwauto + h.gwauta + h.gwbegb + h.gwsack + h.gwsackb
        + h.gwratt + h.gwexcr + h.gwicoc + h.gwicos + h.gwacc + h.gwrevd + h.gwconi
        + h.gwdesc + h.gwbalsw;
  }

  private static String detailLine(Detail d) {
    return d.gwrect + d.gwctle + d.gwgrpn + d.gwgrpd + d.gwjrnn + d.gwjrnd + d.gwseqn
        + d.gwfil1 + d.gwcmpy + d.gwactc + d.gwcurr + d.gwcntr + d.gwlobc + d.gwdccd
        + d.gwoamt + d.gwlamt + d.gwtrnc + d.gwref1 + d.gwref2 + d.gwref3 + d.gwref4
        + d.gwencs + d.gwrtts + d.gwstaa + d.gwstav + d.gwadbs + d.gwdocr + d.gwrevd
        + d.gwreva + d.gwreve + d.gwrtty + d.gwxchr + d.gwrted + d.gwsacc + d.gwfil2;
  }

  private static double parseImplied2(String s) {
    try {
      return Long.parseLong(s) / 100.0;
    } catch (Exception e) {
      return 0;
    }
  }

  private static String formatRefDate(String refDate, LocalDate fallback) {
    String s = refDate.trim();
    if (s.matches("\\d{8}")) return s;
    if (s.matches("\\d{4}-\\d{2}-\\d{2}.*")) {
      return Pad.formatMmDdYyyy(LocalDate.parse(s.substring(0, 10)));
    }
    return Pad.formatMmDdYyyy(fallback);
  }

  private static String blankTo(String v, String d) {
    return v == null || v.isBlank() ? d : v;
  }

  private static String safeSlice(String v, int n) {
    if (v == null) return "";
    return v.length() <= n ? v : v.substring(0, n);
  }

  private record Control(String gwrect, String gwtoth, String gwtotd, String filler) {}

  private record Header(
      String gwrect, String gwctle, String gwgrpn, String gwgrpd, String filler, String gwgrps,
      String filler1, String gwmbar, String gwvers, String gwcloa, String gwclop, String gwcloy,
      String gwtotd, String gwtota, String gwtotod, String gwtotoc, String gwtotld, String gwtotlc,
      String filler2, String gwrecs, String gwrecj, String gwjoub, String gwcurc, String gwauto,
      String gwauta, String gwbegb, String gwsack, String gwsackb, String gwratt, String gwexcr,
      String gwicoc, String gwicos, String gwacc, String gwrevd, String gwconi, String gwdesc,
      String gwbalsw
  ) {}

  private record Detail(
      String gwrect, String gwctle, String gwgrpn, String gwgrpd, String gwjrnn, String gwjrnd,
      String gwseqn, String gwfil1, String gwcmpy, String gwactc, String gwcurr, String gwcntr,
      String gwlobc, String gwdccd, String gwoamt, String gwlamt, String gwtrnc, String gwref1,
      String gwref2, String gwref3, String gwref4, String gwencs, String gwrtts, String gwstaa,
      String gwstav, String gwadbs, String gwdocr, String gwrevd, String gwreva, String gwreve,
      String gwrtty, String gwxchr, String gwrted, String gwsacc, String gwfil2
  ) {}
}
