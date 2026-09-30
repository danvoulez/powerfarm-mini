export const SCHEMA_VERSION = 1;

export const schemaSql = String.raw`
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entities_kind ON entities(kind);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  entity_id TEXT REFERENCES entities(id),
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_artifacts_kind ON artifacts(kind);

CREATE TABLE IF NOT EXISTS artifact_versions (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  version TEXT NOT NULL,
  content_digest TEXT,
  source_uri TEXT,
  revision TEXT,
  media_type TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE(artifact_id, version)
);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact ON artifact_versions(artifact_id);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  document_digest TEXT,
  schema_uri TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contracts_kind ON contracts(kind);

CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  subject_entity_id TEXT NOT NULL REFERENCES entities(id),
  capability TEXT NOT NULL,
  resource_pattern TEXT NOT NULL DEFAULT '*',
  effect TEXT NOT NULL DEFAULT 'allow',
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_grants_subject ON grants(subject_entity_id, status);

CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  principal_entity_id TEXT NOT NULL REFERENCES entities(id),
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS recorded_acts (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  actor_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  evidence_digest TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recorded_acts_object ON recorded_acts(object_type, object_id, seq);
CREATE INDEX IF NOT EXISTS idx_recorded_acts_actor ON recorded_acts(actor_id, seq);

CREATE TABLE IF NOT EXISTS app_contracts (
  id TEXT PRIMARY KEY,
  app_entity_id TEXT NOT NULL REFERENCES entities(id),
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  contract_json TEXT NOT NULL,
  content_digest TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(app_entity_id, version)
);

CREATE TABLE IF NOT EXISTS decision_records (
  id TEXT PRIMARY KEY,
  owner_entity_id TEXT REFERENCES entities(id),
  decision TEXT NOT NULL,
  context TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  consequences TEXT,
  reversal_trigger TEXT,
  status TEXT NOT NULL DEFAULT 'current',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  supersedes_id TEXT REFERENCES decision_records(id)
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  impact TEXT NOT NULL,
  causal_factors TEXT,
  detection TEXT,
  recovery TEXT,
  missed_signals TEXT,
  actions_json TEXT NOT NULL DEFAULT '[]',
  owner_entity_id TEXT REFERENCES entities(id),
  followup_trigger TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS studies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  decision_question TEXT NOT NULL,
  current_belief TEXT,
  current_confidence TEXT,
  study_class TEXT NOT NULL,
  unit_under_test_json TEXT NOT NULL DEFAULT '{}',
  hypothesis TEXT,
  resource_regime_json TEXT NOT NULL DEFAULT '{}',
  primary_outcomes_json TEXT NOT NULL DEFAULT '[]',
  verification_plan TEXT,
  analysis_method TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  owner_entity_id TEXT REFERENCES entities(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_studies_status ON studies(status);
CREATE INDEX IF NOT EXISTS idx_studies_class ON studies(study_class);

CREATE TABLE IF NOT EXISTS study_comparators (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  configuration_json TEXT NOT NULL DEFAULT '{}',
  fairness_regime TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  comparator_id TEXT REFERENCES study_comparators(id),
  result_state TEXT NOT NULL DEFAULT 'incomplete',
  environment_json TEXT NOT NULL DEFAULT '{}',
  resource_usage_json TEXT NOT NULL DEFAULT '{}',
  route_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_study ON runs(study_id);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  value_json TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  source_digest TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_observations_run ON observations(run_id);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  observation_id TEXT REFERENCES observations(id),
  metric TEXT NOT NULL,
  value_number REAL,
  value_text TEXT,
  unit TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  verifier TEXT,
  measured_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_measurements_run ON measurements(run_id);
CREATE INDEX IF NOT EXISTS idx_measurements_metric ON measurements(metric);

CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  method_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  analysis_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  study_id TEXT REFERENCES studies(id),
  statement TEXT NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisional',
  freshness_state TEXT NOT NULL DEFAULT 'current',
  review_trigger TEXT,
  observed_through TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  supersedes_id TEXT REFERENCES claims(id)
);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

CREATE TABLE IF NOT EXISTS claim_evidence (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  evidence_kind TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  stance TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_claim ON claim_evidence(claim_id);

CREATE TABLE IF NOT EXISTS confidence_assessments (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  rationale TEXT NOT NULL,
  dimensions_json TEXT NOT NULL DEFAULT '{}',
  assessed_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_confidence_claim ON confidence_assessments(claim_id, created_at);

CREATE TABLE IF NOT EXISTS conclusions (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  interpretation TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  study_id TEXT REFERENCES studies(id),
  claim_id TEXT REFERENCES claims(id),
  action TEXT NOT NULL,
  constraints_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'current',
  retest_trigger TEXT,
  created_at TEXT NOT NULL,
  supersedes_id TEXT REFERENCES recommendations(id)
);

CREATE TABLE IF NOT EXISTS content_objects (
  digest TEXT PRIMARY KEY,
  algorithm TEXT NOT NULL DEFAULT 'sha256',
  size_bytes INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  object_kind TEXT NOT NULL DEFAULT 'blob',
  manifest_json TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  verified_at TEXT
);

CREATE TABLE IF NOT EXISTS execution_routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  configuration_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS executable_contracts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  temporal_predicate_json TEXT NOT NULL DEFAULT '{}',
  observational_predicate_json TEXT NOT NULL DEFAULT '{}',
  policy_json TEXT NOT NULL DEFAULT '{}',
  effect_json TEXT NOT NULL DEFAULT '{}',
  verification_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, generation)
);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES executable_contracts(id),
  contract_generation INTEGER NOT NULL,
  trigger_json TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ready',
  idempotency_key TEXT NOT NULL UNIQUE,
  claimed_by TEXT,
  claimed_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_executions_state ON executions(state, created_at);

CREATE TABLE IF NOT EXISTS execution_receipts (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  receipt_kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(state, available_at);

CREATE TABLE IF NOT EXISTS benchmark_instruments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  methodology_digest TEXT,
  comparability_boundary TEXT,
  contamination_strategy TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS benchmark_tasks (
  id TEXT PRIMARY KEY,
  benchmark_id TEXT NOT NULL REFERENCES benchmark_instruments(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  instructions_digest TEXT,
  success_criteria_json TEXT NOT NULL DEFAULT '{}',
  grader_json TEXT NOT NULL DEFAULT '{}',
  sequestered INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(benchmark_id, task_key)
);

CREATE TABLE IF NOT EXISTS test_benches (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  benchmark_id TEXT REFERENCES benchmark_instruments(id),
  name TEXT NOT NULL,
  configuration_json TEXT NOT NULL DEFAULT '{}',
  resource_regime_json TEXT NOT NULL DEFAULT '{}',
  verification_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_signals (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  value_json TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  source_digest TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_evidence_signals_domain ON evidence_signals(domain, observed_at);
CREATE INDEX IF NOT EXISTS idx_evidence_signals_subject ON evidence_signals(subject, observed_at);

CREATE TABLE IF NOT EXISTS product_candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  problem TEXT NOT NULL,
  product_class TEXT NOT NULL,
  recurring_decision TEXT,
  differentiated_value TEXT,
  maintenance_case TEXT,
  demand_evidence TEXT,
  external_alternatives TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  candidate_id TEXT REFERENCES product_candidates(id),
  name TEXT NOT NULL,
  product_class TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  value_proposition TEXT NOT NULL,
  maintenance_trigger TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publication_records (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  claim_id TEXT REFERENCES claims(id),
  title TEXT NOT NULL,
  visibility TEXT NOT NULL,
  content_digest TEXT,
  published_at TEXT,
  corrected_at TEXT,
  supersedes_id TEXT REFERENCES publication_records(id),
  created_at TEXT NOT NULL
);
`;
