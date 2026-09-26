--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_time_level_names_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_time_level_names_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_time_level_names (
	forecast_id int4 NOT NULL,
	calendar_type varchar NOT NULL,
	time_level_name varchar NOT NULL,
	"hierarchy" int4 NULL,
	skip_level_flag bool DEFAULT true NULL,
	CONSTRAINT experiment_time_level_names_forecast_id_fkey FOREIGN KEY (forecast_id) REFERENCES ada_configurator."experiment_level"(level_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS experiment_time_level_names_forecast_id_time_level_name_idx ON ada_configurator.experiment_time_level_names USING btree (forecast_id, time_level_name);