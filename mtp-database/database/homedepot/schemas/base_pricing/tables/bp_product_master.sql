--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_product_master_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_master_v1


CREATE TABLE base_pricing.bp_product_master (
	product_id int4 NOT NULL,
	product_name varchar NULL,
	l0_id int4 NULL,
	l0_name varchar NULL,
	l0_cuq varchar NULL,
	l0_cid int4 NULL,
	l1_id int4 NULL,
	l1_name varchar NULL,
	l1_cuq varchar NULL,
	l1_cid int4 NULL,
	l2_id int4 NULL,
	l2_name varchar NULL,
	l2_cuq varchar NULL,
	l2_cid int4 NULL,
	l3_id int4 NULL,
	l3_name varchar NULL,
	l3_cuq varchar NULL,
	l3_cid int4 NULL,
	l4_id int4 NULL,
	l4_name varchar NULL,
	l4_cuq varchar NULL,
	l4_cid int4 NULL,
	active bool NULL,
	product_image varchar NULL,
	CONSTRAINT hd_product_master_pkey PRIMARY KEY (product_id)
);
