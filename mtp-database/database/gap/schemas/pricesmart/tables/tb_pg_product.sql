--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_pg_product_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:tb_pg_product_1


CREATE TABLE pricesmart.tb_pg_product (
	pg_id int4 NOT NULL,
	product_id int8 NOT NULL,
	is_deleted int2 DEFAULT 0 NOT NULL,
	CONSTRAINT tb_pg_product_pk PRIMARY KEY (pg_id, product_id),
	CONSTRAINT tb_pg_product_pg_fk FOREIGN KEY (pg_id) REFERENCES pricesmart.tb_product_group(pg_id)
)
PARTITION BY LIST (pg_id);


--changeset durgaprasad.tulugu@impactanalytics.co:tb_pg_product_default_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_pg_product_default_1
CREATE TABLE IF NOT EXISTS pricesmart.tb_pg_product_default PARTITION OF pricesmart.tb_pg_product DEFAULT;
