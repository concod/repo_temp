--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_master_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_master_update1

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_master (
	experiment_id serial4 NOT NULL,
	experiment_name varchar(42) NOT NULL,
	workstream_id int4 NOT NULL,
	"level" ada_configurator."experiement_modelling_level" DEFAULT 'High'::ada_configurator.experiement_modelling_level NULL,
	experiment_status ada_configurator."experiment_training_status" DEFAULT 'To Do'::ada_configurator.experiment_training_status NULL,
	report_status ada_configurator."experiment_training_status" DEFAULT 'To Do'::ada_configurator.experiment_training_status NULL,
	training_start timestamptz NULL,
	training_end timestamptz NULL,
	report_start timestamptz NULL,
	report_end timestamptz NULL,
	model_summary_url varchar(2083) NULL,
	exp_chain_flag bool DEFAULT false NULL,
	created_on timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	modified_by int4 NULL,
	modified_date timestamptz DEFAULT now() NULL,
	is_deleted bool DEFAULT false NOT NULL,
	target_summary_url varchar(2083) NULL,
	page_unique_id varchar NULL,
	CONSTRAINT experiment_master_pkey PRIMARY KEY (experiment_id),
	CONSTRAINT experiment_master_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT experiment_master_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT experiment_master_workstream_id_fkey FOREIGN KEY (workstream_id) REFERENCES ada_configurator.workstream(workstream_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS experiment_master_workstream_id_idx ON ada_configurator.experiment_master USING btree (workstream_id);

