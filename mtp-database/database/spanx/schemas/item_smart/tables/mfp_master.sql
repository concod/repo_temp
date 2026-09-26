--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:faiss_id_to_product_mapping stripComments:false splitStatements:false context:Release_1_0 labels:mfp_master
--comment: initial changeset for mfp_master

CREATE TABLE item_smart.mfp_master (
	l1_name varchar(50) NULL,
	channel varchar(50) NULL,
	sub_channel varchar(50) NULL,
	fiscal_quarter int4 NULL,
	fiscal_year int4 NULL,
	fiscal_month int4 NULL,
	written_sales_units int4 NULL,
	written_sales_dollars int4 NULL,
	fiscal_year_month int4 NULL
);