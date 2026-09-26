--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_action_counts stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for master_plan_action_counts

CREATE TABLE item_smart.master_plan_action_counts (
	mpa_plan_id int4 NOT NULL,
	action_type varchar(50) NOT NULL,
	count int4 DEFAULT 0 NULL,
	CONSTRAINT master_plan_action_counts_pkey PRIMARY KEY (mpa_plan_id, action_type),
	CONSTRAINT master_plan_action_counts_mpa_plan_id_fkey FOREIGN KEY (mpa_plan_id) REFERENCES item_smart.master_plan_attributes(master_plan_id)
);