
--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sku_st_info_new stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for sku_st_info
CREATE TABLE if not exists item_smart.sku_st_info (
	hierarchy_code int4 NOT NULL,
	dept text NOT NULL,
	"year" int4 NOT NULL,
	st_perc float8 NOT NULL,
	CONSTRAINT sku_st_info_pkey PRIMARY KEY (hierarchy_code, dept, year)
);