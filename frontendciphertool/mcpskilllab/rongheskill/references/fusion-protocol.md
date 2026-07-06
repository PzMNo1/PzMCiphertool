# Fusion Protocol

Use this protocol to merge many skills into one coherent higher-order skill.

## 1. Source Inventory

For each source skill, capture:

- `name`
- `description`
- trigger situations
- core workflow
- required scripts, references, assets, or external tools
- strict constraints and validation gates
- examples of expected output
- domain or task boundaries
- taste signals: what the skill seems to value when tradeoffs appear

Prefer a compact table. If there are more than three skills, run:

```bash
python scripts/analyze_skills.py <skill-dir> <skill-dir> --output fusion-report.md
```

To create a first-pass fused `SKILL.md` draft for review, run:

```bash
python scripts/analyze_skills.py <skill-dir> <skill-dir> --draft-skill fused-skill-name --output SKILL.draft.md
```

Treat the draft as scaffolding. Read the source skills and resolve the conflict ledger before publishing it as the final `SKILL.md`.

## 2. Intent Extraction

Rewrite each skill as:

- `protected outcome`: what must stay true for users
- `execution strategy`: how the skill currently achieves it
- `risk if lost`: what breaks if this behavior is removed
- `replaceability`: whether a simpler rule, script, or reference can preserve it

Keep protected outcomes even if the original execution strategy is poor.

## 3. Conflict Mapping

Classify every meaningful conflict:

- Trigger collision: two skills want to own the same user request.
- Sequence collision: skills disagree on operation order.
- Slice collision: skills cut the problem by incompatible dimensions.
- Tool collision: skills require different tools or reliability assumptions.
- Evidence collision: skills use different proof standards.
- Style collision: skills optimize for incompatible voice, UX, architecture, or taste.
- Resource collision: skills duplicate or contradict bundled references or scripts.
- Safety collision: one skill permits what another forbids.

Read `conflict-patterns.md` for resolution patterns.

## 4. Precedence Design

Choose explicit precedence rules before drafting:

1. User instruction beats fused-skill defaults.
2. Safety, legality, privacy, and irreversible side effects beat convenience.
3. Deterministic validation beats aesthetic preference.
4. Domain-specific constraints beat generic heuristics inside their domain.
5. Reversible exploration can be broad; irreversible edits must be scoped.
6. If two skills conflict and neither has domain authority, sequence them or expose a parameter.

Do not use "combine both" unless both behaviors can coexist without confusing the operating loop.

## 5. Architecture of the Fused Skill

Use a three-layer structure:

- `Core`: Always-loaded SKILL.md instructions, short enough to remember during execution.
- `Branch`: Reference files loaded only when a workflow, domain, or conflict requires them.
- `Machine`: Scripts for repeatable inventory, scoring, transformation, validation, or artifact generation.

The fused skill should have one primary loop. Specialist branches should plug into the loop rather than create parallel operating systems.

## 6. Synthesis Pattern

Draft in this order:

1. Frontmatter description with concrete triggers.
2. Mission in one or two sentences.
3. Operating loop with imperative steps.
4. Resource navigation with when-to-read guidance.
5. Guardrails and validation gates.
6. Conditional references for deeper material.
7. Scripts for mechanical repeatability.

Keep SKILL.md under 500 lines. Move examples, taxonomies, and long checklists to references.

## 7. Conflict Ledger

Before finalizing, write a ledger like:

| Conflict | Source skills | Resolution | Reason | Residual risk |
| --- | --- | --- | --- | --- |
| Trigger collision on frontend requests | design skill, app builder | Scope by user intent first, then load design branch | Prevents overloading all UI requests | Needs forward-test on ambiguous prompts |

Use one of these resolutions:

- `preserve`: keep both without interaction.
- `sequence`: run one before the other.
- `scope`: assign each to a narrower condition.
- `parameterize`: make the user or task choose a mode.
- `defer`: move rare detail to a reference.
- `discard`: remove because it is duplicative, obsolete, or harmful.

## 8. Validation

Validate at three levels:

- Structure: frontmatter has only `name` and `description`; paths exist; referenced resources are present.
- Behavior: run scripts; simulate realistic requests; verify the fused loop selects the right branch.
- Taste: inspect whether output decisions are sharper, more coherent, and less generic than a plain bundle.

For a local semantic gate, run:

```bash
python scripts/validate_fusion_skill.py <fused-skill-dir>
```

Use independent forward-testing when the fused skill will guide high-variance tasks or many future agents.

## 9. Failure Modes

Watch for:

- A merged skill that is only a long anthology.
- A trigger description so broad it steals unrelated tasks.
- Contradictions hidden in different sections.
- Validation gates that no longer cover the fused behavior.
- Taste reduced to adjectives with no operational consequence.
- Scripts that summarize headings but miss binding constraints.
- Reference files that are never mentioned by SKILL.md.

Fix these before treating the skill as finished.
