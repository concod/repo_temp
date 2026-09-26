-- liquibase formatted sql
-- changeset paras.jain@impactanalytics.co:store_last_saved_version stripComments:false splitStatements:false context: store_last_saved_version labels:store_last_saved_version
-- comment: new table for space smart tables


-- space_smart.store_last_saved_version definition
-- Drop table
-- DROP TABLE space_smart.store_last_saved_version;

CREATE TABLE space_smart.store_last_saved_version (
	id serial4 NOT NULL,
	store_number varchar(50) NOT NULL,
	season varchar(50) NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar(100) NULL,
	l4_name varchar(100) NULL,
	l5_name varchar(100) NULL,
	gender varchar(100) NULL,
	parent_block varchar(50) NULL,
	store_parent_block varchar(50) NULL,
	status varchar(50) NULL,
	space_elasticity varchar(50) NULL,
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
	CONSTRAINT store_last_saved_version_pkey PRIMARY KEY (id)
);
CREATE INDEX store_last_saved_version_store_number_season_idx ON space_smart.store_last_saved_version USING btree (store_number, season);

--changeset kumar.shubham@impactanalytics.co:store_type_change_last_saved_version stripComments:false splitStatements:false context:new column added:liquibase_project_start
--comment: column cloud_task_id added

ALTER TABLE space_smart.store_last_saved_version ADD COLUMN IF NOT EXISTS cloud_task_id VARCHAR DEFAULT NULL;


--changeset kumar.shubham@impactanalytics.co:store_last_saved_version_new_columns_created_at_and_updated_at stripComments:false splitStatements:false context:new columns in store_last_saved_versionlabels:liquibase_project_start
--comment: Added new columns created_at and updated_at in store_last_saved_version

ALTER TABLE space_smart.store_last_saved_version
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;