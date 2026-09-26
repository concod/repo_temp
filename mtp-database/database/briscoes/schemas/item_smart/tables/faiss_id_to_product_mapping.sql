--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:faiss_id_to_product_mapping_new stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for faiss_id_to_product_mapping


CREATE TABLE IF NOT EXISTS item_smart.faiss_id_to_product_mapping (
	"key" int8 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	modelled_products varchar NULL,
	color varchar NULL,
	style_name varchar NULL,
	product_bucket_code varchar NULL,
	sales_org_name varchar NULL,
	price int8 NULL,
	"cost" float8 NULL,
	is_modelled varchar NULL,
	price_band varchar NULL,
	cost_band varchar NULL,
	vectorcol varchar NULL
);

--changeset pardhu.gopalam@impactanalytics.co:faiss_update_datatype_01 stripComments:false splitStatements:false context:Release_1_0 labels:faiss_update_par1
--comment: update_for_price_data_type

ALTER TABLE item_smart.faiss_id_to_product_mapping ALTER COLUMN price TYPE float8 USING price::float8;


--changeset shrey.jaiswal@impactanalytics.co:columns_addition_1 stripComments:false splitStatements:false context:Release_1_0 labels:faiss_update_par1
--comment: adding new columns 


ALTER TABLE item_smart.faiss_id_to_product_mapping ADD fiscal_season_name varchar NULL ;
ALTER TABLE item_smart.faiss_id_to_product_mapping ADD price_percentile float8 NULL ;
ALTER TABLE item_smart.faiss_id_to_product_mapping ADD cost_percentile float8 NULL ;
ALTER TABLE item_smart.faiss_id_to_product_mapping ADD pc varchar NULL ;
ALTER TABLE item_smart.faiss_id_to_product_mapping ADD cc varchar NULL ;
ALTER TABLE item_smart.faiss_id_to_product_mapping ADD vectorcol_clean varchar NULL ;

