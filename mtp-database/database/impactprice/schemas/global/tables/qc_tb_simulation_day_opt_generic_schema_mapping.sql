--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:qc_tb_simulation_day_opt_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: create table qc_tb_simulation_day_opt_generic_schema_mapping

CREATE TABLE "global".qc_tb_simulation_day_opt_generic_schema_mapping (
	product_id int4 NOT NULL,
	simulation_week_start_date date NULL,
	date date NOT NULL,
	base_percentage int4 NOT NULL,
	sales_units float8 NULL,
	store_split_level varchar NULL,
	day_split_ratio float8 NULL,
	elasticity float8 NULL,
	end_cap_hierarchy_level varchar NULL,
	end_cap_multiplier float8 NULL,
	baseline_sales_units float8 NULL,
	reg_price_multiplier float8 NULL,
	CONSTRAINT qc_tb_simulation_day_opt_generic_schema_mapping_pkey PRIMARY KEY (product_id, date, base_percentage)
);
