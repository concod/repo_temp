--liquibase formatted sql
--changeset aniruddh.singh:asn_master stripComments:false splitStatements:false context:1.0 labels:ASN
--comment: initial changeset for asn_master
CREATE TABLE IF NOT EXISTS inventory_smart.asn_master (
	asn_code varchar NOT NULL,
	asn_id varchar NOT NULL,
	asn_item varchar NOT NULL,
	po_code varchar NOT NULL,
	po_id varchar NOT NULL,
	po_item varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NULL,
	article varchar NULL,
	number_of_allocations int4 NULL
);