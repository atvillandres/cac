package ph.cac.cacentrp;

public enum Variant {
  ALAI,
  AP,
  PBL;

  public static Variant parse(String raw) {
    if (raw == null || raw.isBlank()) return ALAI;
    return Variant.valueOf(raw.trim().toUpperCase());
  }
}
