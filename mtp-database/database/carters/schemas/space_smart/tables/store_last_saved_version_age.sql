-- liquibase formatted sql
-- changeset paras.jain@impactanalytics.co:store_last_saved_version_age stripComments:false splitStatements:false context: store_last_saved_version_age labels:store_last_saved_version
-- comment: new table for space smart tables


CREATE TABLE space_smart.store_last_saved_version_age (
	id serial4 NOT NULL,
	store_number varchar(50) NOT NULL,
	season varchar(50) NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l4_name varchar(100) NULL,
	parent_block varchar(50) NULL,
	store_parent_block varchar(50) NULL,
	status varchar(50) NULL,
	sales numeric(18, 2) NULL,
	gm float8 NULL,
	forecasted_units float8 NULL,
	optimized_min_cc float8 NULL,
	optimized_max_cc float8 NULL,
	last_optimized date NOT NULL,
	last_optimized_by varchar(100) NOT NULL,
	last_optimized_level varchar(50) NULL,
	store_group varchar NULL,
	sellable_sqft float8 NULL,
	ml_per_parent_block int8 NULL,
	cloud_task_id varchar NULL,
	space_contribution float8 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	space_elasticity varchar(50) NULL,
	CONSTRAINT store_last_saved_version_age_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_space_smart_store_last_saved_version_age ON space_smart.store_last_saved_version_age USING btree (store_number, l4_name);
CREATE INDEX store_last_saved_version_store_number_season_age_idx ON space_smart.store_last_saved_version_age USING btree (store_number, season);