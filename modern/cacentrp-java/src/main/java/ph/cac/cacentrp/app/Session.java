package ph.cac.cacentrp.app;

import java.time.Instant;
import ph.cac.cacentrp.Variant;

public record Session(
    String userId,
    String userName,
    String sessionId,
    Variant variant,
    Instant loginAt
) {}
