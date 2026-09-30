**POWERFARM CANON**

Powerfarm Operating System

How Powerfarm decides, allocates work, changes, and keeps the company coherent without excess process

| **DOCUMENT**  | PF-03             |
|---------------|-------------------|
| **STATUS**    | **CANONICAL**     |
| **VERSION**   | 1.5               |
| **EFFECTIVE** | 26 September 2026 |

| **OWNS**         | Decision ownership, work lifecycle, institutional operating architecture, durable system boundaries, build-vs-use, resource allocation, exceptions, institutional drift, documentation governance, and durable operating rules. |
|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **DOES NOT OWN** | Research methodology (PF-02), implementation-level technical system design and technology-specific standards (PF-04), or product/commercial doctrine (PF-05).                                                                   |

> **Normative language**
>
> MUST means required unless this canon is changed. SHOULD means the default and a material deviation needs a reason. MAY means optional.

# 1. Operating doctrine

Powerfarm is a small research institution operating in a fast-changing technical environment. Its operating system therefore optimizes for clarity, speed of learning, reversible change, and accumulated knowledge rather than procedural volume.

> **Minimum-process rule**
>
> A process, meeting, approval, template, or recurring artifact must earn its existence by reducing meaningful risk, coordination cost, repeated confusion, or loss of knowledge. If the cost of the process exceeds the expected cost of the failure it prevents, simplify or remove it.

Powerfarm's durable product is accumulated knowledge about how to produce and operate software. Specific tools, frameworks, runtimes, databases, models, and vendors are replaceable when better alternatives appear.

# 2. Operating principles

| **Principle**                               | **Operating meaning**                                                                                                              |
|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| One owner                                   | Every consequential piece of work has one clearly accountable owner, even when many people or agents contribute.                   |
| Decision at the lowest competent level      | Escalate when authority, irreversible consequence, material risk, or cross-system conflict requires it, not by habit.              |
| Reversibility matters                       | Reversible decisions move quickly. Irreversible or expensive-to-reverse decisions receive proportionally more evidence and review. |
| Write the decision, not the theater         | A short durable record is preferred to a meeting whose reasoning disappears.                                                       |
| Default to action with explicit uncertainty | Uncertainty can coexist with action when the downside is bounded and the state is recorded.                                        |
| Build thin                                  | Custom infrastructure exists only where it creates differentiated Powerfarm value.                                                 |
| Preserve history                            | Current recognized assertions can change; prior recognized assertions remain reconstructable.                                     |
| Exceptions are data                         | Repeated exceptions indicate either operational drift or a rule that should change.                                                |
| Cadence follows need                        | Recurring rituals are created only when the underlying need recurs.                                                                |
| Automation serves judgment                  | Agents and automation reduce coordination and execution burden, but must not conceal ownership or evidence.                        |

# 3. Powerfarm Architecture Model v0.1

## 3.1 Purpose and scope

Powerfarm learns how to produce software, executes software, and preserves institutional knowledge about software over time.

Its durable structure is organized around three sectors:

```text
Research      Continuity      Identity
learns        runs            remembers
```

All other Powerfarm components are services, interfaces, projections, contracts, execution substrates, or storage substrates supporting those sectors.

This section defines the institutional and operational architecture of Powerfarm. PF-04 owns implementation-level technical design, concrete technology standards, and technology-specific engineering choices that conform to this model.

> **Architecture freeze rule**
>
> Powerfarm SHOULD NOT introduce a new durable subsystem until an existing responsibility has been shown not to fit the current sectors, services, contracts, projections, or substrates. The default next move is to implement and test the model already defined here, not to add another architectural organ.

## 3.2 Durable sectors

### Identity

Identity answers:

> What exists in Powerfarm, which version is recognized, and who or what is authorized to do what?

Identity includes three distinct functions:

- standards-based authentication and authorization, including OAuth, human identity, machine identity, clients, consent, and tokens;
- institutional recognition through the Registry;
- durable preservation of promoted institutional objects through Minivault.

Registry and Minivault are services within Identity, not additional sectors.

### Continuity

Continuity answers:

> Given an admissible and authorized transition, how is it materialized durably, verifiably, and recoverably?

Continuity is the execution core. It SHOULD NOT expand into a global database, generic scheduler, event bus, authentication system, Registry, or general observability platform.

Its conceptual flow is:

```text
workflow
+
capability profiles
+
world / authority context
        ↓
Continuity compiler
        ↓
immutable ExecutionBundle
        ↓
durable execution
        ↓
effects
        ↓
verification
        ↓
recovery
```

Commodity execution capability SHOULD be delegated to standards and established external technology where possible. The Powerfarm-specific layer SHOULD remain small.

### Research

Research answers:

> What has Powerfarm learned about how to produce software?

Research includes experiments, evidence, software produced by experiments, capabilities, datasets, comparisons, findings, conclusions, and recommendations.

Most research MAY remain local to a project or workspace. Only results with institutional significance need promotion into Registry-recognized artifacts or contracts.

## 3.3 Foundational architectural principles

### Local state, global contracts

Operational state belongs to the software that produces and governs it. Institutionally meaningful relationships are expressed through contracts.

> **State is local. Contracts are global.**

Powerfarm does not require one global operational database in order to remain institutionally coherent.

### Authority is explicit

Physical possession, filesystem location, repository presence, database presence, or Park placement does not by itself confer institutional authority.

Authority derives from explicit recognized relationships, including entities, artifact versions, contracts, and grants.

### Execution is causal

Powerfarm models execution as a causal chain:

```text
evidence
   ↓
predicate satisfaction
   ↓
readiness
   ↓
policy
   ↓
trigger
   ↓
atomic claim
   ↓
materialized transition
   ↓
verification
```

### Preserved bytes are immutable

Mutable operational state remains mutable. When an exact historical object must be preserved, it SHOULD be represented immutably and content-addressed.

Content-addressed objects are also reusable immutable values. They MAY be referenced, transported, cached, resolved remotely, composed into manifests or object graphs, and loaded on demand without changing their content identity.

Content identity does not imply institutional authority.

### Everything institutional is rebuildable

Everything Powerfarm recognizes can be rebuilt from what it has preserved: its canon, its contracts and their documents, its recognized versions and their content, and the ordered record of its institutional acts.

Institutional state comes into existence through recorded acts, never through bulk seeding. Replaying the same acts, in the same order, over the same preserved content rebuilds the same institution.

Operational state follows its owner's contract: it is restored from a verified copy, or its loss is declared. Secret values are never restored; they are issued again.

A rebuild MAY land on different providers, machines, or substrates. The institution stays the same because its names, contracts, and content do not depend on where they are hosted.

> **Anything Powerfarm cannot rebuild from what it has preserved, it does not really have.**

### Context is a working set, not a warehouse

Active model context is temporary reasoning state, not canonical storage. Intelligent systems SHOULD prefer durable references to large immutable content over repeatedly embedding or copying that content when references improve context efficiency, composability, verification, or distribution.

A system MAY inspect a small manifest or semantic index first and resolve only the content required for the current reasoning step. Durable content remains outside the model context and can be loaded by reference when needed.

### Evidence is local, not omniscient

Antenna does not observe the complete true world. Heartime does not possess metaphysically perfect time. Both maintain evidence available to Powerfarm under explicit contracts.

Powerfarm acts on evidence and records the basis for important assertions.

### Provenance accompanies important assertions

Where material, Powerfarm SHOULD be able to explain not only what it asserts but why it asserts it, under which contract, using which evidence, and by which authority.

## 3.4 Substrates

Powerfarm separates editable software work, immutable content, institutional recognition, and operational state.

### Repositories and source-control projections

A Powerfarm Repository is an institutional software object whose native representation is not defined by any external source-control provider.

Source-control systems such as GitHub MAY provide collaboration, editable projections, publication, interoperability and change history. They do not define the institutional repository identity or native repository format.

### Content-addressed storage

The Content Store is Powerfarm's immutable content plane.

It answers:

> Given this digest, what are the exact bytes, independent of their current location?

It MAY preserve datasets, experiment outputs, software snapshots, builds, ExecutionBundles, evidence, receipts, capability definitions, prompts, manifests, source trees, and other immutable objects.

Its role is not limited to archival preservation. Content-addressed objects MAY be:

- referenced without copying their bytes into every consumer;
- resolved from local or remote storage;
- cached locally and independently re-verified by digest;
- transported without changing identity;
- loaded lazily by software or intelligent systems;
- composed through references into immutable manifests and object graphs.

Powerfarm SHOULD prefer stable content references over repeated embedding or replication of large immutable objects where doing so improves context efficiency, composability, transport, caching, or verification.

Objects MAY reference other content-addressed objects. This allows compound immutable values such as software trees, evidence sets, execution inputs, datasets, and bundles to be represented without requiring every consumer to load every underlying byte eagerly.

Content identity establishes exact bytes only. Meaning, institutional recognition, permissions, authority, and legitimate relationships remain responsibilities of Registry, contracts, grants, and Identity.

The durable separation is:

```text
repository     → institutional software object and trajectory
source control → editable/collaborative projection when used
content store  → exact immutable values, composition and transport
Registry       → institutional recognition and structural relationships
local stores   → mutable application-owned operational state
model context  → temporary reasoning working set
```

### Application-owned operational storage

Operational state belongs to the application or service whose contract gives it authority over that state.

The architectural rule is **ownership and declared authority, not a particular storage engine**.

SQLite, PostgreSQL, CloudKit, in-memory state, append-only journals, remote services, or another substrate MAY be used when their properties fit the application's contract, consequence, and operating environment.

Concrete V0 storage choices belong in versioned architecture/materialization specifications and App Contracts rather than in this canon. A change of storage provider or engine does not change Powerfarm's institutional architecture unless ownership, authority, contracts, or durable semantics change.

## 3.5 Registry

The Registry records institutionally recognized assertions. It does not possess an omniscient global truth and SHOULD NOT become the operational state store for Powerfarm.

A minimal conceptual model is:

```text
entities
artifacts
artifact_versions
contracts
grants
```

### Entities

An entity is a stable institutional identity, for example:

```text
powerfarm.app/sector/identity
powerfarm.app/sector/continuity
powerfarm.app/sector/research
powerfarm.app/service/antenna
powerfarm.app/app/coloured-places
powerfarm.app/machine/lab-8gb
powerfarm.app/agent/lab-8gb
```

An entity record SHOULD identify the thing without absorbing arbitrary operational state belonging to it.

### Artifacts and versions

An artifact is a semantically versionable object such as software, a capability, experiment, dataset, document, schema, prompt, policy, contract document, or ExecutionBundle.

An artifact version identifies an exact version and MAY reference repository, commit, path, SHA-256, content-addressed digest, media type, or equivalent integrity metadata.

Software therefore has distinct institutional homes:

```text
repository     → software trajectory and native institutional object
source control → optional collaboration/publication projection
Minivault      → promoted durable objects and provenance
content store  → exact immutable bytes and referenced composition
Registry       → recognized identity, version and relationships
```

## 3.6 Contracts

A contract describes a legitimate relationship between Powerfarm entities.

Contracts are structural objects, not merely documentation. They define the institutionally recognized topology through which distributed state remains coherent.

Powerfarm is therefore federated in state and centralized in contracts.

### App Contract

The App Contract is the root institutional contract of an application.

It MAY declare:

- identity, owner, principal, and lifecycle status;
- source, revision, and recognized artifact version;
- integrity hashes;
- placement and logical location;
- runtime expectations and health interface;
- owned state stores and their authority;
- immutable objects produced or consumed;
- authentication relationships and grants;
- capabilities provided and consumed;
- required Antenna, Heartime, Continuity, and Search relationships;
- observability and freshness expectations;
- install, upgrade, retirement, and admission semantics.

The App Contract MUST NOT be required to inline every term of every subordinate relationship. It SHOULD reference relationship-specific contracts when Antenna, Heartime, Continuity, Search, or other services require their own terms.

Conceptually:

```text
App Contract
│
├── identity / source / placement / stores
├── Antenna relationship ──→ Antenna Contract
├── Heartime relationship ─→ Heartime Contract
├── executable capability ─→ Executability Contract
└── searchable surface ────→ Search Contract
```

This preserves the App Contract as a root without allowing it to become an unbounded configuration container.

## 3.7 State stores and authority

A database does not gain institutional meaning merely by appearing on a filesystem.

An application contract SHOULD declare each institutionally relevant store using fields sufficient to identify:

```text
store id
engine
purpose
place
relative path
schema or migration identity
owner
authoritative_for
durability
snapshot policy
searchability
sensitivity
```

The institutional locator is:

```text
store
→ app
→ place
→ physical locator
```

A live mutable database SHOULD NOT use its whole-file hash as a durable institutional identity. Powerfarm SHOULD distinguish, where relevant:

```text
contract hash
schema / migration hash
genesis hash
snapshot hashes
```

Immutable snapshots MAY be preserved in content-addressed storage.

## 3.8 Admission and onboarding

Onboarding is the materialization of an App Contract, not merely cloning code and starting a process.

The conceptual flow is:

```text
App Contract
    ↓
validate identity / authority / template
    ↓
Continuity workflow
    ↓
placement
    ↓
materialize software and service relationships
    ↓
provision declared stores
    ↓
configure provider / secret bindings
    ↓
verify
    ↓
receipt + census evidence
    ↓
Registry recognizes the resulting materialization
```

The governing model is:

> **Declare → Materialize → Prove → Recognize**

Recognition SHOULD depend on sufficient evidence that the declared configuration was materially instantiated.

Physical presence in an App Park or Engine Park does not itself confer Powerfarm membership.

## 3.9 Antenna

Antenna maintains durable observational evidence.

It answers:

> What arrived or was observed from the world?

Its domain includes, where applicable, HTTP ingress, webhooks, SSE, WebSockets, blob reception, heartbeat, signals, observed facts, and observed state changes.

Antenna is not the scheduler, Registry, global runtime, or universal operational database.

Heartbeat is observational evidence and therefore belongs primarily to Antenna semantics.

## 3.10 Heartime

Heartime maintains durable temporal evidence and evaluates contract-relevant temporal predicates.

It answers questions such as:

- has a temporal window opened or expired;
- has a deadline arrived;
- has `retry_at` arrived;
- has a condition lasted for a required duration;
- is a temporal contract still valid.

Heartime is not NTP and is not merely cron. It does not claim access to perfect universal time. It maintains the temporal evidence available to Powerfarm for contractual evaluation.

## 3.11 Continuity

Continuity materializes authorized transitions after semantic readiness has produced a trigger and execution coordination has produced a valid claim.

Continuity MUST distinguish transport acknowledgement from effect certainty where the distinction matters.

Useful execution states MAY include:

```text
dispatched
acknowledged
observed
verified
uncertain
```

A successful request does not by itself prove that the intended effect occurred.

## 3.12 Search and institutional projections

Powerfarm Search is a federated read model, not an authority.

It SHOULD discover recognized stores through contracts rather than scanning infrastructure or guessing connection strings.

Conceptually:

```text
query
  ↓
Registry
  ↓
which recognized stores claim authority here?
  ↓
contracts
  ↓
federated query
  ↓
normalized results + provenance
```

If Search disappears, canonical truth MUST NOT disappear with it.

Coloured Places is likewise a projection rather than the underlying observability authority. It MAY combine recognized population, observational evidence, census results, and execution receipts into operator-facing states, provided provenance remains available.

## 3.13 Heartbeat, census, and expected population

Registry records the population Powerfarm recognizes as expected under current contracts.

Antenna records spontaneous observational evidence such as heartbeat.

A census is different. It is a temporal institutional obligation to actively observe what should exist.

The flow is:

```text
Heartime
   ↓
census obligation becomes due
   ↓
policy / trigger
   ↓
atomic claim
   ↓
Continuity
   ↓
perform probe
   ↓
world
   ↓
observational result
   ↓
Antenna / observational evidence
   ↓
Coloured Places or another projection
```

The separation is normative:

> **Heartime establishes that an observation is due. Continuity performs the observation. Antenna records what was observed.**

This permits useful comparisons between expected and observed population, including the case where something is speaking that Powerfarm does not recognize.

## 3.14 Distributed consistency

Powerfarm does not require a global transaction across all application stores.

The default consistency pattern is:

```text
local atomic transaction
+
transactional outbox
+
idempotency
+
durable claims
+
receipts
```

For example:

```text
BEGIN
update local state
insert outbox intent
COMMIT
```

Delivery may then be retried, deduplicated, observed, and verified without requiring distributed two-phase commit as a foundational mechanism.

## 3.15 Software as temporal trajectory

Powerfarm treats a software instance as more than code plus a database.

A useful model is:

```text
software(t)
├── code revision(t)
├── state stores(t)
├── contracts(t)
├── capabilities(t)
├── placement(t)
└── evidence(t)
```

Execution changes that trajectory through authorized transitions. Contracts define admissible relationships, content-addressed storage preserves and carries exact immutable values, and Research studies how conditions affect outcomes.

## 3.16 Implementation order

Powerfarm SHOULD implement and test the existing model before expanding it.

The first three specifications are:

1. **App Contract v0**: identity, source, artifact version, placement, state stores, authority, capabilities, relationships, lifecycle, and admission evidence.
2. **Executability Contract v0**: temporal and observational predicates, policy, generation, trigger semantics, claim semantics, idempotency, expiration, cancellation, retries, effects, verification, and uncertainty.
3. **Registry Core v0**: the smallest durable institutional model around entities, artifacts, artifact versions, contracts, and grants.

Search, a full Heartime implementation, broader onboarding automation, Parks evolution, Registry/Minivault substrates, and other concrete materialization choices SHOULD be specified in versioned architecture/materialization documents and revised from evidence rather than promoted into canon by implementation inertia.

# 4. Work lifecycle

1. Sense: notice a change, problem, opportunity, request, failure, or unresolved decision.

2. Frame: define the outcome, owner, constraints, and what evidence is already known.

3. Decide: choose the next action at the appropriate level of rigor.

4. Execute: perform the work with the smallest sufficient process and tools.

5. Verify: check that the intended outcome occurred and that material risks are bounded.

6. Learn: capture what changed our understanding, including failures and surprises.

7. Update: revise the relevant current state, recommendation, product, system, or canon when justified.

Not every task needs a formal artifact for every stage. The lifecycle describes the logic that must remain available, not a mandatory seven-form workflow.

# 5. Decision ownership and records

A consequential decision SHOULD have one Decision Owner. Contributors may research, challenge, execute, or verify, but accountability remains explicit.

A durable Decision Record is required when a choice is expensive to reverse, changes a canonical rule, creates material proprietary infrastructure, materially affects customers or public claims, creates a security/privacy boundary, or is likely to be revisited later without obvious context.

| **Minimum field**  | **Question**                                          |
|--------------------|-------------------------------------------------------|
| Decision           | What are we choosing?                                 |
| Owner              | Who is accountable for the decision?                  |
| Context            | What problem or opportunity caused the decision?      |
| Options            | What credible alternatives were considered?           |
| Evidence           | What supports the choice, and what remains uncertain? |
| Consequences       | What do we gain, give up, or risk?                    |
| Reversal / trigger | What event should cause reconsideration?              |
| Date / version     | When did this become current?                         |

# 6. Decision classes

Powerfarm does not require a different bureaucracy for every kind of decision, but the evidence that matters differs by class.

| **Class**     | **Primary question**                                                                                                  |
|---------------|-----------------------------------------------------------------------------------------------------------------------|
| Research      | What decision could new evidence change, and how much rigor is justified?                                             |
| Technical     | Does this improve outcomes, evidence, reliability, safety, economics, or replaceability enough to justify complexity? |
| Product       | Does this convert Powerfarm knowledge into repeated external value without distorting research integrity?             |
| Resource      | What is the highest-value use of money, compute, hardware, and human attention under current constraints?             |
| Institutional | Does this alter a durable rule about what Powerfarm is or how it must operate?                                        |

# 7. Build versus use

> **Default**
>
> Use sufficiently capable external technology before building an equivalent proprietary component.

Before a material internal build, the owner SHOULD answer:

- Which Powerfarm outcome or canonical promise requires this capability?

- Which credible external alternatives were evaluated?

- What differentiated value would custom work create in evidence, knowledge, safety, reliability, economics, or decision capability?

- What maintenance and lock-in will Powerfarm inherit?

- How replaceable will the component remain?

- What measurable event would cause us to stop, replace, or simplify it?

If an external capability is sufficiently good and a proprietary implementation does not create material Powerfarm-specific value, Powerfarm SHOULD NOT build it.

# 8. Resource allocation

Powerfarm allocates scarce resources to maximize decision value and compounding knowledge, not activity. Resource decisions SHOULD consider:

- Decision consequence and expected value of better information.

- Strategic compounding: whether the work creates reusable evidence, methods, or product capability.

- Time sensitivity and frontier freshness.

- Reversibility and downside if wrong.

- Monetary cost, compute, hardware occupancy, and human attention.

- External leverage: whether buying, renting, or integrating is superior to building.

- Opportunity cost: what important work is displaced.

Budget is a constraint on the decision, not a prestige signal. Powerfarm may exchange time for money, money for higher quality, or redundancy for confidence when the decision warrants it.

# 9. Exceptions

Rules exist to improve decisions, not to punish reality. A material exception MAY be accepted when it is explicit and bounded.

| **Exception field** | **Requirement**                                        |
|---------------------|--------------------------------------------------------|
| Rule                | Which rule or default is being departed from?          |
| Reason              | Why is the exception better under current constraints? |
| Evidence            | What supports the exception?                           |
| Owner               | Who owns the consequence?                              |
| Expiry / trigger    | When must it be reconsidered?                          |
| Remediation         | What must change if the exception is temporary?        |

Recurring exceptions to the same rule are evidence. They SHOULD trigger either correction of behavior or revision of the rule.

# 10. Conformance without bureaucracy

Formal conformance review is reserved for decisions where contradiction would be materially costly: canonical changes, strong public claims, important customer commitments, significant proprietary builds, or security/privacy boundaries.

A review asks:

1. Does the decision conflict with the Charter or another canonical rule?

2. Is the relevant evidence strong enough for the consequence?

3. Were credible external alternatives considered?

4. Are uncertainty, trade-offs, and exceptions explicit?

5. Does the decision preserve replaceability and historical traceability where material?

6. Does the subject create real outcome, knowledge, safety, or economic value proportional to its complexity?

7. What future event should trigger reassessment?

The output is simple: CONFORMING, JUSTIFIED EXCEPTION, CHANGE REQUIRED, or CANON REVIEW. Powerfarm does not maintain conformance scoring for its own sake.

# 11. Institutional and frontier drift

Institutional drift is the gap between Powerfarm's actual behavior and its durable commitments. Frontier drift is the gap between current practice and the sufficiently mature technology frontier.

- Growing proprietary maintenance without corresponding knowledge or product value.

- Repeated reliance on stale evidence or recommendations.

- Vendor dependence that weakens independent judgment or replaceability.

- Benchmarks defended as products rather than replaced as instruments.

- Increasing human rescue while autonomy claims remain unchanged.

- Recurring exceptions that have become the real operating rule.

- A major external advance that makes the current technical approach materially inferior.

- Architectural growth that introduces new durable subsystems without evidence that existing boundaries are insufficient.

A drift review ends in one of four outcomes: correct behavior, accept a temporary deviation, change method/implementation, or revise canon.

# 12. Incidents and learning

A material technical, operational, customer, security, or epistemic failure SHOULD produce a learning record when the lesson is likely to recur. The purpose is not blame; it is to prevent repeated ignorance.

The record SHOULD capture event, impact, causal factors, detection, recovery, what signals were missed, actions, owner, and follow-up trigger. High-confidence research claims found seriously misleading are treated as epistemic incidents under PF-02.

# 13. Documentation system

Powerfarm deliberately separates authority from volume. Documents are classified by role:

| **Class**         | **Meaning**                                                                                                                                    |
|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Canonical         | One of PF-01 through PF-05. Defines current institutional commitments and recognized operating rules.                                         |
| Standard instance | A recurring document type from PF-06 instantiated because a real need exists. It can be authoritative within its scope without becoming canon. |
| Working           | Proposal, draft, investigation, notes, or active design. May change freely.                                                                    |
| Reference         | Useful explanation, evidence, report, external source, or technical detail that does not define company-wide authority.                       |
| Historical        | Superseded material retained to reconstruct decisions, methods, and past recognized state.                                                     |

- One important concept has one canonical home.

- A new document is not created merely to avoid editing an existing one.

- PF-06 records possible future document types and candidates. Listing a document there creates no obligation to write it.

- The default response to a new documentation need is: can the existing canon or an existing standard instance absorb this cleanly?

- A document without an owner, reader, decision, or maintenance reason SHOULD be archived or deleted rather than kept "just in case."

- The Powerfarm Architecture Model is maintained inside PF-03 rather than as a sixth canonical document.

# 14. Change and history

Powerfarm expects methods, products, systems, recommendations, recognized assertions, and implementations to change. Material current-state changes are versioned. Supersession preserves the prior version, the reason for change, and the date the new state became current.

> **Anti-dogma rule**
>
> A research institution that never changes is failing. A research institution that changes without knowing why is also failing.

# 15. Meetings and recurring cadence

No meeting, report, review, or recurring ritual is canonical by default. A cadence is introduced only when a recurring coordination or risk problem exists, and it is removed when that need disappears. Asynchronous written state is preferred when it provides equivalent clarity with lower cost.

# 16. Operating rules

1. Keep authority small and explicit.

2. Let reversible decisions move quickly.

3. Write consequential decisions so future Powerfarm can understand present Powerfarm.

4. Use external capability before reproducing it internally.

5. Treat exceptions and incidents as evidence.

6. Let process scale with consequence, not with organizational anxiety.

7. Change implementation aggressively when reality improves.

8. Change canon deliberately when identity or durable operating truth changes.

9. Keep operational state with the software that owns it unless a stronger boundary is justified.

10. Use contracts to make institutional relationships explicit.

11. Separate evidence, semantic triggering, execution claims, materialized effects, and verification.

12. Do not create a new durable subsystem merely because a new responsibility appears; first attempt to express it through the current model.

13. Preserve exact immutable content when history or composition requires it, but do not confuse byte identity with authority.

14. Prefer provenance-bearing assertions over opaque status.

15. Treat active model context as a temporary working set; prefer durable references and on-demand loading for large reusable immutable content where practical.

16. Bring institutional things into existence through recorded acts, never through bulk seeding, so that the institution can always be rebuilt by replaying them.

---

# Appendix A. Formal Executability Model v0.1

This appendix is normative for the conceptual separation of responsibilities. Concrete implementation mechanisms belong in PF-04 or subordinate technical specifications so long as they preserve these semantics.

## A.1 Evidence domains

For executable contract `c`, let:

- `T_c( t_hat )` be the temporal predicate evaluated over temporal evidence available to Heartime;
- `O_c( w_hat )` be the observational predicate evaluated over observational evidence available to Antenna.

Powerfarm does not require access to an objective complete world-state or perfect universal time.

The admissible region is therefore:

```text
R_c = { (t_hat, w_hat) | T_c(t_hat) AND O_c(w_hat) }
```

The architecture MUST NOT silently replace `t_hat` or `w_hat` with an assumed omniscient `t` or `w` in its execution semantics.

## A.2 Readiness

```text
Ready_c = T_c(t_hat) AND O_c(w_hat)
```

Events, observations, clock evidence, retries, and other inputs update evidence. Evidence updates predicates. Predicate convergence creates readiness.

The fundamental transition is therefore entry into an admissible region, not necessarily receipt of a conventional event:

```text
outside admissible region
        ↓
inside admissible region
```

or, equivalently:

```text
0 → 1
```

in satisfaction of the executable condition.

## A.3 Policy and trigger

Readiness alone does not determine whether execution should occur.

Let `H_c` denote the relevant causal history and `pi_c` the contract policy.

Policy evaluates the meaning of readiness:

```text
Trigger_c = pi_c(Ready_c, H_c)
```

Policy MAY define semantics including:

- edge-triggered or level-triggered behavior;
- first match only or retriggering;
- hold-for duration;
- ordering between temporal and observational evidence;
- buffering or discard;
- expiration;
- retry eligibility;
- concurrency policy;
- cancellation;
- compensation eligibility.

Policy determines whether readiness should produce a trigger. It does not itself grant exclusive execution ownership.

## A.4 Claim and generation

Execution coordination is distinct from contract semantics.

For a trigger associated with contract generation `generation_c`:

```text
Claim_c = AtomicAcquire(Trigger_c, generation_c)
```

Multiple workers MAY observe the same readiness or trigger. Where the contract requires exclusive materialization, only one valid claim may authorize execution for the relevant generation.

The atomic acquisition mechanism MAY vary by implementation, but the separation between policy and coordination MUST remain explicit.

## A.5 Materialization

A valid claim authorizes Continuity to materialize the contract effect:

```text
State' = Continuity.materialize(E_c, Claim_c)
```

`E_c` is the effect or authorized state transition.

Continuity preserves causal execution state and SHOULD represent uncertainty when effect certainty cannot yet be established.

## A.6 Verification

Let `w_hat_prime` denote observational evidence available after materialization.

Verification is:

```text
Verified_c = V_c(w_hat_prime)
```

Verification determines what Powerfarm may subsequently assert about the effect.

A transport acknowledgement MAY contribute evidence but MUST NOT automatically be treated as proof that the intended world effect occurred when those meanings differ.

## A.7 Contract semantic core

The semantic core of an executable contract is:

```text
C = (T, O, pi, E, V)
```

where:

- `T` = temporal condition;
- `O` = observational condition;
- `pi` = semantic trigger policy;
- `E` = effect or authorized transition;
- `V` = verification predicate.

Execution coordination adds contract generation and claim semantics around this core rather than being conflated with policy.

## A.8 Responsibility map

| **Operation** | **Primary responsibility** |
|---|---|
| `T_c(t_hat)` | Heartime temporal evidence and predicate evaluation |
| `O_c(w_hat)` | Antenna observational evidence and predicate evaluation |
| `Ready_c` | Contract predicate convergence |
| `Trigger_c` | Contract policy `pi_c` |
| `Claim_c` | Atomic execution coordination |
| `materialize(E_c, Claim_c)` | Continuity |
| `V_c(w_hat_prime)` | Verification over subsequent evidence |

This separation is architectural. Implementations MAY co-locate mechanisms, but MUST preserve the semantic boundaries.

## A.9 Conceptual contract lifecycle

```text
dormant
   ↓
armed
   ├── waiting_temporal
   ├── waiting_observation
   └── waiting_both
             ↓
           ready
             ↓
          trigger
             ↓
        atomic claim
             ↓
          claimed
             ↓
         executing
       /     |       \
    done   failed   uncertain
             ↓
       retry / compensate
```

Cancellation, expiration, supersession, and retirement MAY also terminate or redirect the lifecycle according to contract policy.

## A.10 Degenerate cases

The model supports common patterns without defining separate foundational primitives.

### Webhook

```text
T = always admissible
O = arrival observed
```

### Cron-like execution

```text
T = scheduled temporal condition
O = true
```

### Retry

```text
T = retry_at reached
O = prior effect remains unverified
```

### Deadline

```text
T = deadline condition
O = completion state
```

### Physical class example

```text
T = 07:00 ≤ time evidence ≤ 08:00
O = teacher_present AND students_present AND room_ready
```

The class becomes ready only when temporal and observational predicates converge under available evidence. Policy then determines whether that readiness produces a trigger.

---

# Appendix B. Architectural mantra

```text
Research creates and learns.
GitHub explains.
Content Store preserves and carries immutable values.
Registry recognizes.
Identity authorizes.
Antenna maintains observational evidence.
Heartime maintains temporal evidence.
Policy determines semantic triggering.
Atomic claim establishes execution ownership.
Continuity materializes transitions.
Applications remember themselves.
Recorded acts rebuild.
Search finds.
```

> **State is local. Contracts are global. Bytes are immutable when preserved. Authority is explicit. Execution is causal. Everything institutional is rebuildable. Knowledge is the durable product.**
