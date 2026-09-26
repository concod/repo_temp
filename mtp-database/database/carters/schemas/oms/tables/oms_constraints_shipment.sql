--liquibase formatted sql
--changeset liquibase:oms_constraints_shipment_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_constraints_shipment_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_shipment (
	product_code varchar(50) NOT NULL,
	loc_code varchar(50) DEFAULT '-'::character varying NOT NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar(50) NOT NULL,
	vendor_name varchar(50) NULL,
	min_replenishment_quantity int4 DEFAULT 0 NOT NULL,
	max_replenishment_quantity int4 DEFAULT 99999 NOT NULL,
	order_multiple int4 DEFAULT 1 NOT NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(255) NULL,
	id serial4 NOT NULL,
	CONSTRAINT check_oms_constraints_ordering CHECK ((min_replenishment_quantity <= max_replenishment_quantity)),
	CONSTRAINT pk_oms_constraints_ordering PRIMARY KEY (product_code, loc_code, channel, vendor_code)
);

--changeset pradeep.kumar:adding_moq_tolerance_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: adding moq_tolerance column

ALTER TABLE inventory_smart.oms_constraints_shipment
ADD COLUMN IF NOT EXISTS moq_tolerance INT4 DEFAULT 100;