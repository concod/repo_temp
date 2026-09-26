--liquibase formatted sql
--changeset liquibase:saad.adeeb@impactanalytics.co:po_master stripComments:false splitStatements:false context:MTP-50162 labels:mtp-50162
--comment: MTP-50162:initial changeset for po_master
CREATE TABLE inventory_smart.po_master (
	po_code text NULL,
	dept_nbr int4 NULL,
	class_nbr int4 NULL,
	style_nbr int4 NULL,
	color_nbr text NULL,
	size_nbr text NULL,
	div_nbr int4 NULL,
	vendor_nbr int4 NULL,
	simple_vendor_cost float4 NULL,
	po_vendor_code int4 NULL,
	requirement_date date NULL,
	cancel_date date NULL,
	anticipate_date date NULL,
	article text NULL,
	dc_code int4 NULL,
	available_qty int4 NULL,
	product_code text NULL,
	allocated_qty int4 NULL,
	not_before_date date NULL DEFAULT CURRENT_DATE - 1,
	pack_type_id varchar NULL,
	channel varchar NULL
);

--changeset liquibase:kirubasahari.n@impactanalytics.co:add_columns_to_po_master stripComments:false splitStatements:false context:RLIS-878 labels:RLIS-878
--comment: RLIS-878:Add columns to po_master
ALTER TABLE inventory_smart.po_master ADD po_type varchar NULL;
ALTER TABLE inventory_smart.po_master ADD dest_whouse int4 NULL;
ALTER TABLE inventory_smart.po_master ADD s1_id varchar[] NULL;


--changeset liquibase:Kiruba:add_row_po_code_column_to_po_master stripComments:false splitStatements:false context:RLIS-878 labels:RLIS-878
--comment: RLIS-878:Add column row_po_code to po_master
ALTER TABLE inventory_smart.po_master ADD raw_po_code varchar NULL;