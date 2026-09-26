--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:customer_channel_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customer_channel_master

CREATE TABLE IF NOT EXISTS "pricesmart".customer_channel_master (
	c0_name text NULL,
	c0_id int4 NOT NULL,
	s0_name text NULL,
	s0_id int4 NOT NULL,
	CONSTRAINT pk_customer_channel_master PRIMARY KEY (c0_id, s0_id)
);