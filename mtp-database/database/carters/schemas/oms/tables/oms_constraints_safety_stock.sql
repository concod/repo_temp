--liquibase formatted sql
--changeset liquibase:oms_constraints_safety_stock_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_constraints_safety_stock_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_safety_stock (
	article varchar(50) NOT NULL,
	loc_code varchar(50) DEFAULT '-'::character varying NOT NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar(50) NOT NULL,
	vendor_name varchar(50) NULL,
	safety_stock_method varchar(50) NULL,
	safety_stock_twos int4 NULL,
	demand_twos int4 DEFAULT 6 NULL,
	service_level_pct float4 NULL,
	stock_units int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(50) NULL,
	id serial4 NOT NULL,
	CONSTRAINT pk_oms_constraints_safety_stock PRIMARY KEY (article, loc_code, channel, vendor_code)
);

--changeset pradeep.kumar@impactanalytics.co:service_pct_type_int_test stripComments:false splitStatements:false context:Release_1_0 labels:service_level_pct_to_int
--comment: changing datatype of service level pct to int

ALTER TABLE inventory_smart.oms_constraints_safety_stock ALTER COLUMN service_level_pct TYPE int4 USING service_level_pct::int4;