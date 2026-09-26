--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:fmd_experimental_sources_update6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes fmd_experimental_sources_update

CREATE TABLE IF NOT EXISTS ada_configurator.fmd_experimental_sources (
	source_id serial4 NOT NULL,
	source_name varchar(255) NOT NULL,
	source_value varchar NOT NULL,
	source_type varchar(50) NULL,
	level_of_aggregation _text NOT NULL,
	features _text NOT NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	deleted_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp NULL,
	deleted_at timestamp NULL,
	status varchar DEFAULT true NULL,
	is_draft bool DEFAULT false NULL,
	is_finalised bool DEFAULT false NULL,
	level_of_aggregation_display _text NULL,
	cloud_task_id varchar(100) NULL,
	CONSTRAINT fmd_experimental_sources_pkey PRIMARY KEY (source_id),
	CONSTRAINT fmd_experimental_sources_source_name_key UNIQUE (source_name),
	CONSTRAINT fmd_experimental_sources_source_type_check CHECK (((source_type)::text = ANY (ARRAY[('query'::character varying)::text, ('flow_chart'::character varying)::text]))),
	CONSTRAINT fmd_experimental_sources_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmd_experimental_sources_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmd_experimental_sources_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);
