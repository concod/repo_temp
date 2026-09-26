--liquibase formatted sql
--changeset liquibase:tb_sg_store_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_sg_store with if not exists
CREATE TABLE "global".tb_sg_store (
	sg_id int4 NOT NULL,
	store_id int4 NOT NULL,
	is_deleted int2 NOT NULL DEFAULT 0,
	CONSTRAINT tb_sg_store_un UNIQUE (sg_id, store_id),
	CONSTRAINT tb_sg_store_sg_fk FOREIGN KEY (sg_id) REFERENCES "global".tb_store_group(sg_id)
)
PARTITION BY LIST (sg_id);


--liquibase formatted sql
--changeset liquibase:added_default_partition_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added default_partition, default set to false.
CREATE TABLE IF NOT EXISTS global.tb_sg_store_default PARTITION OF global.tb_sg_store DEFAULT;