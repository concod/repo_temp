--liquibase formatted sql
--changeset laraib.ahmad liquibase:forecast_kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for forecast_kpi_table

CREATE TABLE IF NOT EXISTS inventory_smart.forecast_kpi_table (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	store_name varchar NOT NULL,
	adjusted_forecast_qty_lw float4 NULL,
	predicted_qty_lw float4 NULL,
	qty_lw int4 NULL,
	adjusted_forecast_qty_l4w float4 NULL,
	predicted_qty_l4w float4 NULL,
	qty_l4w int4 NULL,
	adjusted_forecast_qty_l8w float4 NULL,
	predicted_qty_l8w float4 NULL,
	qty_l8w int4 NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	channel varchar NULL,
	state varchar NULL,
	district varchar NULL,
	city varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	primary_trait_desc varchar NULL,
	CONSTRAINT forecast_kpi_table_un UNIQUE (product_code, store_code),
	CONSTRAINT forecast_kpi_table_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT forecast_kpi_table_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
--changeset laraib.ahmad:dc_reserve_quantity stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: added the missing columns 
ALTER TABLE inventory_smart.forecast_kpi_table
    ADD COLUMN IF NOT EXISTS deviation_predicted_lw float8 NULL,
    ADD COLUMN IF NOT EXISTS deviation_predicted_l4w float8 NULL,
    ADD COLUMN IF NOT EXISTS deviation_predicted_l8w float8 NULL,
    ADD COLUMN IF NOT EXISTS deviation_adjusted_lw float8 NULL,
    ADD COLUMN IF NOT EXISTS deviation_adjusted_l4w varchar NULL,
    ADD COLUMN IF NOT EXISTS deviation_adjusted_l8w float8 NULL,
    ADD COLUMN IF NOT EXISTS override_success_product_level int4 NULL;
--changeset laraib.ahmad:forecast_kpi_table stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment:  RENAME COLUMN product_code TO article
ALTER TABLE inventory_smart.forecast_kpi_table RENAME COLUMN product_code TO article;
--changeset laraib.ahmad:forecast_kpi_table_1 stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment:  droping  FK CONSTRAINT 
ALTER TABLE inventory_smart.forecast_kpi_table
DROP CONSTRAINT forecast_kpi_table_product_fk;
--changeset laraib_1.ahmad:forecast_kpi_table stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: added the missing columns_1
ALTER TABLE inventory_smart.forecast_kpi_table
    ADD COLUMN IF NOT EXISTS override_success_product_level_l4w int4 NULL,
    ADD COLUMN IF NOT EXISTS override_success_product_level_l8w int4 NULL;
--changeset laraib_2.ahmad:forecast_kpi_table stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: added the missing deviation
ALTER TABLE inventory_smart.forecast_kpi_table ADD COLUMN IF NOT EXISTS deviation float8 NULL;

--changeset pradeep.kumar:forecast_kpi_table stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: added the missing deviation

ALTER TABLE inventory_smart.forecast_kpi_table DROP COLUMN IF EXISTS store_name;
ALTER TABLE inventory_smart.forecast_kpi_table DROP COLUMN IF EXISTS l3_name;
ALTER TABLE inventory_smart.forecast_kpi_table DROP COLUMN IF EXISTS l4_name;
ALTER TABLE inventory_smart.forecast_kpi_table DROP COLUMN IF EXISTS primary_trait_desc;

ALTER TABLE inventory_smart.forecast_kpi_table DROP CONSTRAINT IF EXISTS forecast_kpi_table_un;
ALTER TABLE inventory_smart.forecast_kpi_table DROP CONSTRAINT IF EXISTS forecast_kpi_table_store_fk;

ALTER TABLE inventory_smart.forecast_kpi_table DROP COLUMN IF EXISTS store_code;

ALTER TABLE inventory_smart.forecast_kpi_table ADD CONSTRAINT forecast_kpi_table_un UNIQUE (article);