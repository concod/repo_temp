--liquibase formatted sql
--changeset abhi.bhardwaj@impactanalytics.co:preallocation_po_alerts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.preallocation_po_alerts definition
-- inventory_smart.preallocation_po_alerts definition

-- Drop table

-- DROP TABLE inventory_smart.preallocation_po_alerts;

CREATE TABLE IF NOT EXISTS inventory_smart.preallocation_po_alerts (
	raw_po_code varchar NULL,
	anticipate_date date NULL,
	purchqty int4 NULL,
	qtyreceived int4 NULL,
	available_qty int4 NULL,
	asn_id varchar NULL,
	dc_number varchar NULL,
	dest_whouse varchar NULL,
	article varchar NULL,
	product_code varchar NULL,
	channel varchar NULL,
	style_color_id_og varchar NULL,
	product_description varchar NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	brand varchar NULL,
	rtl_coordinate_group_desc varchar NULL,
	store_group varchar NULL,
	s1_id varchar NULL,
	CONSTRAINT preallocation_po_alerts_un UNIQUE (product_code, dc_number)
);

--changeset abhi.bhardwaj@impactanalytics.co:preallocation_po_alerts_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Changed datatype of store_group
ALTER TABLE inventory_smart.preallocation_po_alerts ALTER COLUMN store_group TYPE _varchar USING ARRAY[store_group];
