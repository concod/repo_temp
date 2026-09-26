--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:dc_split_ratio stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_dc_split_ratio
--comment: initial changeset for dc_split_ratio

CREATE TABLE IF NOT EXISTS inventory_smart.dc_split_ratio (
	id serial4 NOT NULL,
	article varchar(50) NULL,
	product_code varchar(50) NOT NULL,
	"size" varchar(50) NULL,
	loc_code varchar(50) NOT NULL,
	sales_org_name varchar(50) NOT NULL,
	fiscal_year_week int4 NOT NULL,
	peneteration float8 NULL,
	CONSTRAINT pk_dc_split_ratio PRIMARY KEY (product_code, loc_code, sales_org_name, fiscal_year_week)
);


--changeset sidhartha.c@impactanalytics.co:column_add_oms_dc_split_ratio stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:column_add_dc_split_ratio
--comment: column_add_dc_split_ratio


ALTER TABLE inventory_smart.dc_split_ratio DROP CONSTRAINT pk_dc_split_ratio;
ALTER TABLE inventory_smart.dc_split_ratio DROP COLUMN sales_org_name;
ALTER TABLE inventory_smart.dc_split_ratio ADD COLUMN IF NOT EXISTS channel varchar;
UPDATE inventory_smart.dc_split_ratio SET channel = '-' WHERE channel IS NULL;
ALTER TABLE inventory_smart.dc_split_ratio ALTER COLUMN channel SET NOT NULL;
ALTER TABLE inventory_smart.dc_split_ratio ADD CONSTRAINT pk_dc_split_ratio PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week);
