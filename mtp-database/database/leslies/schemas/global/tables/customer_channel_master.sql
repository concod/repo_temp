--liquibase formatted sql
--changeset liquibase:customer_channel_master_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customer_channel_master_v1

DROP TABLE IF EXISTS "global".customer_channel_master CASCADE;
CREATE TABLE "global".customer_channel_master (
	c0_name text NULL,
	c0_id int4 NULL,
	s0_name text NULL,
	s0_id int4 NULL
);
CREATE INDEX cust_chnl_mst_tier_id_idx ON global.customer_channel_master USING btree (c0_id);

--changeset vamsi.balaga@impactanalytics.co:customer_channel_master_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to customer_channel_master
ALTER TABLE "global"."customer_channel_master"
    ADD CONSTRAINT customer_channel_master_pk PRIMARY KEY (c0_id,s0_id);

