--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_pg_hierarchy_agg_data_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:tb_pg_hierarchy_agg_data_2


CREATE TABLE pricesmart.tb_pg_hierarchy_agg_data ( -- onboarding changes to be done here
	pg_id int4 NULL,
	l0_ids _int4 NULL,
	range_ids _int4 NULL,
	l1_ids _int4 NULL,
	l2_ids _int4 NULL,
	l4_ids _int4 NULL,
	group_number_ids _int4 NULL,
	product_lifecycle_ids _int4 NULL,
	CONSTRAINT fk_pg_id FOREIGN KEY (pg_id) REFERENCES pricesmart.tb_product_group(pg_id)
);