--liquibase formatted sql
--changeset vaibhav@impactanalytics.co:tb_future_inventory_po stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_future_inventory_po

CREATE TABLE "global".tb_future_inventory_po (
	s0_id int4 NULL,
	s0_name varchar(100) NULL,
	s1_id int4 NULL,
	s1_name varchar(100) NULL,
	store_id int4 NULL,
	style_cuq varchar(50) NULL,
	product_id int4 NULL,
	po_date date NULL,
	initial_eta date NULL,
	ordered_quantity numeric(10, 2) NULL,
	po_type varchar(50) NULL,
	vendor_id int4 NULL,
	vendor_name varchar(100) NULL,
	origin_country varchar(10) NULL,
	destination_country varchar(10) NULL,
	po_number varchar(50) NULL,
	season_name varchar(50) NULL,
	receiving_warehouse varchar(100) NULL,
	pk_po_headerid int8 NULL,
	sku varchar(50) NULL,
	initial_unit_price numeric(10, 2) NULL,
	rn int4 NULL
);