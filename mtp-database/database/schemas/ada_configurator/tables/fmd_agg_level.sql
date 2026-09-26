--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:fmd_agg_level_update7 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes fmd_agg_level_update

CREATE TABLE IF NOT EXISTS ada_configurator.fmd_agg_level (
	agg_level_id serial4 NOT NULL,
	product_level jsonb NULL,
	store_level jsonb NULL,
	time_level jsonb NULL,
	created_by int4 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT fmd_agg_level_pkey PRIMARY KEY (agg_level_id),
	CONSTRAINT fmd_agg_level_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code)
);
CREATE INDEX IF NOT EXISTS fmd_agg_level_product_level_gin_idx ON ada_configurator.fmd_agg_level USING gin (product_level);
CREATE INDEX IF NOT EXISTS fmd_agg_level_store_level_gin_idx ON ada_configurator.fmd_agg_level USING gin (store_level);
CREATE INDEX IF NOT EXISTS fmd_agg_level_time_level_gin_idx ON ada_configurator.fmd_agg_level USING gin (time_level);