--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.assort_master_plan_bpk stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for assort_master_plan_bpk



CREATE TABLE IF not exists assort_smart.assort_master_plan_bpk (
	plan_master_id int4 DEFAULT nextval('assort_smart.assort_master_plan_plan_master_id_seq'::regclass) NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	channel varchar NULL,
	start_date date NULL,
	CONSTRAINT assort_master_plan_pkey PRIMARY KEY (plan_master_id)
);