--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:actual_forex_rate  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for actual_forex_rate

CREATE TABLE IF NOT EXISTS "global".customer_master (
	c0_name text NULL,
	c0_id int4 NULL,
	c1_name text NULL,
	c1_id int4 NULL,
	c2_name text NULL,
	c2_id int4 NULL,
	customer_id int4 NOT NULL,
	customer_name text NULL,
	CONSTRAINT pk_customer_master PRIMARY KEY (customer_id)
);