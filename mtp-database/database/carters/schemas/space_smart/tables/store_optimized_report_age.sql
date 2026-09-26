--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co:store_optimized_report_age stripComments:false splitStatements:false context:store_optimized_report_age labels:liquibase_project_start
--comment: store_optimized_report_age
--rollback: SELECT 1

DROP TABLE IF EXISTS space_smart.store_optimized_report_age;

CREATE TABLE space_smart.store_optimized_report_age (
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
	last_optimized date NOT NULL,
	last_optimized_by varchar(100) NOT NULL,
	store_group varchar NULL,
	sellable_sqft float8 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	space_contribution float8 NULL,
	cloud_task_id varchar NULL,
	space_elasticity varchar(50) DEFAULT NULL::character varying NULL,
	CONSTRAINT store_optimized_report_age_pkey PRIMARY KEY (id)
);
CREATE INDEX store_number_season_store_optimized_age_idx ON space_smart.store_optimized_report_age USING btree (store_number, season);
CREATE INDEX store_optimized_report_store_number_season_age_idx ON space_smart.store_optimized_report_age USING btree (store_number, season);