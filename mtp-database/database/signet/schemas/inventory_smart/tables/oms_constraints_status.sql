--liquibase formatted sql
--changeset liquibase:oms_constraints_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_status
CREATE TABLE inventory_smart.oms_constraints_status (
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	status varchar NOT NULL,
	preferred_status varchar NOT NULL,
	created_by varchar NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by varchar NULL,
	updated_at timestamptz NULL,
	CONSTRAINT pk_oms_constraints_status PRIMARY KEY (vendor_code, loc_code, product_code)
);

--changeset kishan.patel:oms_constraints_status_gap_remove stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1122
--comment: initial changeset for oms_constraints_status

ALTER TABLE inventory_smart.oms_constraints_status ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;
