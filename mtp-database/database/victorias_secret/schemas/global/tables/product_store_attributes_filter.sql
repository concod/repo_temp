--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_store_attributes_filter stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for product_store_attributes_filter

CREATE TABLE "global".product_store_attributes_filter (
	psa_code text NOT NULL,
	l0_id text NULL,
	l0_name text NULL,
	l2_id text NULL,
	l2_name text NULL,
	l3_id text NULL,
	l3_name text NULL,
	l4_id text NULL,
	l4_name text NULL,
	l5_id text NULL,
	l5_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code)
);
CREATE INDEX product_store_attributes_filter_l0_name_idx ON global.product_store_attributes_filter USING btree (l0_name);


--changeset kamuju.mahaveer@impactanalytics.co:product_store_attributes_filter_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE "global".product_store_attributes_filter ADD l1_id text NULL ;
ALTER TABLE "global".product_store_attributes_filter ADD l1_name text NULL ;

--changeset linu.nazil:product_store_attributes_filter_v2 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE "global".product_store_attributes_filter DROP CONSTRAINT IF EXISTS product_store_attributes_filter_pk;
ALTER TABLE "global".product_store_attributes_filter ADD CONSTRAINT product_store_l5_attributes_filter_pk PRIMARY KEY (psa_code, store_code, l5_name);
CREATE INDEX product_store_attributes_filter_l5_name_idx ON "global".product_store_attributes_filter using btree(l5_name);


--changeset kamuju.mahaveer@impactanalytics.co:product_store_attributes_filter_v5 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-649
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE "global".product_store_attributes_filter DROP COLUMN IF EXISTS l1_id ;
ALTER TABLE "global".product_store_attributes_filter DROP COLUMN IF EXISTS l1_name ;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];
