-- liquibase formatted sql
-- changeset sadhana.jaiswal:store_optimized_report stripComments:false splitStatements:false context: store_optimized_report labels:store_optimized_report
-- comment: new table for space smart tables

CREATE TABLE space_smart.store_optimized_report (
	id serial4 NOT NULL,
	store_number varchar(50) NOT NULL,
	season varchar(50) NOT NULL,
	l4_name varchar(100) NULL,
	gender varchar(100) NULL,
	l3_name varchar(100) NULL,
	l5_name varchar(100) NULL,
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
	sellable_sqft float8 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	cloud_task_id varchar NULL,
	CONSTRAINT store_optimized_report_pkey PRIMARY KEY (id)
);

--changeset kumar.shubham@impactanalytics.co:store_optimized_report_index stripComments:false splitStatements:false context:index on store_number and season labels:liquibase_project_start
--comment: creating index on store_number and season

CREATE INDEX store_optimized_report_store_number_season_idx ON space_smart.store_optimized_report (store_number, season);

--changeset kumar.shubham@impactanalytics.co:store_optimized_report_type_change stripComments:false splitStatements:false context:columns type change:liquibase_project_start
--comment: Modifying type of gm,forecasted_units, Optimized_min and Optimized_max to float

ALTER TABLE space_smart.store_optimized_report ALTER COLUMN gm TYPE float USING gm::float;
ALTER TABLE space_smart.store_optimized_report ALTER COLUMN forecasted_units TYPE float USING forecasted_units::float;
ALTER TABLE space_smart.store_optimized_report ALTER COLUMN optimized_min_cc TYPE float USING optimized_min_cc::float;
ALTER TABLE space_smart.store_optimized_report ALTER COLUMN optimized_max_cc TYPE float USING optimized_max_cc::float;