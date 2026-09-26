--liquibase formatted sql
--changeset liquibase:oms_constraints_order_policy_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_constraints_order_policy_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_order_policy (
	article varchar(50) NOT NULL,
	loc_code varchar(50) DEFAULT '-'::character varying NOT NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar(50) NOT NULL,
	vendor_name varchar(50) NULL,
	replenishment_strategy varchar(50) NULL,
	scheduler varchar(50) NULL,
	order_strategy varchar(50) NULL,
	shipment_frequency varchar(50) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(50) NULL,
	id serial4 NOT NULL,
	CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (article, loc_code, channel, vendor_code)
);

--changeset harsh.agrawal:altering_schema_of_the_table_01 stripComments:false splitStatements:false context:Release_1_0 labels:updating_schema
--comment: altering schema and constraint of the tables

ALTER TABLE inventory_smart.oms_constraints_order_policy
	ADD COLUMN if not exists new_hier varchar(50) DEFAULT '-'::character NOT NULL;
ALTER TABLE inventory_smart.oms_constraints_order_policy DROP CONSTRAINT IF EXISTS pk_oms_constraints_order_policy;
ALTER TABLE inventory_smart.oms_constraints_order_policy ADD CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (article, new_hier, loc_code, channel, vendor_code);

--changeset harsh.agrawal:dropping default and not null constraints stripComments:false splitStatements:false context:Release_1_0 labels:updating_schema
--comment: removing default and not null contraint from style

ALTER TABLE inventory_smart.oms_constraints_order_policy DROP CONSTRAINT IF EXISTS pk_oms_constraints_order_policy;
ALTER TABLE inventory_smart.oms_constraints_order_policy ADD CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (article, loc_code, channel, vendor_code);
ALTER TABLE inventory_smart.oms_constraints_order_policy
	ALTER COLUMN new_hier DROP DEFAULT,
	ALTER COLUMN new_hier DROP NOT NULL;