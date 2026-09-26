--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:assort_smart.channel_details stripComments:false splitStatements:false context:MTP-69513 labels:add_missing_cols
--comment: initial changeset for launch_delivery_mapping_date

CREATE TABLE IF NOT EXISTS assort_smart.launch_delivery_mapping_date (
	id serial4 NOT NULL,
	season_code int8 NULL,
	launch int4 NULL,
	delivery int4 NULL,
	launch_start_date varchar NULL,
	delivery_start_date varchar NULL,
	channel varchar NULL,
	final_level varchar NULL,
	is_active bool NULL
);
CREATE INDEX launch_delivery_mapping_date_season_code_idx ON assort_smart.launch_delivery_mapping_date USING btree (season_code, channel, final_level);