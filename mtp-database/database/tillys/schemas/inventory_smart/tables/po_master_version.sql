--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:po_master_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1
--comment: initial changeset for po_master_version
CREATE TABLE if not exists inventory_smart.po_master_version (
	version_code int4 NOT NULL,
	po_code varchar NOT NULL,
	product_code varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	allocated_qty int4 NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	not_before_date date NULL,
	pack_type_id varchar NULL,
	article varchar NULL,
	CONSTRAINT po_master_version_un UNIQUE (version_code, po_code, product_code, dc_code, channel, requirement_date, not_before_date),
	CONSTRAINT po_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT po_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT po_master_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);