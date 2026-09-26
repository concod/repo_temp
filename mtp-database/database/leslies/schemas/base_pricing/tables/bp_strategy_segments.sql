--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_segments_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_segments_10

CREATE TABLE base_pricing.bp_strategy_segments (
	strategy_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	CONSTRAINT unique_strategy_segment UNIQUE (strategy_id, segment_id)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_strategy_segments_segment_id ON  base_pricing.bp_strategy_segments USING btree (strategy_id);
CREATE INDEX idx_bp_strategy_segments_strategy_id ON  base_pricing.bp_strategy_segments USING btree (segment_id);