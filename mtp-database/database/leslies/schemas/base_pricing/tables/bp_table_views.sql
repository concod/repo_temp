--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_table_views_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_table_views_10



CREATE TABLE base_pricing.bp_table_views (
	table_name varchar(100) NOT NULL,
	user_id int4 NOT NULL,
	table_view_id bigserial NOT NULL,
	table_view_name varchar(100) NOT NULL,
	is_global bool DEFAULT false NULL,
	is_default bool DEFAULT false NULL,
	table_view_metadata jsonb NULL,
	created_by int4 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_by int4 NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_table_views_pkey PRIMARY KEY (table_view_id, user_id),
	CONSTRAINT bp_table_views_table_name_user_id_table_view_name_key UNIQUE (table_name, user_id, table_view_name)
)
PARTITION BY LIST (user_id);
CREATE INDEX idx_bp_table_views_table_name_table_view_name ON  base_pricing.bp_table_views USING btree (table_name);
CREATE INDEX idx_bp_table_views_table_name_user ON  base_pricing.bp_table_views USING btree (table_name, user_id);
CREATE INDEX idx_bp_table_views_table_view_id ON  base_pricing.bp_table_views USING btree (table_view_id);