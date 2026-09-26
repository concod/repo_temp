--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_level_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_level_update

CREATE TABLE IF NOT EXISTS ada_configurator."experiment_level" (
	level_id serial4 NOT NULL,
	experiment_id int4 NULL,
	exp_level_type ada_configurator."experiement_level_type" NULL,
	CONSTRAINT experiment_level_pkey PRIMARY KEY (level_id),
	CONSTRAINT experiment_level_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS experiment_level_experiment_id_exp_level_type_idx ON ada_configurator.experiment_level USING btree (experiment_id, exp_level_type);