#!/usr/bin/env python3
"""Merge database/impactprice/schemas/config_schema/Sequences/*.sql into tables/*.sql.
Run from repo root: python3 scripts/merge_config_schema_sequences.py"""
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "database/impactprice/schemas/config_schema"
tables_dir = BASE / "tables"
seq_dir = BASE / "Sequences"


def strip_liquibase_header(content: str) -> str:
    lines = content.splitlines()
    if lines and lines[0].strip() == "--liquibase formatted sql":
        return "\n".join(lines[1:]).lstrip("\n")
    return content


def main() -> None:
    seq_to_table = {}
    for f in sorted(tables_dir.glob("*.sql")):
        text = f.read_text()
        m = re.search(r"nextval\('config_schema\.([^']+)'", text)
        if not m:
            print("NO SEQ:", f)
            continue
        seq_to_table[m.group(1)] = f.name

    for seq_name, tbl_name in sorted(seq_to_table.items(), key=lambda x: x[1]):
        seq_path = seq_dir / f"{seq_name}.sql"
        tbl_path = tables_dir / tbl_name
        if not seq_path.exists():
            print("SKIP no seq file:", seq_name)
            continue
        seq_raw = seq_path.read_text()
        tbl_raw = tbl_path.read_text()
        if re.search(
            r"CREATE SEQUENCE IF NOT EXISTS\s+config_schema\." + re.escape(seq_name),
            tbl_raw,
        ):
            print("SKIP already merged:", tbl_name)
            continue
        seq_rest = strip_liquibase_header(seq_raw)
        seq_rest = re.sub(
            r"^CREATE SEQUENCE\s+config_schema\.",
            "CREATE SEQUENCE IF NOT EXISTS config_schema.",
            seq_rest,
            count=1,
            flags=re.MULTILINE,
        )
        tbl_rest = strip_liquibase_header(tbl_raw)
        merged = (
            "--liquibase formatted sql\n"
            + seq_rest.rstrip()
            + "\n\n"
            + tbl_rest.lstrip("\n")
        )
        if not merged.endswith("\n"):
            merged += "\n"
        tbl_path.write_text(merged)
        print("Merged:", tbl_name)


if __name__ == "__main__":
    main()
