--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_profile_user_mapping_size_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for product_profile_user_mapping_size backup
CREATE TABLE IF NOT EXISTS data_retention.product_profile_user_mapping_size (
	pp_code int4 NOT NULL,
	l0_name varchar NULL,
	size_level_proportion float4 NOT NULL,
	overall_proportion float4 NOT NULL,
	"size" varchar NOT NULL,
	store_code varchar NOT NULL,
	snapshot_date date NOT null,
	CONSTRAINT pp_size_store_un_bkp UNIQUE (pp_code, size, store_code, snapshot_date)
)PARTITION BY LIST (snapshot_date);

