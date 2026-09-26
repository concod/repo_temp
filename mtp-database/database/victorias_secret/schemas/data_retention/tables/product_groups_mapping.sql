--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_groups_mapping_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for product_groups_mapping backup
CREATE TABLE IF NOT EXISTS data_retention.product_groups_mapping (
	pg_code int4 NOT NULL,
	product_code varchar NOT NULL,
	ref_pg_code int4 NULL,
	avg_st_perc float4 NULL,
	rev_con_perc float4 NULL,
	snapshot_date date NOT null,
	CONSTRAINT product_groups_mapping_pk PRIMARY KEY (pg_code, product_code,snapshot_date)
) PARTITION BY LIST (snapshot_date);

