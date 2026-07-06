#!/usr/bin/env python3
"""Validate core quality gates for a fused skill."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
RESOURCE_RE = re.compile(r"`((?:references|scripts|assets)/[^`\s]+)`")

REQUIRED_TERMS = {
    "conflict resolution": ("conflict", "precedence", "preserve", "sequence", "scope"),
    "progressive disclosure": ("reference", "progressive", "conditional"),
    "taste as operation": ("taste", "quality gate", "decision"),
    "validation": ("validate", "verify", "test"),
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def parse_frontmatter(text: str) -> dict[str, str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        raise ValueError("SKILL.md is missing YAML frontmatter")
    values: dict[str, str] = {}
    for raw_line in match.group(1).splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if ":" not in line:
            raise ValueError(f"Invalid frontmatter line: {line}")
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    extra_keys = sorted(set(values) - {"name", "description"})
    if extra_keys:
        raise ValueError(f"Frontmatter has unsupported keys: {', '.join(extra_keys)}")
    for key in ("name", "description"):
        if not values.get(key):
            raise ValueError(f"Frontmatter missing required key: {key}")
    if not re.fullmatch(r"[a-z0-9-]{1,64}", values["name"]):
        raise ValueError("Skill name must be lowercase letters, digits, and hyphens only")
    return values


def check_resources(skill_dir: Path, skill_md: str) -> list[str]:
    problems: list[str] = []
    for resource in sorted(set(RESOURCE_RE.findall(skill_md))):
        path = skill_dir / resource
        if not path.exists():
            problems.append(f"Referenced resource does not exist: {resource}")
    return problems


def check_required_terms(text: str) -> list[str]:
    lower = text.lower()
    problems: list[str] = []
    for label, terms in REQUIRED_TERMS.items():
        if not all(term in lower for term in terms):
            problems.append(f"Missing or weak fused-skill gate: {label}")
    return problems


def validate(skill_dir: Path) -> list[str]:
    problems: list[str] = []
    skill_path = skill_dir / "SKILL.md"
    if not skill_path.exists():
        return ["Missing SKILL.md"]

    skill_text = read_text(skill_path)
    try:
        parse_frontmatter(skill_text)
    except ValueError as exc:
        problems.append(str(exc))

    problems.extend(check_resources(skill_dir, skill_text))
    problems.extend(check_required_terms(skill_text))

    for expected in (
        "references/fusion-protocol.md",
        "references/conflict-patterns.md",
        "references/taste-principles.md",
        "scripts/analyze_skills.py",
    ):
        if not (skill_dir / expected).exists():
            problems.append(f"Missing expected rongheskill resource: {expected}")

    protocol = skill_dir / "references" / "fusion-protocol.md"
    if protocol.exists():
        protocol_text = read_text(protocol).lower()
        for term in ("source inventory", "conflict mapping", "precedence", "validation"):
            if term not in protocol_text:
                problems.append(f"fusion-protocol.md missing section signal: {term}")

    taste = skill_dir / "references" / "taste-principles.md"
    if taste.exists():
        taste_text = read_text(taste).lower()
        if "taste must change decisions" not in taste_text:
            problems.append("taste-principles.md does not operationalize taste")

    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a fused skill's quality gates.")
    parser.add_argument("skill_dir", help="Path to the skill directory")
    args = parser.parse_args()

    skill_dir = Path(args.skill_dir).resolve()
    problems = validate(skill_dir)
    if problems:
        print("Fusion skill validation failed:")
        for problem in problems:
            print(f"- {problem}")
        return 1

    print("Fusion skill quality gates passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
