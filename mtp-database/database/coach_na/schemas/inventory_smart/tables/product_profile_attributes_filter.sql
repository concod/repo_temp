--liquibase formatted sql
--changeset draksharapu.rajesh:dc_reserve_quantity_sync_test stripComments:false splitStatements:false context:Release_1.1 labels:dc_reserve_quantity_sync
--comment: MTP-55972
--rollback: SELECT 1

CREATE TABLE   inventory_smart.product_profile_attributes_filter (
	pp_code int4 NOT NULL,
	article _text NULL,
	l5_name _text NULL,
	l7_name _text NULL,
	l2_name _text NULL,
	l8_name _text NULL,
	l4_name _text NULL,
	l3_name _text NULL,
	l0_name _text NULL,
	l1_name _text NULL,
	l6_name _text NULL,
	"size" _text NULL,
	channel _text NULL,
	assortment_indicator _text NULL,
	article_orig _text NULL,
	CONSTRAINT product_profile_attributes_filter_pkey PRIMARY KEY (pp_code)
);
