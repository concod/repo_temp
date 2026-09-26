--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:fmt_metadata_update6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes fmt_metadata_update

CREATE TABLE IF NOT EXISTS ada_configurator.fmt_metadata (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	workstream_id int8 NOT NULL,
	loa_id int4 NOT NULL,
	features _text NOT NULL,
	query text NULL,
	status varchar DEFAULT false NULL,
	cloud_task_id varchar NULL,
	logs text NULL,
	message text NULL,
	created_by int4 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	deleted_by int4 NULL,
	deleted_at timestamp NULL,
	CONSTRAINT fmt_pkey PRIMARY KEY (id),
	CONSTRAINT fmt_ukey_name UNIQUE (name),
	CONSTRAINT fmt_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmt_fkey_loa FOREIGN KEY (loa_id) REFERENCES ada_configurator.fmd_agg_level(agg_level_id),
	CONSTRAINT fmt_fkey_workstream FOREIGN KEY (workstream_id) REFERENCES ada_configurator.workstream(workstream_id),
	CONSTRAINT fmt_workstreams_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmt_workstreams_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);
