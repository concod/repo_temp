--liquibase formatted sql
--changeset liquibase:raja.duraisamy:oms_constraints_order_policy_update3 stripComments:false splitStatements:false context:MTP-17787 labels:VS-284
--comment: oms_constraints_order_policy update

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_order_policy (
	article varchar(50) NOT NULL,
	loc_code varchar(255) NOT NULL,
	vendor_name varchar(50) NULL,
	replenishment_strategy varchar(50) NULL,
	scheduler varchar(50) NULL,
	order_strategy varchar(50) NULL,
	shipment_frequency varchar(50) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	vendor_code varchar(50) NULL,
	id serial4 NOT NULL,
	column_updated varchar NULL,
	CONSTRAINT pk_oms_constraints_order_policy UNIQUE (article, loc_code, vendor_code)
);

--changeset liquibase:shreyansh.jain:oms_constraints_order_policy_update_id_fix stripComments:false splitStatements:false context:MTP-17787 labels:MTP-86361
--comment: oms_constraints_order_policy_update_id_fix
ALTER TABLE inventory_smart.oms_constraints_order_policy
DROP COLUMN id;
ALTER TABLE inventory_smart.oms_constraints_order_policy
ADD COLUMN id int4 NULL;


--changeset liquibase:sreenivas.s@impactanalytics.co:oms_constraints_order_policy_id_datatype_fix stripComments:false splitStatements:false context:MTP-17787 labels:oms_constraints_order_policy_id_datatype_fix
--comment: oms_constraints_order_policy_id_datatype_fix
ALTER TABLE inventory_smart.oms_constraints_order_policy
DROP COLUMN id;
ALTER TABLE inventory_smart.oms_constraints_order_policy
ADD COLUMN id serial4 NOT NULL;

--changeset liquibase:vikramsundar.k@impactanalytics.co:oms_constraints_order_policy_columns_datatype_fix stripComments:false splitStatements:false context:MTP-17787 labels:oms_constraints_order_policy_columns_datatype_fix
--comment: oms_constraints_order_policy_columns_datatype_fix
ALTER TABLE inventory_smart.oms_constraints_order_policy ALTER COLUMN article TYPE VARCHAR(256);
ALTER TABLE inventory_smart.oms_constraints_order_policy ALTER COLUMN vendor_name TYPE VARCHAR(256);
ALTER TABLE inventory_smart.oms_constraints_order_policy ALTER COLUMN vendor_code TYPE VARCHAR(256);
ALTER TABLE inventory_smart.oms_constraints_order_policy ALTER COLUMN replenishment_strategy TYPE VARCHAR(256);
ALTER TABLE inventory_smart.oms_constraints_order_policy ALTER COLUMN scheduler TYPE VARCHAR(256);
ALTER TABLE inventory_smart.oms_constraints_order_policy ALTER COLUMN order_strategy TYPE VARCHAR(256);
ALTER TABLE inventory_smart.oms_constraints_order_policy ALTER COLUMN shipment_frequency TYPE VARCHAR(256);