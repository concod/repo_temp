--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_feedback_update5 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_feedback_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_feedback (
	exp_feedback_id serial4 NOT NULL,
	experiment_id int4 NULL,
	feedback_description varchar NULL,
	created_by int4 NULL,
	created_date timestamptz DEFAULT now() NULL,
	CONSTRAINT experiment_feedback_pkey PRIMARY KEY (exp_feedback_id),
	CONSTRAINT experiment_feedback_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT experiment_feedback_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE
);