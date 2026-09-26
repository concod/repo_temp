--liquibase formatted sql
--changeset liquibase:asn_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for asn_master
CREATE TABLE IF NOT EXISTS inventory_smart.asn_master (
	asn_code varchar  NULL,
	asn_id varchar NULL,
	asn_item varchar  NULL,
	po_code varchar  NULL,
	po_id varchar  NULL,
	po_item varchar  NULL,
	requirement_date date  NULL,
	channel varchar  NULL,
	available_qty int4 NULL,
	dc_code int4  NULL,
	pack_type_id varchar NULL,
	article varchar NULL,
	number_of_allocations int4 NULL
);
