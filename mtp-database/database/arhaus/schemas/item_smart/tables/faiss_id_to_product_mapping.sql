--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:faiss_id_to_product_mapping stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_faiss_id_to_product_mapping_initial_commit
--comment: initial changeset for faiss_id_to_product_mapping
CREATE TABLE item_smart.faiss_id_to_product_mapping (
	"key" int4 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	modelled_products varchar NULL,
	price float4 NULL,
	"cost" float4 NULL,
	is_modelled varchar NULL,
	aesthetic varchar NULL,
	color varchar NULL,
	comfort varchar NULL,
	covering varchar NULL,
	lifestyle varchar NULL,
	shape varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	collection_name varchar NULL,
	product_name varchar NULL,
	"type" varchar NULL,
	"function" varchar NULL,
	form varchar NULL,
	finish varchar NULL,
	description varchar NULL,
	fiscal_season_name varchar NULL,
	price_band varchar NULL,
	cost_band varchar NULL,
	vectorcol varchar NULL,
	vectorcol_clean varchar NULL,
	product_type varchar NULL
);