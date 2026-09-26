--liquibase formatted sql
--changeset liquibase:tb_latest_pricing_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_pricing_v2
DROP TABLE IF EXISTS "global".tb_latest_pricing CASCADE;
CREATE TABLE "global".tb_latest_pricing (
	c0_id int4 NULL,
	c2_id int4 NULL,
	channel varchar NULL,
	s3_name varchar NULL,
	s3_id int4 NULL,
	product_id int4 NULL,
	price float8 NULL
);
CREATE INDEX mkd_prc_prod_store_id_idx ON global.tb_latest_pricing USING btree (c2_id, product_id, s3_id);


--changeset vamsi.balaga@impactanalytics.co:tb_latest_pricing_change_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: change primary key to (c2_id, product_id, s3_id)
ALTER TABLE "global"."tb_latest_pricing"
    DROP CONSTRAINT IF EXISTS tb_latest_pricing_pk;
ALTER TABLE "global"."tb_latest_pricing"
    ADD CONSTRAINT tb_latest_pricing_pk PRIMARY KEY (c2_id, product_id, s3_id);

