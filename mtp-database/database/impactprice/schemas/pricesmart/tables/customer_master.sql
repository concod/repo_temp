--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:customer_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customer_master

CREATE TABLE IF NOT EXISTS pricesmart.customer_master (
	c0_name text NULL,
	c0_id int4 NULL,
	c1_name text NULL,
	c1_id int4 NULL,
	c2_name text NULL,
	c2_id int4 NULL,
	customer_id int4 NOT NULL,
	customer_name text NULL,
	customer_reco_level text GENERATED ALWAYS AS ((((COALESCE(c0_id::text, '1'::text) || '_'::text) || COALESCE(c1_id::text, '1'::text)) || '_'::text) || COALESCE(c2_id::text, '1'::text)) STORED,
	CONSTRAINT pk_customer_master PRIMARY KEY (customer_id)
);