--liquibase formatted sql
--changeset liquibase:tb_pg_product stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_pg_product
CREATE TABLE "global".tb_pg_product (
	pg_id int4 NOT NULL,
	product_id int8 NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	CONSTRAINT tb_pg_product_un UNIQUE (pg_id, product_id),
	CONSTRAINT tb_pg_product_pg_fk FOREIGN KEY (pg_id) REFERENCES "global".tb_product_group(pg_id)
)
PARTITION BY LIST (pg_id);


--changeset durgaprasad.tulugu@impactanalytics.co:added_tb_pg_product_default_partition stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added tb_pg_product_default partition
CREATE TABLE IF NOT EXISTS global.tb_pg_product_default PARTITION OF global.tb_pg_product DEFAULT;
