--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experimental_fmt_mapping_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experimental_fmt_mapping_update

CREATE TABLE IF NOT EXISTS ada_configurator.experimental_fmt_mapping (
	experiment_id int4 NULL,
	fmt_metadata_id int4 NULL,
	storage_location varchar NULL,
	storage_path varchar NULL,
	fmt_creation_status ada_configurator."experiment_training_status" DEFAULT 'To Do'::ada_configurator.experiment_training_status NULL,
	created_on timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	deleted_on timestamptz DEFAULT now() NULL,
	deleted_by int4 NULL,
	CONSTRAINT experimental_fmt_mapping_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT experimental_fmt_mapping_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT experimental_fmt_mapping_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS experimental_fmt_mapping_experiment_id_fmt_metadata_id_idx ON ada_configurator.experimental_fmt_mapping USING btree (experiment_id, fmt_metadata_id);