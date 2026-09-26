--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_customer_segment_master_5 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_customer_segment_master_new

CREATE TABLE base_pricing_restaurant.bp_customer_segment_master (
	segment_id int4 NOT NULL,
	segment_code varchar(50) NOT NULL,
	segment_name varchar(100) NOT NULL,
	segment_description text NULL,
	is_active bool DEFAULT true NULL,
	tenant_id varchar(50) NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_customer_segment_master_pkey PRIMARY KEY (segment_id),
	CONSTRAINT bp_customer_segment_master_segment_code_key UNIQUE (segment_code)
);