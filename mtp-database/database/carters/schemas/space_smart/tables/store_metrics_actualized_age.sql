--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co:store_metrics_actualized_age stripComments:false splitStatements:false context:store_metrics_actualized_age labels:liquibase_project_start
--comment: store_metrics_actualized_age
--rollback: SELECT 1

DROP TABLE IF EXISTS space_smart.store_metrics_actualized_age;

CREATE TABLE space_smart.store_metrics_actualized_age (
	id serial4 NOT NULL,
	store_number varchar(50) NOT NULL,
	season varchar(50) NOT NULL,
	l4_name varchar(100) NULL,
	parent_block varchar(50) NULL,
	store_parent_block varchar(50) NULL,
	status varchar(50) NULL,
	sales numeric(18, 2) NULL,
	gm float8 NULL,
	forecasted_units float8 NULL,
	optimized_min_cc float8 NULL,
	optimized_max_cc float8 NULL,
	last_optimized date NULL,
	last_optimized_by varchar(100) NULL,
	store_group varchar NULL,
	sellable_sqft int8 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	actualized_cc varchar NULL,
	attribute_name varchar(50) NULL,
	percentage_contribution float8 NULL,
	space_elasticity varchar(50) NULL,
	CONSTRAINT store_metrics_actualized_age_pkey PRIMARY KEY (id),
	CONSTRAINT store_metrics_actualized_age_pp_unique UNIQUE (store_number, season, l4_name)
);

--changeset srinivasgowda.sg@impactanalytics.co:store_metrics_actualized_age_Altering_data_type stripComments:false splitStatements:false context:new columns labels:liquibase_project_start
--comment: store_metrics_actualized_age Altring data type

ALTER TABLE space_smart.store_metrics_actualized_age 
ALTER COLUMN sellable_sqft TYPE float 
USING sellable_sqft::float;