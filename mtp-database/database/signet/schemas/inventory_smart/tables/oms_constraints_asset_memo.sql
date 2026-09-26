--liquibase formatted sql
--changeset liquibase:oms_constraints_audit stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_audit

CREATE TABLE inventory_smart.oms_constraints_asset_memo (
	product_code varchar NULL,
	vendor_code varchar NULL,
	loc_code varchar NULL,
	future_conversion_date date NULL,
	cancelled_memo_po_qty int4 NULL,
	committed_not_oo_qty int4 NULL,
	updated_at timestamp NULL,
	updated_by varchar NULL
);

--changeset shubham.singh@impactanalytics.co:set_all_count stripComments:false splitStatements:false context:Release_1_1 labels:MTP-29966
--comment: added a new column
ALTER TABLE inventory_smart.oms_constraints_asset_memo ADD CONSTRAINT oms_constraints_asset_memo_unique UNIQUE (product_code, vendor_code, loc_code);