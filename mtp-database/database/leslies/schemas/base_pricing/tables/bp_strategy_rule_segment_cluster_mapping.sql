--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_rule_segment_cluster_mapping_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_rule_segment_cluster_mapping_10

CREATE TABLE base_pricing.bp_strategy_rule_segment_cluster_mapping (
	strategy_id int4 NOT NULL,
	rule_id int4 NULL,
	segment_id int4 NOT NULL,
	segment_name varchar(100) NULL,
	"cluster" varchar(50) NOT NULL,
	CONSTRAINT bp_strategy_rule_segment_cluster_mapping_pkey PRIMARY KEY (strategy_id, segment_id, cluster)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bpsrscm_cluster ON  base_pricing.bp_strategy_rule_segment_cluster_mapping USING btree (cluster);
CREATE INDEX idx_bpsrscm_segment_id ON  base_pricing.bp_strategy_rule_segment_cluster_mapping USING btree (segment_id);