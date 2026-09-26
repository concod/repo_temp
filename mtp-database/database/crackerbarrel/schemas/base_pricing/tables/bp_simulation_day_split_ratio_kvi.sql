--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_day_split_ratio_kvi stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_day_split_ratio_kvi

CREATE TABLE base_pricing.bp_simulation_day_split_ratio_kvi (
	product_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	"date" date NOT NULL,
	day_split_ratio float4 NOT NULL,
	CONSTRAINT bp_simulation_day_split_ratio_kvi_prk PRIMARY KEY (product_id, channel_id, segment_id, week_start_date, date)
)
PARTITION BY RANGE (week_start_date);

CREATE INDEX idx_bp_simulation_day_split_ratio_kvi_id1 ON  base_pricing.bp_simulation_day_split_ratio_kvi USING btree (date);
CREATE INDEX idx_bp_simulation_day_split_ratio_kvi_id2 ON  base_pricing.bp_simulation_day_split_ratio_kvi USING btree (week_start_date);
CREATE INDEX idx_bp_simulation_day_split_ratio_kvi_id3 ON  base_pricing.bp_simulation_day_split_ratio_kvi USING btree (product_id);
CREATE INDEX idx_bp_simulation_day_split_ratio_kvi_id4 ON  base_pricing.bp_simulation_day_split_ratio_kvi USING btree (segment_id);
CREATE INDEX idx_bp_simulation_day_split_ratio_kvi_id5 ON  base_pricing.bp_simulation_day_split_ratio_kvi USING btree (channel_id);
CREATE INDEX idx_bp_simulation_day_split_ratio_kvi_main ON  base_pricing.bp_simulation_day_split_ratio_kvi USING btree (product_id, channel_id, segment_id, week_start_date);