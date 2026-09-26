--liquibase formatted sql
--changeset liquibase:tb_budget_master_ty stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_budget_master_ty


CREATE TABLE price_promo_opt.tb_budget_master_ty (
	dates date NOT NULL,
	week_start_date date NOT NULL,
	s0_id int4 NOT NULL,
	s0_name text NULL,
	s3_id int4 NOT NULL,
	s3_name text NULL,
	c0_name varchar NULL,
	c0_id int4 NOT NULL,
	c2_id int4 NULL,
	customer_id int4 NULL,
	product_id int4 NOT NULL,
	sales_units float8 NULL,
	margin float4 NULL,
	revenue float4 NULL,
	CONSTRAINT tb_budget_master_ty_pkey PRIMARY KEY (s0_id, product_id, s3_id, dates, c0_id)
)
PARTITION BY RANGE (dates);


--changeset kumaran.k@impactanalytics.co:tb_budget_master_ty_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: tb_budget_master_ty_v5


DROP TABLE IF EXISTS price_promo_opt.tb_budget_master_ty;
CREATE TABLE price_promo_opt.tb_budget_master_ty (
	dates date NOT NULL,
	week_start_date date NOT NULL,
	c0_id int4 NOT NULL,
	s0_id int4 NOT NULL,
	s0_name text NULL,
	s3_id int4 NOT NULL,
	s3_name text NULL,
	product_id int4 NOT NULL,
	sales_units float8 NULL,
	margin float8 NULL,
	revenue float8 NULL,
	CONSTRAINT tb_budget_master_ty_pkey PRIMARY KEY (dates, c0_id, s0_id, s3_id, product_id)
)
PARTITION BY RANGE (dates);