--liquibase formatted sql
--changeset darsh:bom_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_master
-- "global".bom_master definition
-- Drop table
-- DROP TABLE "global".bom_master;
CREATE TABLE "global".bom_master (
	parent_product_code varchar NOT NULL,
	"size" varchar NOT NULL,
	child_product_code varchar NOT NULL,
	"date" date NULL,
	bom_version varchar NULL,
	child_uom varchar NULL,
	dataareaid varchar NULL,
	bom_quantity int4 NULL,
	is_approved int4 NULL,
	line_seq int4 NULL,
	line_num float8 NULL,
	is_active int4 NULL
); 

--changeset mohammed.huzaif@impactanalytics.co add_pk stripComments:false splitStatements:false context:Release_1_0_ labels:MTP-99438
--comment: MTP-99438  - changeset fix
ALTER TABLE "global".bom_master
ADD CONSTRAINT bom_master_pk PRIMARY KEY (parent_product_code,"size");