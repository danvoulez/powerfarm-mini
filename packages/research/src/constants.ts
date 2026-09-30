export const studyClasses = [
  "exploratory",
  "comparative",
  "confirmatory",
  "replication",
  "ablation",
  "stress_test",
  "field",
  "longitudinal",
  "evidence_synthesis",
] as const;

export const resultStates = [
  "valid_success",
  "valid_failure",
  "invalid_run",
  "infrastructure_failure",
  "grader_failure",
  "incomplete",
  "excluded",
] as const;

export const confidenceLevels = ["HIGH", "MODERATE", "LOW", "VERY LOW"] as const;
export const evidenceStances = ["supporting", "contradicting", "context"] as const;
