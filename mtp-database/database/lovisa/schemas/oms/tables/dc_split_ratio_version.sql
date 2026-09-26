--liquibase formatted sql
--changeset swapnil.b:dc_split_ratio_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:_version
--comment: initial changeset for dc_split_ratio_version_v2

CREATE TABLE IF NOT EXISTS inventory_smart.dc_split_ratio_version (
	version_code int4 NOT NULL,
	article varchar(50) NULL,
	product_code varchar(50) NOT NULL,
	"size" varchar(50) NULL,
	loc_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	fiscal_year_week int4 NOT NULL,
	penetration float4 NULL,
	CONSTRAINT pk_dc_split_ratio PRIMARY KEY (version_code, product_code, loc_code, channel, fiscal_year_week)
) PARTITION BY LIST (version_code);

