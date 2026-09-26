--liquibase formatted sql
--changeset liquibase:tb_sg_store_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_sg_store with if not exists
CREATE TABLE pricesmart.tb_sg_store (
	sg_id int4 NOT NULL,
	store_id int4 NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	CONSTRAINT tb_sg_store_pk PRIMARY KEY (sg_id, store_id),
	CONSTRAINT tb_sg_store_sg_fk FOREIGN KEY (sg_id) REFERENCES pricesmart.tb_store_group(sg_id)
)
PARTITION BY LIST (sg_id);


--changeset utkarsh.tiwari@impactanalytics.co:added_tb_sg_store_default_partition stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added tb_sg_store_default partition
CREATE TABLE IF NOT EXISTS pricesmart.tb_sg_store_default PARTITION OF pricesmart.tb_sg_store DEFAULT;
