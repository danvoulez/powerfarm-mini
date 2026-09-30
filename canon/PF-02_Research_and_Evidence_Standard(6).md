**POWERFARM CANON**

Research and Evidence Standard

How Powerfarm turns technological change into defensible, living knowledge

| **DOCUMENT**  | PF-02             |
|---------------|-------------------|
| **STATUS**    | **CANONICAL**     |
| **VERSION**   | 1.0               |
| **EFFECTIVE** | 15 September 2026 |

| **OWNS**         | Research lifecycle, evidence objects, confidence, benchmark rules, verification, uncertainty, freshness, and claim/recommendation discipline. |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **DOES NOT OWN** | The company mission (PF-01), operating governance (PF-03), implementation architecture (PF-04), or product/commercial policy (PF-05).         |

> **Normative language**
>
> MUST means required unless this canon is changed. SHOULD means the default and a material deviation needs a reason. MAY means optional.

# 1. Research objective

Powerfarm research exists to improve practical decisions about software production with available technology. Novelty alone is not a research objective. A study is valuable when plausible results can change what Powerfarm or a user should do.

> **Decision-first rule**
>
> Every material study MUST state the decision its result could change. Exploratory work MAY begin with a provisional decision question, but the question must become explicit before a strong claim is made.

# 2. Unit of evaluation

The unit under test MUST be the operational system required to interpret the result. It MAY be a model, but it may also be a model plus provider, execution route, agent plus tools, complete workflow, software representation, verification system, or cognitive plan.

A result MUST identify material components that can change interpretation, including versions, provider or runtime, context strategy, tools, environment, resource budget, verifier, and observation date when relevant.

# 3. Canonical research cycle

1.  Observe a change, uncertainty, failure, opportunity, or unresolved decision.

2.  Formulate the Decision Question.

3.  Record the current belief and what could change it.

4.  Search existing internal and external evidence.

5.  Define the study class and hypothesis where appropriate.

6.  Choose the unit under test, credible alternatives, and resource regime.

7.  Define measurements, verification, and primary outcomes before confirmatory interpretation.

8.  Freeze material pre-test choices in proportion to the consequence of the claim.

9.  Run and preserve raw evidence, failures, costs, and environment identity.

10. Verify, replicate, or seek independent evaluation when the consequence justifies it.

11. Analyze measurements before converting them into findings, claims, conclusions, or recommendations.

12. Update confidence, recommendation, and retest trigger. Preserve the prior state.

# 4. Research classes and proportional rigor

| **Class**              | **Primary purpose**                                              | **Typical rigor**                                           |
|------------------------|------------------------------------------------------------------|-------------------------------------------------------------|
| Exploratory research   | Discover patterns, failure modes, and hypotheses.                | Flexible. Must not be presented as confirmatory.            |
| Comparative evaluation | Choose among credible alternatives under defined constraints.    | Matched conditions, baselines, repeatability.               |
| Confirmatory study     | Test a previously specified hypothesis.                          | Pre-specification, stronger controls, explicit uncertainty. |
| Replication            | Test whether an internal or external result survives repetition. | Independent setup when feasible; clear comparability.       |
| Ablation / stress test | Identify causal contribution or failure boundaries.              | Controlled changes, diagnostic metrics.                     |
| Field evaluation       | Test operational value on real software work.                    | Real constraints, human effort, maintenance, side effects.  |
| Longitudinal study     | Measure how results or recommendations change over time.         | Stable anchors plus time/version metadata.                  |
| Evidence synthesis     | Integrate multiple evidence paths into a scoped claim.           | Lineage, contradiction handling, confidence assessment.     |

Rigor scales with consequence. A quick internal exploration can remain light. A public comparative claim or high-confidence recommendation requires stronger controls, replication, uncertainty analysis, and independent verification.

# 5. Study design rules

## 5.1 Comparisons and baselines

Research SHOULD be comparative. A complex system SHOULD compete against a credible simpler baseline. Fairness does not always mean identical configuration; the research question determines whether default, matched, vendor-optimized, or best-effort configurations are appropriate.

## 5.2 Pre-specification

Important comparative or confirmatory work SHOULD record before execution: question, hypothesis, primary and secondary outcomes, task set or sampling method, comparison groups, environment, resource budget, stopping rule, exclusion criteria, verification, and analysis method.

## 5.3 Controls, randomization, repetition

Use controls, randomization, interleaving, multiple repetitions, controlled randomness, or independent replication when they materially reduce uncertainty. The design SHOULD distinguish one task repeated many times from many distinct tasks, because they support different generalization claims.

## 5.4 Environment and cost capture

Material runs MUST preserve enough information to understand what happened. Relevant fields MAY include model and provider identity, versions, endpoint, gateway, prompt and context version, tools, harness, runtime, hardware, operating system, quantization, repository revision, dataset revision, grader version, retries, monetary cost, machine occupancy, elapsed time, and human intervention.

# 6. Measurement before scoring

Powerfarm preserves raw measurements whenever reasonably possible. Composite scores are secondary representations, not substitutes for observations.

- Primary metrics are declared before confirmatory interpretation.

- Composite scores expose components, transformations, weights, normalization, and missing-data treatment.

- A change to scoring weights that can change interpretation is a methodology change.

- Proxy metrics MUST identify the verified outcome they approximate and the distance between proxy and outcome.

- Practical significance matters. A numerically detectable difference that cannot change a decision is not automatically important.

- Multi-objective trade-offs SHOULD remain multidimensional when quality, cost, time, privacy, reliability, complexity, and human effort cannot be honestly collapsed into one ranking.

# 7. Epistemic layers

| **Layer**        | **Meaning**                                                                              |
|------------------|------------------------------------------------------------------------------------------|
| Observation      | What happened or was directly recorded.                                                  |
| Measurement      | A structured quantitative or qualitative observation.                                    |
| Score            | A transformation of one or more measurements.                                            |
| Finding          | A pattern supported by analyzed measurements.                                            |
| Claim            | A proposition that can be supported, contradicted, scoped, and revised.                  |
| Body of evidence | The evidence paths relevant to a claim, including supporting and contradicting material. |
| Confidence       | How strongly the current evidence supports using the claim within its stated scope.      |
| Conclusion       | An interpretation of what the evidence means.                                            |
| Recommendation   | A suggested action under explicit decision constraints.                                  |

> **Separation rule**
>
> Formal evidence systems MUST preserve these layers as distinguishable objects. A measurement is not a recommendation, and confidence in a claim is not the same thing as preference for an action.

# 8. Confidence

Confidence attaches to a scoped claim, not to a document, model, author, or general topic. Confidence is qualitative by default and MUST NOT be translated into fake probabilities without a calibrated model that justifies doing so.

| **Level** | **Use**                                                                                                                               |
|-----------|---------------------------------------------------------------------------------------------------------------------------------------|
| HIGH      | Multiple strong, relevant, reasonably independent evidence paths support the claim; important contradictions are resolved or bounded. |
| MODERATE  | Evidence supports the claim, but material limitations, indirectness, replication gaps, or plausible contradictions remain.            |
| LOW       | Evidence is limited, indirect, unstable, weakly replicated, or materially contradicted.                                               |
| VERY LOW  | Evidence is sparse or highly uncertain; the claim is primarily provisional.                                                           |

Confidence assessment SHOULD consider at least: risk of bias, consistency, directness, precision, replication, measurement validity, environmental robustness, temporal validity, and independence. A critical weakness may cap overall confidence even when other dimensions are strong.

# 9. Contradiction, failure, and unknown states

- Negative, null, contradictory, and rejected results MUST remain retained when legally and operationally possible.

- Contradictory evidence is linked to the claim rather than removed from view.

- "Insufficient evidence" and "inconclusive" are valid outcomes.

- A high-confidence material claim later found seriously wrong SHOULD trigger an epistemic incident review.

- Unexpected results are evidence. They SHOULD create new questions rather than be normalized away.

# 10. Benchmarks and test benches

A benchmark is a versioned measurement instrument. A test bench is the full evaluation configuration used to answer a decision question. Neither is permanent.

| **Rule**        | **Requirement**                                                                                                                                           |
|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| Task validity   | Tasks have clear instructions, legitimate success criteria, adequate information, and suitable graders. Invalid tasks are not counted as system failures. |
| Versioning      | Material method changes create a new version with a changelog and explicit comparability boundary.                                                        |
| Comparability   | Results are marked directly, conditionally, approximately, or not comparable when versions differ materially.                                             |
| Contamination   | Use fresh, temporal, parameterized, or sequestered material when benchmark awareness or training leakage can distort results.                             |
| Baselines       | Include credible simple alternatives. Complexity must earn its place.                                                                                     |
| Resource regime | State money, time, calls, retries, compute, and human-intervention constraints that define the comparison.                                                |
| Verification    | State exactly what was checked and which failures count against the declared unit under test.                                                             |
| Saturation      | Review or retire instruments that no longer discriminate, no longer reflect relevant work, or mainly reward benchmark-specific optimization.              |
| Living use      | Stable anchors MAY be combined with fresh sets to preserve longitudinal comparison while resisting memorization.                                          |

# 11. Reality, verification, and independence

Laboratory performance is not enough for important operational recommendations. Controlled tasks support causal understanding; realistic tasks support decision relevance. Powerfarm SHOULD combine both when the decision requires both.

Verification is proportional to consequence. It MAY include deterministic checks, tests, compilers, type systems, runtime state, independent models, expert review, or field behavior. When self-confirmation is a material risk, producer and verifier SHOULD differ.

# 12. Freshness and living knowledge

Every material result has an observation date. Volatile claims MUST include a review or retest trigger. Evidence does not expire on one universal schedule; reassessment depends on how quickly the underlying technology, price, environment, or behavior can change.

When new evidence changes a claim, Powerfarm updates the current state and preserves the previous one. Superseded does not mean false; it means no longer current under the present evidence or environment.

# 13. Independence and disclosure

- Vendor or sponsor relationships that could affect interpretation are disclosed when relevant.

- Vendors MAY provide recommended configurations, early access, credits, hardware, and factual corrections.

- Vendors, sponsors, or customers MUST NOT control metrics, suppress legitimate negative results, or determine conclusions.

- Commercial value MUST NOT be used to inflate confidence or narrow the reported limitations of evidence.

# 14. Publication and claim discipline

A public or paid claim SHOULD show the claim, scope, relevant measurement, supporting and contradicting evidence, uncertainty, confidence, limitations, freshness, current recommendation if any, and retest trigger. The level of detail may vary by product, but material uncertainty must travel with the claim.

Internal use MAY precede public certainty when the decision stakes, reversibility, and evidence support it. The state must still be explicit: provisional operational choice is not the same as high-confidence public recommendation.

# 15. Minimum research record

| **Field**               | **Minimum content**                                                                                    |
|-------------------------|--------------------------------------------------------------------------------------------------------|
| Decision Question       | What choice could change?                                                                              |
| Current belief          | What do we believe now, at what confidence, and why?                                                   |
| Study class             | Exploratory, comparative, confirmatory, replication, ablation, stress, field, longitudinal, synthesis. |
| Unit under test         | Operational system and material components.                                                            |
| Comparators / baseline  | Credible alternatives and fairness regime.                                                             |
| Measurements            | Raw primary outcomes plus diagnostics.                                                                 |
| Verification            | How correctness or usefulness is checked.                                                              |
| Environment / resources | Version, date, tools, compute, cost, time, human effort as material.                                   |
| Result state            | Valid success/failure, invalid run, infrastructure failure, grader failure, incomplete, excluded.      |
| Interpretation          | Finding, claim, confidence, limitations, recommendation.                                               |
| Next trigger            | What new evidence or change should cause reassessment?                                                 |

# 16. Canonical rules

1. Evidence outranks preference.

2. Research begins from a decision, not from a technology to celebrate.

3. Measurements precede scores; scores precede interpretation.

4. Claim scope never exceeds the study design without additional evidence.

5. Uncertainty and contradiction remain visible.

6. Negative results are product, not waste.

7. Benchmarks are replaceable instruments.

8. Real software work corrects laboratory understanding.

9. Strong claims require proportionally stronger evidence and verification.

10. History is preserved when methods, confidence, or recommendations change.

11. Fast-moving claims carry freshness and retest triggers.

12. Powerfarm prefers saying "we do not know" to manufacturing certainty.

# 17. Change rule

This standard changes when a better method produces better decisions, stronger evidence, lower bias, better realism, or lower unnecessary cost. Methodological change is expected. Material changes are versioned, their effects on comparability are stated, and prior results remain historically addressable.
