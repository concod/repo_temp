--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_bookmark_filters stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_bookmark_filters

CREATE SEQUENCE base_pricing_restaurant.bp_saved_filters_id_seq;

CREATE TABLE base_pricing_restaurant.bp_bookmark_filters (
	id int4 DEFAULT nextval('base_pricing_restaurant.bp_saved_filters_id_seq'::regclass) NOT NULL,
	"name" varchar(255) NOT NULL,
	description text NULL,
	user_id int4 NOT NULL,
	screen_name varchar(100) NOT NULL,
	parent_id int4 NULL,
	filter_data jsonb NOT NULL,
	is_default bool DEFAULT false NULL,
	is_global bool DEFAULT false NULL,
	is_active bool DEFAULT false NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_bookmark_filters_name_unique UNIQUE (name),
	CONSTRAINT bp_saved_filters_pkey PRIMARY KEY (id),
	CONSTRAINT fk_bp_bookmark_filters_parent_id FOREIGN KEY (parent_id) REFERENCES base_pricing_restaurant.bp_bookmark_filters(id) ON DELETE SET NULL
);
CREATE INDEX idx_bp_bookmark_filters_parent_id ON base_pricing_restaurant.bp_bookmark_filters USING btree (parent_id);
CREATE INDEX idx_bp_saved_filters_active ON base_pricing_restaurant.bp_bookmark_filters USING btree (user_id, screen_name, is_active);
CREATE INDEX idx_bp_saved_filters_global ON base_pricing_restaurant.bp_bookmark_filters USING btree (is_global);
CREATE INDEX idx_bp_saved_filters_user_screen ON base_pricing_restaurant.bp_bookmark_filters USING btree (user_id, screen_name);


--changeset vishnu.vardhan@impactanalytics.co:bp_bookmark_filters_2 stripComments:false splitStatements:false
--comment: Add is_all_screens column to bp_bookmark_filters_2 table

ALTER TABLE base_pricing_restaurant.bp_bookmark_filters
ADD COLUMN IF NOT EXISTS is_all_screens BOOLEAN DEFAULT FALSE;