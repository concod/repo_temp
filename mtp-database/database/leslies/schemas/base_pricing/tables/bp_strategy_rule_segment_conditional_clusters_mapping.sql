--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_rule_segment_conditional_clusters_mapping_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_rule_segment_conditional_clusters_mapping_10

CREATE TABLE base_pricing.bp_strategy_rule_segment_conditional_clusters_mapping (
	strategy_id int4 NOT NULL,
	rule_id int4 NOT NULL,
	segment_a_id int4 NOT NULL,
	segment_a_name varchar(100) NOT NULL,
	segment_b_id int4 NOT NULL,
	segment_b_name varchar(100) NOT NULL,
	specific_conditions varchar(100) NOT NULL,
	cluster_a varchar(50) NOT NULL,
	cluster_b varchar(50) NOT NULL,
	CONSTRAINT bp_strategy_rule_segment_conditional_clusters_mapping_pkey PRIMARY KEY (strategy_id, rule_id, segment_a_id, segment_b_id)
)
PARTITION BY LIST (strategy_id);