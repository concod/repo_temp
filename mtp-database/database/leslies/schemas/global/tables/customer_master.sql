--liquibase formatted sql
--changeset liquibase:customer_master_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customer_master_v1

DROP TABLE IF EXISTS "global".customer_master CASCADE;
CREATE TABLE "global".customer_master (
	c0_name text NULL,
	c0_id int4 NULL,
	c1_name text NULL,
	c1_id int4 NULL,
	c2_name text NULL,
	c2_id int4 NULL,
	customer_id int4 NULL,
	customer_name text NULL
);
CREATE INDEX cust_mst_tier_id_idx ON global.customer_master USING btree (c2_id);

--changeset vamsi.balaga@impactanalytics.co:customer_master_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to customer_master
ALTER TABLE "global"."customer_master"
    ADD CONSTRAINT customer_master_pk PRIMARY KEY (c2_id);
