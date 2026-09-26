-- liquibase formatted sql
-- changeset pulimallika.teja@impactanalytics.co:store_metrics_actualized stripComments:false splitStatements:false context: db_sync labels:store_metrics
-- comment: new table for space smart tables



CREATE TABLE space_smart.store_metrics_actualized (
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
	gm float8 NULL,
	forecasted_units float8 NULL,
	optimized_min_cc float8 NULL,
	optimized_max_cc float8 NULL,
	last_optimized date NULL,
	last_optimized_by varchar(100) NULL,
	last_optimized_level varchar(50) NULL,
	store_group varchar NULL,
	sellable_sqft int8 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	actualized_cc varchar NULL,
	CONSTRAINT store_metrics_actualized_pkey PRIMARY KEY (id)
);