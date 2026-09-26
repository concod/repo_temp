--liquibase formatted sql
--changeset liquibase:dc_split_ratio stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: initial changeset for dc_split_ratio
CREATE TABLE IF NOT EXISTS inventory_smart.dc_split_ratio (
	article varchar(50) NULL,
	product_code int4 NULL,
	"size" varchar(50) NULL,
	loc_code varchar(50) NULL,
	channel varchar(50) NULL,
	fiscal_year_week int4 NULL,
	penetration float4 NULL
);

--changeset kanishka.parashar:updating_columns_primary_key_fix stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: updating_columns_primary_key_fix


ALTER TABLE inventory_smart.dc_split_ratio
ALTER COLUMN product_code TYPE varchar(50);

-- ALTER TABLE inventory_smart.dc_split_ratio 
-- DROP CONSTRAINT IF EXISTS pk_dc_split_ratio;

-- ALTER TABLE inventory_smart.dc_split_ratio 
-- ADD CONSTRAINT pk_dc_split_ratio PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week);