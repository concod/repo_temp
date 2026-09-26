--liquibase formatted sql
--changeset kamaleshwaran.k:po_master_version stripComments:false splitStatements:false context:po_master_version
--comment: initial changeset for po_master_version
CREATE TABLE IF NOT EXISTS inventory_smart.po_master_version (
   version_code int4 NOT NULL,
	po_code varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NULL,
	article varchar NULL,
	number_of_allocations int4 NULL,
	CONSTRAINT po_master_version_un UNIQUE (version_code, po_code, article, pack_type_id),
	CONSTRAINT po_master_version_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT po_master_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)PARTITION BY LIST (version_code);