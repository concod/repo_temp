--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_channel_config stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_channel_config

CREATE TABLE base_pricing.bp_channel_config (
	hierarchy_level varchar(15) NOT NULL,
	channel_id varchar(15) NULL,
	channel_cid int4 NULL,
	channel_name varchar(100) NULL,
	is_store_editable bool DEFAULT false NULL
);