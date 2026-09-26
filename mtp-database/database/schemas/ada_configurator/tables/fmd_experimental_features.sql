--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:fmd_experimental_features_update7 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes fmd_experimental_features_update

CREATE TABLE IF NOT EXISTS ada_configurator.fmd_experimental_features (
	agg_level_id int4 NOT NULL,
	feature_id serial4 NOT NULL,
	feature_name varchar NOT NULL,
	feature_value text NOT NULL,
	source_id int4 NULL,
	mapped_features _text NOT NULL,
	mapped_sources _int4 NOT NULL,
	join_fmt_on _varchar NULL,
	is_draft bool DEFAULT false NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	deleted_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp NULL,
	deleted_at timestamp NULL,
	status varchar DEFAULT 'inactive'::character varying NULL,
	is_finalised bool DEFAULT false NULL,
	finalised_by int4 NULL,
	finalised_at timestamp NULL,
	CONSTRAINT fmd_experimental_features_pkey PRIMARY KEY (feature_id),
	CONSTRAINT fmd_experimetnal_features_unique UNIQUE (agg_level_id, feature_name),
	CONSTRAINT fmd_experimental_features_agg_level_id_fkey FOREIGN KEY (agg_level_id) REFERENCES ada_configurator.fmd_agg_level(agg_level_id),
	CONSTRAINT fmd_experimental_features_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmd_experimental_features_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmd_experimental_features_finalised_by_fkey FOREIGN KEY (finalised_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT fmd_experimental_features_source_id_fkey FOREIGN KEY (source_id) REFERENCES ada_configurator.fmd_experimental_sources(source_id),
	CONSTRAINT fmd_experimental_features_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code)
);
CREATE INDEX IF NOT EXISTS fmd_experimental_features_agg_level_id_idx ON ada_configurator.fmd_experimental_features USING btree (agg_level_id);
CREATE INDEX IF NOT EXISTS fmd_experimental_features_is_finalised_idx ON ada_configurator.fmd_experimental_features USING btree (is_finalised);
CREATE INDEX IF NOT EXISTS fmd_experimental_features_status_idx ON ada_configurator.fmd_experimental_features USING btree (status);