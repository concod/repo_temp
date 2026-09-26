--liquibase formatted sql
--changeset pradeep.kumar:moving_table_to_schemas_oms_tables_test_update2 stripComments:false splitStatements:false context:Release_1_0 labels:moving_table_to_oms
--comment: moving table from IS to oms in schemas update2
CREATE TABLE IF NOT EXISTS oms.rcl_oms_constraint_master_rule (
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	rule_name varchar NULL,
	CONSTRAINT oms_constraint_rule_pk PRIMARY KEY (rcl_code, rule_code),
	CONSTRAINT rcl_osm_constraint_master_rcl_dimension_uk UNIQUE (rcl_code, rcl_dimension),
	CONSTRAINT rcl_oms_constraint_master_rule_fk FOREIGN KEY (rcl_code) REFERENCES "global".rcl_master(rcl_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);

--changeset raja.duraisamy@impactanalytics.co:rcl_oms_constraint_master_rule_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for rcl_oms_constraint_master_rule based on query analysis
CREATE INDEX IF NOT EXISTS idx_rcl_oms_constraint_master_rule_rcl_code_rule_code ON oms.rcl_oms_constraint_master_rule(rcl_code, rule_code);
CREATE INDEX IF NOT EXISTS idx_rcl_oms_constraint_master_rule_rcl_dimension ON oms.rcl_oms_constraint_master_rule(rcl_code, rcl_dimension);