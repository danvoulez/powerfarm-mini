**POWERFARM CANON**

Intelligence and Technology System

Durable technical doctrine for intelligence, software representation, code, verification, and replaceability

| **DOCUMENT**  | PF-04             |
|---------------|-------------------|
| **STATUS**    | **CANONICAL**     |
| **VERSION**   | 1.2               |
| **EFFECTIVE** | 23 September 2026 |

| **OWNS**         | The durable technical doctrine Powerfarm uses to structure software and intelligent work, choose representations, govern production languages and code, preserve evidence, verify outcomes, and remain replaceable. |
|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **DOES NOT OWN** | A frozen technology stack, vendor list, repository map, infrastructure diagram, detailed security implementation manual, product roadmap, or language-specific profile. Those are standard instances when needed.        |

> **Normative language**
>
> MUST means required unless this canon is changed. SHOULD means the default and a material deviation needs a reason. MAY means optional.

# 1. Representation Doctrine

Powerfarm is technology-replaceable, not architecture-agnostic.

Models, providers, runtimes, databases, programming languages, orchestration products, storage systems, protocols, and vendors are replaceable. The institution nevertheless maintains a strong doctrine about how intent, semantics, executable structure, evidence, and code should be represented.

> **System objective**
>
> Maximize verified useful outcome and decision value under explicit constraints such as quality, cost, time, privacy, risk, human effort, availability, auditability, and replaceability.

## 1.1 Representation order

Powerfarm SHOULD express durable semantics at the highest faithful machine-inspectable level available.

The preferred representation order is:

```text
intent
  ↓
existing international standard
  ↓
Powerfarm contract
  ↓
graph / declarative representation
  ↓
schema / data
  ↓
traditional source code
  ↓
machine / world effects
```

This order is a preference, not a prohibition. A lower representation is correct when a higher one would reduce correctness, clarity, capability, interoperability, performance, or verifiability.

Powerfarm SHOULD express semantics in standards, contracts, graphs, schemas, and other machine-inspectable declarative representations whenever they can faithfully represent the problem. Traditional source code SHOULD be reserved for the irreducible executable substrate and for cases where declarative representation would reduce correctness, clarity, or capability.

Traditional code therefore remains essential for runtimes, compilers and resolvers, protocol adapters, drivers, storage engines, verification primitives, security boundaries, performance-sensitive implementation, and integration with external systems.

The objective is not to eliminate source code. It is to avoid burying institutional semantics in procedural implementation when those semantics can exist explicitly at a higher level.

## 1.2 Software is more than text

Powerfarm software MAY include source code, contracts, graphs, schemas, capabilities, requirements, tests, runtime evidence, architecture, business rules, ownership, provenance, history, and immutable referenced content.

Agent-facing and human-facing interfaces SHOULD share domain logic where possible rather than duplicate it.

Important domain capabilities SHOULD expose clear contracts, permissions, inputs, outputs, side effects, and verification paths.

## 1.3 Continuity graph semantics

The executable structure interpreted by Continuity MUST have graph semantics.

This requirement does not mandate a graph database and does not authorize a proprietary Powerfarm graph language when an established standard can represent the problem.

A Continuity executable graph contains, at minimum where relevant:

```text
ExecutableGraph
│
├── nodes
│   ├── predicates
│   ├── capabilities
│   ├── effects
│   └── verification
│
├── edges
│   ├── dependency
│   ├── causality
│   ├── control
│   └── evidence
│
└── references
    ├── contracts
    ├── Registry identities / capabilities
    └── content-addressed objects
```

The physical representation MAY be JSON, YAML, protobuf, relational rows, content-addressed manifests, in-memory structures, or another suitable form. The durable requirement is that nodes, edges, dependencies, causal ordering, conditions, capabilities, effects, and verification remain explicit and inspectable.

The conceptual pipeline is:

```text
human / intelligent system
        ↓
Executable Graph
        ↓
validate
        ↓
resolve contracts + capabilities + referenced content
        ↓
compile
        ↓
immutable ExecutionBundle
        ↓
durable execution
        ↓
effects + verification
```

Powerfarm SHOULD use established workflow and interface standards before inventing another graph DSL.

## 1.4 Immutable content plane

The Content Store described by PF-03 is Powerfarm's immutable content plane.

Content-addressed objects MAY be addressed, preserved, transported, composed, cached, resolved remotely, loaded lazily, and independently verified without changing their content identity.

A small content reference SHOULD be sufficient to identify a durable immutable value when the surrounding contract or schema supplies the required meaning. A minimal reference may contain:

```text
digest
media type
size
```

Only the digest establishes material identity. Other fields describe the value or assist resolution.

Objects MAY reference other content-addressed objects, allowing immutable manifests and object graphs to represent source trees, datasets, prompts, schemas, evidence sets, execution inputs, capability definitions, and compound artifacts without copying all underlying bytes into every consumer.

Knowing a digest does not itself grant permission to resolve the object. Content identity is not a capability. Identity, contracts, grants, and Registry recognition remain responsible for meaning and authority.

## 1.5 Context is a working set, not a warehouse

Active model context is temporary reasoning state, not canonical storage.

Intelligent systems SHOULD reason over durable references and resolve material on demand rather than requiring all potentially relevant material to be embedded in active context.

Context systems SHOULD maximize decision-relevant semantic density rather than raw context length.

A preferred pattern is:

```text
task
+
small semantic manifest
+
content references
        ↓
inspect structure
        ↓
resolve only what reasoning requires
        ↓
produce new immutable objects
        ↓
verify
        ↓
Registry recognition when institutionally relevant
```

Powerfarm SHOULD prefer references over replication and loading over inlining for large, stable, or reusable immutable content when doing so improves context efficiency, composability, verification, transport, or caching.

The existence of a content-addressed object does not imply institutional promotion. Intelligent systems and experiments MAY produce many immutable objects; only objects with institutional significance need become Registry-recognized artifact versions.

# 2. Language and Toolchain Policy

Language follows layer and responsibility. Powerfarm intentionally keeps the production language set small.

The general layering policy is:

| **Layer** | **Preferred representation or language property** |
|---|---|
| Semantic | International standards, contracts, graphs, schemas, declarative structures |
| Compilation | Strongly typed conventional implementation language |
| Runtime / systems | Strongly typed conventional implementation language appropriate to the boundary |
| Research | Language optimized for experimentation, analysis, and evidence generation |
| Interface | Language native to the target environment when materially advantageous |

Introducing another production language requires a material reason tied to capability, safety, interoperability, performance, target environment, maintainability, or research value. Polyglot complexity is a cost and MUST NOT arise merely from preference.

## 2.1 Language Profiles

Every production language used by Powerfarm MUST have an adopted Language Profile.

A Language Profile is a small operational standard, not a new canonical document. It MUST identify at least:

- the adopted language version or version policy;
- authoritative external style and API guidance where available;
- formatter;
- linter;
- static analysis;
- compiler or type-check settings;
- required test or build checks;
- material exceptions.

Powerfarm follows authoritative language and ecosystem standards rather than inventing local alternatives when suitable standards exist.

## 2.2 Technical language

English MUST be the technical language of institutional production software, including identifiers, types, functions, APIs, schemas, comments, docstrings, commit messages, pull request titles, and technical repository documentation.

Localized product content, user-facing copy, externally required terminology, and research material MAY use other languages where appropriate.

## 2.3 Frontier practice

Powerfarm code SHOULD represent current excellent practice, not merely code that compiles.

"Frontier" does not mean immediate adoption of every new feature or technology. It means using the strongest mature practices currently available when they materially improve correctness, clarity, safety, composability, agent comprehension, verification, or replaceability.

Examples MAY include current stable toolchains, strong type systems where appropriate, machine-checkable schemas, structured errors, deterministic formatting, static analysis, reproducible builds, explicit interfaces, invariant or property testing where valuable, disciplined concurrency, memory safety where material, structured observability, supply-chain verification, and machine-readable contracts.

# 3. Code Editorial Standard

> **Powerfarm Code Character**
>
> Powerfarm code is durable technical literature that happens to execute.

Powerfarm code MUST be legible to competent engineers and intelligent systems, conform to established modern practice for its language and domain, expose contracts and effects explicitly, and remain amenable to mechanical verification and replacement.

Cleverness that reduces inspectability is a defect.

Boilerplate that can be represented declaratively without loss of clarity or capability is a design smell.

Hidden authority, hidden mutable state, and hidden side effects are architectural defects.

The editorial baseline is deliberately small and strong:

1. **Names carry domain meaning.** Generic names such as `Manager`, `Helper`, `Utils`, or `Processor` SHOULD NOT replace a real domain concept.
2. **Public boundaries are typed and documented.** Inputs, outputs, constraints, authority, and compatibility expectations SHOULD be mechanically visible where practical.
3. **Errors are part of the contract.** Material failure modes MUST be representable and SHOULD NOT collapse into decorative strings.
4. **Side effects are explicit.** Code that changes external or durable state SHOULD make that effect inspectable and verifiable.
5. **Global mutable state is exceptional.** Its use requires a material reason.
6. **Modules have a coherent reason to change.** Boundaries SHOULD follow responsibility rather than accidental file organization.
7. **Comments explain constraints and reasoning.** Comments SHOULD NOT narrate syntax that the code already states clearly.
8. **Generated code is identified.** Generated material MUST have a known source and SHOULD NOT be manually maintained unless explicitly converted to authored code.
9. **Machines enforce mechanical style.** Formatters, linters, compilers, static analysis, and tests own mechanical conformance. Reviewers concentrate on semantics, risk, evidence, and design.
10. **Dead abstractions die.** Obsolete wrappers, compatibility fossils, and architecture preserved only by inertia SHOULD be removed when their removal is safe and economically justified.

# 4. Change and Verification

For material software work, the unit of change is an intentional and verifiable semantic change, not merely a textual diff.

The preferred chain is:

```text
intent
  ↓
requirements / contracts
  ↓
impact
  ↓
plan / graph
  ↓
mutation
  ↓
verification
  ↓
evidence
  ↓
commit
```

The exact implementation MAY vary. The durable requirement is that intended outcome and verification remain reconstructable in proportion to consequence.

## 4.1 Normal change path

For durable production software, the normal path is:

```text
branch
  ↓
pull request
  ↓
automated verification
  ↓
review
  ↓
merge to protected main
```

Direct push to `main` SHOULD NOT occur for durable production software except under an explicit operational exception.

Formatter, linter, type-check or compiler checks, and required tests MUST pass before merge unless an explicit temporary exception records why they cannot.

Changes to public contracts or schemas MUST include compatibility analysis appropriate to their consequence.

Changes to persistent state MUST include migration and rollback or recovery analysis appropriate to their consequence.

A material change to production language, fundamental runtime, storage model, or representation model requires a durable architectural decision record or equivalent explicit decision evidence.

Exceptions SHOULD be explicit, bounded, and temporary where possible.

## 4.2 Agent-authored change

Agent authorship does not reduce the verification bar.

Material agent-authored changes SHOULD be verified by a mechanism sufficiently independent from the producer when correlated self-confirmation could materially hide defects. Independence MAY come from deterministic verification, a different model or provider, a separate execution route, an independent test system, or human review.

## 4.3 Verification architecture

Generation is not completion. Outputs are verified in proportion to consequence using the cheapest reliable mechanism available.

| **Verification mode**    | **Typical use**                                                                              |
|--------------------------|----------------------------------------------------------------------------------------------|
| Deterministic checks     | Syntax, schemas, types, invariants, policy rules, checksums, exact state.                    |
| Software tests           | Unit, integration, acceptance, regression, property, performance, and safety tests.          |
| Independent model review | Ambiguous semantic quality, critique, alternate reasoning, or adversarial checks.            |
| Human review             | High-stakes judgment, product meaning, ambiguous requirements, safety, or expert evaluation. |
| Field evidence           | Actual behavior in realistic or production conditions over time.                             |

When correlated self-confirmation can materially mislead the decision, producer and verifier SHOULD differ by model, provider, method, deterministic mechanism, or human evaluator.

## 4.4 Evidence Fabric

The Evidence Fabric preserves what Powerfarm needs in order to learn across time. Raw evidence is append-oriented: corrections and interpretations may be added, but underlying historical evidence is not silently rewritten.

Powerfarm SHOULD preserve, where material:

- execution routes and environment identity;
- inputs, outputs, traces, artifacts, failures, costs, and human interventions;
- versioned methodology and benchmark identity;
- measurements and verification results;
- findings, claims, supporting and contradicting evidence, confidence, scope, and freshness;
- decisions, recommendations, supersession history, and retest triggers.

Perfect reproducibility may be impossible for external systems. Traceability remains required: Powerfarm SHOULD preserve enough evidence to understand what was tested, under what method, and why the result was believed.

# 5. Technical Governance

Powerfarm does not seek to minimize technical opinion. It seeks to concentrate technical opinion where it compounds.

Semantics rise into standards, contracts, graphs, and schemas. Traditional code moves downward into the executable substrate. Code follows internationally recognized modern engineering practice. Machines enforce mechanical quality. Humans and intelligent systems reason about semantics.

## 5.1 Replaceability and external leverage

No provider, model, protocol, database, language, agent harness, benchmark runner, or orchestration framework is a protected dependency.

Interfaces and data SHOULD be structured so superior external technology can be evaluated and adopted without institutional trauma.

Abstraction is not automatically valuable. Powerfarm SHOULD abstract only where change is plausible and the abstraction cost is lower than the lock-in or migration cost it prevents.

## 5.2 Build thin

Powerfarm does not build infrastructure because a system diagram has an empty box.

A proprietary component requires a concrete reason tied to evidence quality, research throughput, decision capability, product differentiation, safety, reliability, economics, or a semantic responsibility that available external technology cannot faithfully satisfy.

Commodity infrastructure SHOULD be preferred where it satisfies the requirement. Internal components SHOULD have replacement triggers and SHOULD be removable when external technology becomes better.

## 5.3 Intelligence routing

Intelligence is an allocatable capability. A task is not automatically assigned to the nominally strongest model.

An Execution Route is the operational configuration of intelligence for a unit of work. It MAY include model, version, provider, gateway, runtime, quantization, hardware, context, prompt contract, tools, reasoning mode, output contract, retry policy, verifier, and expected cost.

A Cognitive Plan describes decomposition and the Execution Routes used for each part. It MAY include subtasks, dependencies, parallelism, escalation criteria, verifiers, budget, time limit, and termination conditions.

Powerfarm SHOULD prefer the least expensive route that reliably meets the required outcome, not the cheapest route in isolation. Routing policies SHOULD be learned from evidence and updated when prices, capabilities, reliability, or constraints change.

## 5.4 Security and data baseline

Detailed security and data governance standards are created only when operational need justifies them, but the following baseline is always active:

- credentials and secrets are not embedded in public artifacts or source by default;
- access follows least privilege appropriate to the system and consequence;
- client or confidential data is not reused, published, or added to public datasets without explicit authority;
- sensitive data is minimized in prompts, traces, logs, and model calls where practical;
- external services are evaluated for the data, trust, and availability boundary they create;
- material security or data incidents create durable evidence and corrective action.

## 5.5 Technology surveillance

Powerfarm does not need to chase every release. A new technology enters evaluation when there is a plausible reason it could change a decision that matters.

Surveillance SHOULD track changes in capability, cost, context, reliability, tools, protocols, hardware, provider behavior, and benchmark relevance. The output is a candidate decision question, not a news feed.

Technical choices SHOULD be evaluated on relevant dimensions separately when trade-offs are real, including verified outcome quality, reliability, cost, time, throughput, human effort, privacy, security, auditability, replaceability, evidence generation, freshness, and maintenance burden.

## 5.6 Current implementation is not canon

The current stack, providers, repositories, hardware, database schemas, agent harnesses, and deployment topology are implementations, not institutional identity. They MAY change aggressively without changing this canon provided the durable architectural contracts remain satisfied.

Current V0 provider, storage, and topology decisions SHOULD therefore live in versioned architecture/materialization specifications, App Contracts, and decision records. Revising those instances does not revise this canon unless the change alters durable representation, authority, verification, replaceability, or other doctrine owned here.

## 5.7 Replacement rule

When a candidate technology may materially dominate or invalidate an incumbent, Powerfarm identifies the affected decision, evaluates the candidate under relevant constraints, updates the preferred route when evidence is sufficient, and preserves the incumbent as historical state. Sunk cost does not grant a technology tenure.

---

## Operational mantra

> **Powerfarm is technology-replaceable, not architecture-agnostic.**
>
> **Semantics rise. Code descends. Context is a working set, not a warehouse.**
>
> **Have few technical rules, and make them strong.**
