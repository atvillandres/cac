#!/usr/bin/env python3
"""Extract objects from PowerBuilder PBL/PBD/EXE libraries (ANSI HDR* 0600).

Based on Arnd Schmidt's PBL File Format notes (PB5–11.5).
"""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path
from typing import Any

SOURCE_EXTS = {".sra", ".srd", ".srw", ".sru", ".srm", ".srf", ".srs", ".srq", ".srj"}


def u32(buf: bytes, off: int) -> int:
    return struct.unpack_from("<I", buf, off)[0]


def u16(buf: bytes, off: int) -> int:
    return struct.unpack_from("<H", buf, off)[0]


def read_dat_chain(data: bytes, offset: int, net_size: int, absolute: bool) -> bytes:
    out = bytearray()
    while offset and len(out) < net_size:
        if offset + 10 > len(data) or data[offset : offset + 4] != b"DAT*":
            raise ValueError(f"Expected DAT* at {offset:#x}")
        nxt = u32(data, offset + 4)
        length = u16(data, offset + 8)
        out.extend(data[offset + 10 : offset + 10 + length])
        offset = nxt
    return bytes(out[:net_size])


def parse_node_entries(node: bytes) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    pos = 32
    count = u16(node, 20)
    found = 0
    while pos + 24 <= len(node) and found < count:
        if node[pos : pos + 4] != b"ENT*":
            nxt = node.find(b"ENT*", pos + 1)
            if nxt < 0:
                break
            pos = nxt
            continue
        data_off = u32(node, pos + 8)
        size = u32(node, pos + 12)
        dt = u32(node, pos + 16)
        comment_len = u16(node, pos + 20)
        name_len = u16(node, pos + 22)
        raw_name = node[pos + 24 : pos + 24 + name_len]
        raw_comment = node[pos + 24 + name_len : pos + 24 + name_len + comment_len]
        name = raw_name.split(b"\x00", 1)[0].decode("latin1", errors="replace")
        comment = raw_comment.split(b"\x00", 1)[0].decode("latin1", errors="replace")
        entries.append(
            {
                "name": name,
                "comment": comment,
                "offset": data_off,
                "size": size,
                "datetime": dt,
            }
        )
        pos = pos + 24 + name_len + comment_len
        found += 1
    return entries


def walk_nodes(data: bytes, node_off: int, seen: set[int] | None = None) -> list[dict[str, Any]]:
    if seen is None:
        seen = set()
    if not node_off or node_off in seen or node_off + 3072 > len(data):
        return []
    seen.add(node_off)
    node = data[node_off : node_off + 3072]
    if node[:4] != b"NOD*":
        return []
    left = u32(node, 4)
    right = u32(node, 12)
    return (
        parse_node_entries(node)
        + walk_nodes(data, left, seen)
        + walk_nodes(data, right, seen)
    )


def library_base(data: bytes) -> tuple[bytes, int, bool]:
    """Return (view, base_offset, offsets_are_absolute)."""
    if len(data) >= 512 and data[-512:-508] == b"TRL*":
        hdr = u32(data, len(data) - 508)
        return data, hdr, True  # EXE/DLL: ENT offsets are absolute file offsets
    idx = data.find(b"HDR*PowerBuilder")
    if idx < 0:
        raise ValueError("No PowerBuilder HDR* signature found")
    if idx == 0:
        return data, 0, False
    return data[idx:], 0, False


def extract(path: Path, out_dir: Path, source_only: bool = False) -> list[dict[str, Any]]:
    raw = path.read_bytes()
    view, base, absolute = library_base(raw)
    search_from = base if absolute else 0
    nod = view.find(b"NOD*", search_from)
    if nod < 0:
        raise ValueError(f"No NOD* directory in {path}")
    entries = walk_nodes(view, nod)
    dedup: dict[str, dict[str, Any]] = {}
    for e in entries:
        dedup[e["name"]] = e
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[dict[str, Any]] = []
    for name, e in sorted(dedup.items(), key=lambda kv: kv[0].lower()):
        ext = Path(name).suffix.lower()
        if source_only and ext not in SOURCE_EXTS:
            continue
        blob = read_dat_chain(view, e["offset"], e["size"], absolute)
        target = out_dir / name.replace("/", "_").replace("\\", "_")
        if ext in SOURCE_EXTS:
            target.write_bytes(blob.replace(b"\r\n", b"\n").replace(b"\r", b"\n"))
        else:
            target.write_bytes(blob)
        meta = {**e, "bytes": len(blob), "path": str(target)}
        written.append(meta)
        print(f"  {name:40s} {len(blob):7d}")
    (out_dir / "_manifest.json").write_text(json.dumps(written, indent=2))
    print(f"Wrote {len(written)} objects -> {out_dir}")
    return written


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("library", type=Path, help="PBL/PBD/EXE path")
    ap.add_argument("-o", "--out", type=Path, required=True, help="Output directory")
    ap.add_argument("--source-only", action="store_true")
    args = ap.parse_args()
    extract(args.library, args.out, source_only=args.source_only)


if __name__ == "__main__":
    main()
