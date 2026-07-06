---
name: rongheskill
description: Fuse, reconcile, and operationalize multiple Codex skills into one coherent higher-order skill. Use when Codex needs to merge accumulated skills, resolve contradictory workflows or slicing strategies, preserve useful specialist behavior, design a universal fusion skill, build a skill portfolio operating model, or turn many fragmented skill instructions into one integrated skill with strong execution quality and distinctive taste.
---

# Ronghe Skill

## Mission

Fuse many skills into one coherent operating skill without flattening their strengths. Preserve specialist precision where it matters, resolve contradictory slices explicitly, and produce an integrated workflow that improves execution quality, taste, and reuse.

## Operating Loop

1. Inventory the source skills before synthesizing.
   - Read each `SKILL.md` frontmatter and headings.
   - Use `scripts/analyze_skills.py` when there are several skills or when conflicts are hard to see manually.
   - Use `scripts/analyze_skills.py --draft-skill <name>` when a first fused `SKILL.md` draft is useful.
   - Record each skill's trigger, core workflow, resources, strict constraints, validation gates, and taste signals.

2. Separate intent from mechanics.
   - Intent is the user outcome the skill protects.
   - Mechanics are file formats, tools, slices, scripts, prompts, examples, or ordering rules.
   - Keep high-value intent even when mechanics conflict.

3. Build a conflict map before writing the fused skill.
   - Read `references/conflict-patterns.md` for common contradiction types.
   - Mark each conflict as `preserve`, `sequence`, `scope`, `parameterize`, `defer`, or `discard`.
   - Do not silently average incompatible instructions.

4. Compose the fused operating model.
   - Use `references/fusion-protocol.md` for the full synthesis procedure.
   - Define one primary loop, optional branches, and exact escalation rules.
   - Put only always-needed behavior in `SKILL.md`; move conditional detail into references.

5. Add taste deliberately.
   - Read `references/taste-principles.md` when the fusion affects product, writing, design, architecture, or agent behavior.
   - Turn taste into concrete decision rules, not vague adjectives.
   - Prefer fewer, sharper principles over broad style slogans.

6. Validate the fused skill against realistic tasks.
   - Check that trigger metadata is clear.
   - Verify resource references are discoverable.
   - Test any included scripts.
   - Forward-test with realistic prompts when practical.

## Fusion Output Contract

When asked to create or improve a fused skill, produce these artifacts:

- A concise `SKILL.md` with frontmatter, mission, operating loop, resource navigation, and validation rules.
- Reference files only for details that are conditional, long, or likely to be searched.
- Scripts only for repeatable mechanical work such as inventory, conflict scoring, or report generation.
- A conflict ledger showing what was preserved, sequenced, scoped, parameterized, deferred, or discarded.
- A validation note that names the checks actually run.

## Resource Navigation

- `references/fusion-protocol.md`: Use for end-to-end skill fusion, source-skill decomposition, synthesis, and validation.
- `references/conflict-patterns.md`: Use when source skills disagree about triggers, ordering, tools, constraints, evidence, or output style.
- `references/taste-principles.md`: Use when the fused skill needs a distinctive judgment layer instead of a mechanical bundle.
- `scripts/analyze_skills.py`: Run on one or more skill directories to generate an inventory, conflict hints, a starter fusion report, or a draft fused `SKILL.md`.
- `scripts/validate_fusion_skill.py`: Run on a fused skill directory to check resource links, conflict-resolution gates, validation gates, and operational taste signals.

## Guardrails

- Respect explicit user scope boundaries. If the user limits work to one folder, write only there.
- Treat source skills as evidence, not as immutable law.
- Preserve deterministic scripts and validation gates unless they are obsolete or actively harmful.
- Do not create a mega-skill that loads every detail into context. Use progressive disclosure.
- Do not resolve contradictions by vague compromise. Choose a precedence rule and state it.
- Do not bury taste in decorative prose. Encode it as selection, sequencing, refusal, or quality gates.
