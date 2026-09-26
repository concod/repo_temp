--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:fmd_global_features_update6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes fmd_global_features_update

CREATE TABLE IF NOT EXISTS ada_configurator.fmd_global_features (
	agg_level_id int4 NOT NULL,
	feature_id serial4 NOT NULL,
	feature_name varchar NOT NULL,
	feature_value text NOT NULL,
	source_id int4 NULL,
	mapped_features _text NOT NULL,
	mapped_sources _int4 NOT NULL,
	join_fmt_on _varchar NULL,
	created_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	is_draft bool DEFAULT false NULL,
	updated_by int4 NULL,
	deleted_by int4 NULL,
	finalised_by int4 NULL,
	updated_at timestamp NULL,
	deleted_at timestamp NULL,
	finalised_at timestamp NULL,
	status bool DEFAULT false NULL,
	CONSTRAINT fmd_global_features_feature_name_key UNIQUE (agg_level_id, feature_name),
	CONSTRAINT fmd_global_features_pkey PRIMARY KEY (feature_id),
	CONSTRAINT fmd_global_features_agg_level_id_fkey FOREIGN KEY (agg_level_id) REFERENCES ada_configurator.fmd_agg_level(agg_level_id),
	CONSTRAINT fmd_global_features_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmd_global_features_finalised_by_fkey FOREIGN KEY (finalised_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmd_global_features_source_id_fkey FOREIGN KEY (source_id) REFERENCES ada_configurator.fmd_global_sources(source_id),
	CONSTRAINT fmd_global_features_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);