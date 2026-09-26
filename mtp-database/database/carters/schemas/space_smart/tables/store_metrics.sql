-- liquibase formatted sql
-- changeset kumar.shubham@impactanalytics.co:store_metrics stripComments:false splitStatements:false context: db_sync labels:store_metrics
-- comment: new table for space smart tables

CREATE TABLE space_smart.store_metrics (
	id serial4 NOT NULL,
	store_number varchar(50) NOT NULL,
	season varchar(50) NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar(100) NULL,
	l4_name varchar(100) NULL,
	l5_name varchar(100) NULL,
	attribute_name varchar(100) NULL,
	parent_block varchar(50) NULL,
	store_parent_block varchar(50) NULL,
	status varchar(50) NULL,
	space_elasticity varchar(50) NULL,
	sales numeric(18, 2) NULL,
	gm numeric(18, 2) NULL,
	forecasted_units int4 NULL,
	optimized_min_cc int4 NULL,
	optimized_max_cc int4 NULL,
	last_optimized date NOT NULL,
	last_optimized_by varchar(100) NOT NULL,
	last_optimized_level varchar(50) NULL,
	store_group varchar NULL,
	sellable_sqft int8 NULL,
	CONSTRAINT store_metrics_pkey PRIMARY KEY (id)
);

--changeset kumar.shubham@impactanalytics.co:store_metrics_table_changes stripComments:false splitStatements:false context:new_column labels:liquibase_project_start
--comment: adding new column ml patrent block in store metrics and column name change for attribute_filter to gender

ALTER TABLE space_smart.store_metrics ADD COLUMN ml_per_parent_block int8 NULL;
ALTER TABLE space_smart.store_metrics RENAME COLUMN attribute_name TO gender;

--changeset pulimallika.teja@impactanalytics.co:store_metrics_table_change stripComments:false splitStatements:false context:new_columns labels:liquibase_project_start
--comment: Modifying type of gm,forecasted_units, Optimized_min and Optimized_max to float
ALTER TABLE space_smart.store_metrics
ALTER COLUMN gm TYPE float USING gm::float,
ALTER COLUMN forecasted_units TYPE float USING forecasted_units::float,
ALTER COLUMN optimized_min_cc TYPE float USING optimized_min_cc::float,
ALTER COLUMN optimized_max_cc TYPE float USING optimized_max_cc::float;

--changeset kumar.shubham@impactanalytics.co:store_metrics_index stripComments:false splitStatements:false context:index on store_number and season labels:liquibase_project_start
--comment: creating index on store_number and season

CREATE INDEX store_metrics_store_number_season_idx ON space_smart.store_metrics (store_number, season);

--changeset kumar.shubham@impactanalytics.co:store_metrics_table_change stripComments:false splitStatements:false context:type change labels:liquibase_project_start
--comment: Modifying sellable_sqft type to float

ALTER TABLE space_smart.store_metrics ALTER COLUMN sellable_sqft TYPE float USING sellable_sqft::float;

--changeset kumar.shubham@impactanalytics.co:store_metrics_new_columns_created_at_and_updated_at stripComments:false splitStatements:false context:new columns labels:store_metrics_new_created_at_updated_at
--comment: Added new columns created_at and updated_at

ALTER TABLE space_smart.store_metrics
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;