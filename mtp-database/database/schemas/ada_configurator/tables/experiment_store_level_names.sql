--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_store_level_names_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_store_level_names_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_store_level_names (
	forecast_id int4 NOT NULL,
	store_level_id varchar NOT NULL,
	store_level_name varchar NULL,
	"hierarchy" int4 NULL,
	skip_level_flag bool DEFAULT true NULL,
	CONSTRAINT experiment_store_level_names_forecast_id_fkey FOREIGN KEY (forecast_id) REFERENCES ada_configurator."experiment_level"(level_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS experiment_store_level_names_forecast_id_store_level_id_idx ON ada_configurator.experiment_store_level_names USING btree (forecast_id, store_level_id);