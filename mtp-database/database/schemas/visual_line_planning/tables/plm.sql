--liquibase formatted sql
--changeset liquibase:plm stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plm
CREATE TABLE visual_line_planning.plm (
	id uuid NOT NULL,
	product_image_url text NOT NULL,
	a1_name text NOT NULL,
	a0_name text NOT NULL,
	auc numeric NOT NULL,
	a2_name text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	CONSTRAINT plm_pkey PRIMARY KEY (id)
);