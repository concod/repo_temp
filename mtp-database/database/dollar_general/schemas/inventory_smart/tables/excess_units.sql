--liquibase formatted sql
--changeset swapnil.bhange:excess_units stripComments:false splitStatements:false context:Release_1_0 labels:0052
--comment: initial changeset for excess_units
CREATE TABLE inventory_smart.excess_units (
	psa_name int4 NOT NULL,
	product_code varchar NOT NULL,
	primary_sku varchar NOT NULL,
	product_description varchar NULL,
	l0_code int4 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	fiscal_year_week int4 NULL,
	oh float4 NULL,
	actual_sales int4 NULL,
	it float4 NULL,
	oo float4 NULL,
	ros float4 NULL,
	forecast float4 NULL,
	wos_threshold float4 NULL,
	wos float4 NULL,
	inventory_closing_balance float4 NULL,
	excess_inventory float4 NULL,
	excess_inventory_cost float4 NULL
);


-- inventory_smart.excess_units foreign keys

ALTER TABLE inventory_smart.excess_units ADD CONSTRAINT excess_units_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;


--changeset swapnil.bhange-2:excess_units_v2 stripComments:false splitStatements:false context:Release_1_0 labels:0053
--comment: added 1 column for excess_units
ALTER TABLE inventory_smart.excess_units ADD fiscal_week_start_date date NULL;
ALTER TABLE inventory_smart.excess_units ALTER COLUMN l0_code TYPE varchar;

--changeset swapnil.bhange-3:excess_units_v23 stripComments:false splitStatements:false context:Release_1_0 labels:0054
--comment: renamed column to date column for excess_units
ALTER TABLE inventory_smart.excess_units RENAME COLUMN fiscal_week_start_date TO "date";


--changeset swapnil.bhange-4:excess_units_v24 stripComments:false splitStatements:false context:Release_1_0 labels:0055
--comment: added 2 column for excess_units
ALTER TABLE inventory_smart.excess_units ADD COLUMN actual_sales_cost float4 NULL;
ALTER TABLE inventory_smart.excess_units ADD COLUMN	inventory_closing_balance_cost float4 NULL;
