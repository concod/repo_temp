--liquibase formatted sql
--changeset liquibase:tb_pg_product stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_pg_product
CREATE TABLE "global".tb_pg_product (
	pg_id int4 NOT NULL,
	product_id int8 NOT NULL,
	is_deleted int2 NOT NULL DEFAULT 0,
	CONSTRAINT tb_pg_product_un UNIQUE (pg_id, product_id),
	CONSTRAINT tb_pg_product_pg_fk FOREIGN KEY (pg_id) REFERENCES "global".tb_product_group(pg_id)
)
PARTITION BY LIST (pg_id);


--liquibase formatted sql
--changeset liquibase:added_default_partition_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added default_partition, default set to false.
CREATE TABLE IF NOT EXISTS global.tb_pg_product_default PARTITION OF global.tb_pg_product DEFAULT;