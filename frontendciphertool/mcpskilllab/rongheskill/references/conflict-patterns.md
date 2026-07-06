# Conflict Patterns

Use this file when source skills disagree or pull execution in different directions.

## Trigger Collision

Symptoms:

- Multiple skills claim the same request.
- The fused description becomes too broad.
- The agent loads too much context before doing work.

Resolution:

- Scope by user intent first, artifact second, tool third.
- Put trigger precedence in SKILL.md.
- Move rare or specialist branches to references.

## Sequence Collision

Symptoms:

- One skill starts with planning; another starts with direct edits.
- One skill requires discovery before changes; another optimizes for speed.
- Validation appears before implementation in one workflow and after it in another.

Resolution:

- Use the least irreversible safe order: inspect, decide, edit, verify.
- Allow fast paths only for trivial low-risk work.
- Preserve mandatory validation as gates, not suggestions.

## Slice Collision

Symptoms:

- Skills divide work by domain, while others divide by task phase or artifact type.
- Two slicing strategies create duplicated or missing responsibilities.

Resolution:

- Choose one primary slice for the fused skill.
- Convert other slices into branch conditions.
- Define a handoff rule for cross-cutting concerns.

Good default:

- Primary slice: user outcome.
- Secondary slice: artifact or domain.
- Tertiary slice: tool or implementation detail.

## Tool Collision

Symptoms:

- Different skills require incompatible libraries, commands, MCP servers, or runtimes.
- One skill relies on generated artifacts while another requires source-only edits.

Resolution:

- Prefer existing repo patterns and available tools.
- Preserve deterministic scripts when repeatability matters.
- Parameterize tool choice only when either option is genuinely valid.
- State fallback behavior for missing tools.

## Evidence Collision

Symptoms:

- One skill accepts visual inspection; another requires tests.
- One skill trusts docs; another requires runtime proof.
- One skill relies on examples; another requires formal validation.

Resolution:

- Match proof strength to risk.
- Use direct evidence for behavior claims.
- Keep weaker evidence as supporting context, not completion proof.

Default proof ladder:

1. Runtime behavior or test output.
2. Static validation or parser checks.
3. Direct file inspection.
4. Source documentation.
5. Inference.

## Style Collision

Symptoms:

- One skill asks for terse operational prose; another asks for rich narrative.
- One design system favors density; another favors expressive presentation.
- Output voice becomes inconsistent.

Resolution:

- Tie style to audience and artifact purpose.
- Encode voice rules as concrete choices: length, structure, vocabulary, and omission.
- Put domain-specific voice in references when it is not always needed.

## Safety Collision

Symptoms:

- One skill permits broad automation; another forbids side effects.
- Some instructions ignore user scope boundaries.
- Scripts can modify files outside intended directories.

Resolution:

- Higher-safety rule wins.
- Restrict writes to explicit scope.
- Require explicit verification before destructive or broad operations.
- Keep safety rules in SKILL.md because they must always load.

## Resource Collision

Symptoms:

- Duplicate scripts or references solve the same task differently.
- Examples conflict with the current fused workflow.
- Resource names are vague or discoverability is poor.

Resolution:

- Keep the more deterministic or better-tested resource.
- Rename resources by use case.
- Delete placeholders.
- Add navigation from SKILL.md to every retained reference.

## Taste Collision

Symptoms:

- All source skills are technically valid but produce bland, crowded, or incoherent results.
- "Best practice" language hides the need for judgment.

Resolution:

- Identify what the fused skill should make easier to choose.
- Convert taste into operating constraints.
- Use `taste-principles.md` to define the judgment layer.
