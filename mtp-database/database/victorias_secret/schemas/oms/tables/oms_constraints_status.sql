--liquibase formatted sql
--changeset liquibase:raja.duraisamy:oms_constraints_status_update3 stripComments:false splitStatements:false context:Release_1_0 labels:VS-284
--comment: oms_constraints_status update

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_status (
	id serial4 NOT NULL,
	product_code varchar(50) NOT NULL,
	store_code varchar(50) NULL,
	vendor_code varchar(50) NULL,
	vendor_name varchar(50) NULL,
	status varchar(50) NULL,
	preferred_status varchar(50) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar NULL,
	CONSTRAINT pk_oms_constraints_status PRIMARY KEY (product_code)
);

--changeset kanishka.parashar:addingl6_id stripComments:false splitStatements:false context:Release_1_0 labels:data_type_updates
--comment: adding_column_l6_id
ALTER TABLE inventory_smart.oms_constraints_status 
ADD COLUMN IF NOT EXISTS l6_id VARCHAR null;