--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_attributes_2 stripComments:false splitStatements:false context:Release_1_2 labels:itemsmart_initial_commit_4
--comment: rename column names

CREATE TABLE item_smart.master_plan_attributes (
	master_plan_id serial4 NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	channel _varchar NOT NULL,
	hierarchy_filter jsonb NULL,
	CONSTRAINT master_plan_attributes_pkey PRIMARY KEY (master_plan_id)
);