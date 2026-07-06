#!/usr/bin/env python3
"""Inventory skills and generate starter fusion artifacts."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable


HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)

CONSTRAINT_TERMS = (
    "must",
    "never",
    "always",
    "required",
    "validate",
    "verify",
    "test",
    "guardrail",
    "safety",
    "do not",
)

TOOL_TERMS = (
    "script",
    "python",
    "bash",
    "powershell",
    "mcp",
    "api",
    "playwright",
    "browser",
    "git",
)

STYLE_TERMS = (
    "style",
    "tone",
    "voice",
    "design",
    "taste",
    "concise",
    "visual",
    "format",
    "markdown",
)


@dataclass
class SkillInventory:
    path: str
    name: str
    description: str
    headings: list[str]
    resources: dict[str, list[str]]
    constraint_hints: list[str]
    tool_hints: list[str]
    style_hints: list[str]


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8-sig")


def parse_frontmatter(text: str) -> dict[str, str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}
    values: dict[str, str] = {}
    for raw_line in match.group(1).splitlines():
        line = raw_line.strip()
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def extract_hints(text: str, terms: Iterable[str], limit: int = 8) -> list[str]:
    hints: list[str] = []
    in_code_block = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue
        if not line or line.startswith("#") or len(line) > 220:
            continue
        lower = line.lower()
        if any(term in lower for term in terms):
            cleaned = re.sub(r"\s+", " ", line)
            cleaned = re.sub(r"^[-*]\s+", "", cleaned)
            cleaned = re.sub(r"^\d+\.\s+", "", cleaned)
            cleaned = cleaned.strip()
            hints.append(cleaned)
        if len(hints) >= limit:
            break
    return hints


def list_resources(skill_dir: Path) -> dict[str, list[str]]:
    resources: dict[str, list[str]] = {}
    for folder in ("scripts", "references", "assets", "agents"):
        root = skill_dir / folder
        if not root.exists():
            continue
        files = []
        for child in root.rglob("*"):
            if child.is_file():
                files.append(child.relative_to(skill_dir).as_posix())
        resources[folder] = sorted(files)
    return resources


def locate_skill_dir(path: Path) -> Path:
    if path.is_file() and path.name == "SKILL.md":
        return path.parent
    if (path / "SKILL.md").exists():
        return path
    raise FileNotFoundError(f"No SKILL.md found at {path}")


def inventory_skill(path: Path) -> SkillInventory:
    skill_dir = locate_skill_dir(path.resolve())
    skill_md = skill_dir / "SKILL.md"
    text = read_text(skill_md)
    frontmatter = parse_frontmatter(text)
    headings = [match.group(2).strip() for match in HEADING_RE.finditer(text)]
    return SkillInventory(
        path=str(skill_dir),
        name=frontmatter.get("name", skill_dir.name),
        description=frontmatter.get("description", ""),
        headings=headings,
        resources=list_resources(skill_dir),
        constraint_hints=extract_hints(text, CONSTRAINT_TERMS),
        tool_hints=extract_hints(text, TOOL_TERMS),
        style_hints=extract_hints(text, STYLE_TERMS),
    )


def token_set(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{2,}", value.lower())
        if token
    }


def conflict_hints(inventories: list[SkillInventory]) -> list[str]:
    hints: list[str] = []
    for index, left in enumerate(inventories):
        left_tokens = token_set(left.description + " " + " ".join(left.headings))
        for right in inventories[index + 1 :]:
            right_tokens = token_set(right.description + " " + " ".join(right.headings))
            overlap = sorted(left_tokens & right_tokens)
            if len(overlap) >= 6:
                hints.append(
                    f"Trigger or slice overlap: {left.name} <-> {right.name} "
                    f"share {', '.join(overlap[:10])}"
                )
            if left.constraint_hints and right.constraint_hints:
                hints.append(
                    f"Constraint reconciliation needed: {left.name} and {right.name} "
                    "both include strong validation or guardrail language."
                )
            if left.tool_hints and right.tool_hints:
                hints.append(
                    f"Tool precedence needed: {left.name} and {right.name} "
                    "both mention tools, scripts, APIs, or runtimes."
                )
            if left.style_hints and right.style_hints:
                hints.append(
                    f"Taste/style reconciliation needed: {left.name} and {right.name} "
                    "both carry output-style guidance."
                )
    return hints


def render_markdown(inventories: list[SkillInventory]) -> str:
    hints = conflict_hints(inventories)
    lines = [
        "# Skill Fusion Starter Report",
        "",
        "## Inventory",
        "",
        "| Skill | Description | Headings | Resources |",
        "| --- | --- | --- | --- |",
    ]
    for item in inventories:
        resources = ", ".join(
            f"{kind}:{len(paths)}" for kind, paths in sorted(item.resources.items())
        )
        headings = "; ".join(item.headings[:8])
        lines.append(
            "| {name} | {description} | {headings} | {resources} |".format(
                name=escape_table(item.name),
                description=escape_table(item.description),
                headings=escape_table(headings),
                resources=escape_table(resources or "none"),
            )
        )

    lines.extend(["", "## Conflict Hints", ""])
    if hints:
        lines.extend(f"- {hint}" for hint in hints)
    else:
        lines.append("- No obvious conflicts found by the static scan. Inspect manually.")

    lines.extend(["", "## Constraint Hints", ""])
    for item in inventories:
        if not item.constraint_hints:
            continue
        lines.append(f"### {item.name}")
        lines.extend(f"- {hint}" for hint in item.constraint_hints)
        lines.append("")

    lines.extend(
        [
            "## Fusion Ledger Template",
            "",
            "| Conflict | Source skills | Resolution | Reason | Residual risk |",
            "| --- | --- | --- | --- | --- |",
            "|  |  | preserve / sequence / scope / parameterize / defer / discard |  |  |",
            "",
            "## Next Steps",
            "",
            "1. Confirm protected outcomes for each skill.",
            "2. Resolve each conflict hint with an explicit precedence rule.",
            "3. Draft a single operating loop and move conditional detail to references.",
            "4. Validate scripts, frontmatter, resource links, and realistic prompts.",
        ]
    )
    return "\n".join(lines) + "\n"


def normalize_skill_name(raw: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")
    normalized = re.sub(r"-{2,}", "-", normalized)
    if not normalized:
        raise ValueError("fused skill name must include at least one letter or digit")
    if len(normalized) > 64:
        raise ValueError("fused skill name must be 64 characters or fewer")
    return normalized


def summarize_skill(item: SkillInventory) -> str:
    headings = ", ".join(item.headings[:5]) or "no headings"
    resources = ", ".join(
        f"{kind}:{len(paths)}" for kind, paths in sorted(item.resources.items())
    )
    return (
        f"- `{item.name}`: {item.description or 'No description found.'} "
        f"Key sections: {headings}. Resources: {resources or 'none'}."
    )


def render_draft_skill(
    inventories: list[SkillInventory], fused_name: str, title: str | None = None
) -> str:
    name = normalize_skill_name(fused_name)
    display_title = title or " ".join(part.capitalize() for part in name.split("-"))
    source_names = ", ".join(item.name for item in inventories)
    hints = conflict_hints(inventories)
    description = (
        "Fuse and operate the source skills "
        f"({source_names}) through one coherent workflow. Use when Codex needs the "
        "capabilities of these skills together, needs to resolve conflicts between "
        "their triggers, tools, validation gates, or output style, or needs a single "
        "integrated skill that preserves specialist strengths without loading every "
        "detail at once."
    )

    lines = [
        "---",
        f"name: {name}",
        f"description: {description}",
        "---",
        "",
        f"# {display_title}",
        "",
        "## Mission",
        "",
        "Operate the source skills as one coherent system. Preserve each skill's protected outcome, resolve conflicts with explicit precedence, and keep conditional detail progressively disclosed.",
        "",
        "## Source Skills",
        "",
    ]
    lines.extend(summarize_skill(item) for item in inventories)

    lines.extend(
        [
            "",
            "## Operating Loop",
            "",
            "1. Identify the user's protected outcome before choosing a source-skill branch.",
            "2. Load only the source skill or reference needed for the current branch.",
            "3. Apply precedence in this order: user instruction, safety or irreversible-risk rules, domain-specific constraints, deterministic validation, then style or taste preferences.",
            "4. Resolve conflicts with one named action: `preserve`, `sequence`, `scope`, `parameterize`, `defer`, or `discard`.",
            "5. Execute through the smallest coherent workflow that satisfies the protected outcome.",
            "6. Validate with direct evidence appropriate to the risk before claiming completion.",
            "",
            "## Conflict Ledger",
            "",
            "| Conflict | Source skills | Resolution | Reason | Residual risk |",
            "| --- | --- | --- | --- | --- |",
        ]
    )
    if hints:
        for hint in hints:
            lines.append(
                f"| {escape_table(hint)} | {escape_table(source_names)} | scope | Static scan found overlap; confirm by reading source instructions. | Needs manual review. |"
            )
    else:
        lines.append(
            "| No static conflict detected | all | preserve | Static scan did not find obvious overlap. | Manual review still required. |"
        )

    lines.extend(
        [
            "",
            "## Taste Rules",
            "",
            "- Prefer coherent execution over maximal coverage.",
            "- Keep source-skill precision where it protects correctness.",
            "- Defer rare detail to references instead of crowding the core loop.",
            "- Reject generic compromise when a precedence rule can make the decision sharper.",
            "- Treat taste as a quality gate: the final artifact should be more focused than simply concatenating the source skills.",
            "",
            "## Validation",
            "",
            "- Confirm frontmatter has only `name` and `description`.",
            "- Confirm every referenced resource exists.",
            "- Run or inspect deterministic scripts carried into the fused skill.",
            "- Test at least one realistic prompt that requires multiple source skills or a conflict decision.",
            "",
            "## Source Inventory Notes",
            "",
        ]
    )
    for item in inventories:
        lines.append(f"### {item.name}")
        if item.constraint_hints:
            lines.append("Constraint hints:")
            lines.extend(f"- {hint}" for hint in item.constraint_hints[:5])
        if item.tool_hints:
            lines.append("Tool hints:")
            lines.extend(f"- {hint}" for hint in item.tool_hints[:5])
        if item.style_hints:
            lines.append("Taste or style hints:")
            lines.extend(f"- {hint}" for hint in item.style_hints[:5])
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def escape_table(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ").strip()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate an inventory and starter conflict report for skill fusion."
    )
    parser.add_argument("skills", nargs="+", help="Skill directories or SKILL.md paths")
    parser.add_argument("--output", help="Write output to this path")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print JSON inventory instead of Markdown",
    )
    parser.add_argument(
        "--draft-skill",
        metavar="NAME",
        help="Render a fused SKILL.md draft with this skill name",
    )
    parser.add_argument(
        "--title",
        help="Optional display title for --draft-skill output",
    )
    args = parser.parse_args()

    try:
        inventories = [inventory_skill(Path(raw)) for raw in args.skills]
    except Exception as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 2

    if args.json and args.draft_skill:
        print("[error] --json cannot be combined with --draft-skill", file=sys.stderr)
        return 2

    if args.draft_skill:
        try:
            output_text = render_draft_skill(inventories, args.draft_skill, args.title)
        except ValueError as exc:
            print(f"[error] {exc}", file=sys.stderr)
            return 2
    elif args.json:
        payload = {
            "skills": [asdict(item) for item in inventories],
            "conflict_hints": conflict_hints(inventories),
        }
        output_text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    else:
        output_text = render_markdown(inventories)

    if args.output:
        Path(args.output).write_text(output_text, encoding="utf-8")
    else:
        print(output_text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
