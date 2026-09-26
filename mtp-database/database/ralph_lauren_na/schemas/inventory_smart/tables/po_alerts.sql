--liquibase formatted sql
--changeset saad.adeeb@impactanalytics.co:po_alerts stripComments:false splitStatements:false context:Release_1_0 labels:MTp-51599
--comment: initial changeset for po_alerts
CREATE TABLE inventory_smart.po_alerts (
	po_nbr text NULL,
	article text NULL,
	product_description text NULL,
	style_color_id text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	"l3_Name" text NULL,
	"l4_Name" text NULL,
	dtc_year text NULL,
	pfs_year text NULL,
	dtc_season text NULL,
	pfs_season text NULL,
	brand text NULL,
	anticipate_date date NULL,
	available_to_allocate int4 NULL,
	"dest_whouse" text null,
	CONSTRAINT po_alerts_un UNIQUE (article,po_nbr, dest_whouse)
);
--changeset saad.adeeb@impactanalytics.co:po_alerts_col_change stripComments:false splitStatements:false context:Release_1_0 labels:MTp-51599
--comment: initial changeset for po_alerts_col_change
ALTER TABLE inventory_smart.po_alerts RENAME COLUMN "l3_Name" TO l3_name;
ALTER TABLE inventory_smart.po_alerts RENAME COLUMN "l4_Name" TO l4_name;

--changeset saad.adeeb@impactanalytics.co:po_alerts_col_change_v2 stripComments:false splitStatements:false context:Release_1_0 labels:MTp-51599
--comment: initial changeset for po_alerts_col_change_v2
ALTER TABLE inventory_smart.po_alerts RENAME COLUMN po_nbr TO po_code;
ALTER TABLE inventory_smart.po_alerts RENAME COLUMN available_to_allocate TO available_qty;
ALTER TABLE inventory_smart.po_alerts ADD channel varchar NULL;
ALTER TABLE inventory_smart.po_alerts ADD is_deleted boolean NULL DEFAULT false;
ALTER TABLE inventory_smart.po_alerts ADD product_group _varchar NULL;
--changeset saad.adeeb@impactanalytics.co:po_alerts_col_change_v3 stripComments:false splitStatements:false context:Release_1_0 labels:MTp-51599
--comment: initial changeset for po_alerts_col_change_v3
ALTER TABLE inventory_smart.po_alerts ADD source_code varchar NULL;
ALTER TABLE inventory_smart.po_alerts ADD rtl_coordinate_group_desc varchar NULL;

--changeset kirubasahari.n@impactanalytics.co:po_alerts_col_addition stripComments:false splitStatements:false context:Release_1_0 labels:RLIS-878
--comment: Add column PO_type
ALTER TABLE inventory_smart.po_alerts ADD po_type varchar NULL;


--changeset liquibase:Kiruba:add_raw_po_code_&_product_group_columns_to_po_master stripComments:false splitStatements:false context:RLIS-878 labels:RLIS-878
--comment: RLIS-878:Add columns raw_po_code and product_group to po_alerts
ALTER TABLE inventory_smart.po_alerts ADD raw_po_code varchar NULL;
