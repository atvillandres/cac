package ph.cac.cacentrp.process;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public final class Pad {
  private Pad() {}

  public static String padRightSpace(String value, int width) {
    String s = value == null ? "" : value;
    if (s.length() >= width) return s.substring(0, width);
    return s + " ".repeat(width - s.length());
  }

  public static String padLeftZero(String value, int width) {
    String s = value == null ? "" : value;
    if (s.length() >= width) return s.substring(s.length() - width);
    return "0".repeat(width - s.length()) + s;
  }

  public static String padLeftZero(int value, int width) {
    return padLeftZero(String.valueOf(value), width);
  }

  public static String padRightZero(String value, int width) {
    String s = value == null ? "" : value;
    if (s.length() >= width) return s.substring(0, width);
    return s + "0".repeat(width - s.length());
  }

  public static String amountToImplied2(double amount, int width) {
    long cents = Math.round(Math.abs(amount) * 100.0);
    return padLeftZero(String.valueOf(cents), width);
  }

  public static String formatMmDdYy(LocalDate d) {
    return d.format(DateTimeFormatter.ofPattern("MMddyy"));
  }

  public static String formatMmDdYyyy(LocalDate d) {
    return d.format(DateTimeFormatter.ofPattern("MMddyyyy"));
  }

  public static String formatYyyyMmDd(LocalDate d) {
    return d.format(DateTimeFormatter.BASIC_ISO_DATE);
  }
}
