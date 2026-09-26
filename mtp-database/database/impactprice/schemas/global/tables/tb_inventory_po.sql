--liquibase formatted sql
--changeset liquibase:tb_inventory_po stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_inventory_po

CREATE TABLE "global".tb_inventory_po (
	s0_id int4 NOT NULL,
	s0_name varchar(50) NOT NULL,
	s1_id int4 NULL,
	s1_name varchar(50) NULL,
	style_cuq varchar(50) NOT NULL,
	product_id int8 NOT NULL,
	store_code int4 NOT NULL,
	po_date date NOT NULL,
	po_order int4 NOT NULL,
	CONSTRAINT tb_inventory_po_pk PRIMARY KEY (s0_id, s0_name, style_cuq, product_id, store_code, po_date, po_order)
);