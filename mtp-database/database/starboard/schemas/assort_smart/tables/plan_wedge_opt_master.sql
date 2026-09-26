

--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_wedge_opt_master stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_wedge_opt_master  

CREATE TABLE IF not exists assort_smart.plan_wedge_opt_master (
	plan_wedge_opt_id varchar NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	parent_wedge_id varchar(1024) NULL,
	image_name_url varchar(1024) NULL,
	CONSTRAINT plan_wedge_opt_master_pkey PRIMARY KEY (plan_wedge_opt_id)
);