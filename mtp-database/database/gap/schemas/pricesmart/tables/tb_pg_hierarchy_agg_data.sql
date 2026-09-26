--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_pg_hierarchy_agg_data_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:tb_pg_hierarchy_agg_data_1


CREATE TABLE pricesmart.tb_pg_hierarchy_agg_data ( -- onboarding changes to be done here
	pg_id int4 NULL,
	l0_ids _int4 NULL,
	l1_ids _int4 NULL,
	l2_ids _int4 NULL,
	l3_ids _int4 NULL,
	l4_ids _int4 NULL,
	l5_ids _int4 NULL,
	realism_ids _int4 NULL,
	size_ids _int4 NULL,
	light_type_ids _int4 NULL,
	derived_status_ids _int4 NULL,
	CONSTRAINT fk_pg_id FOREIGN KEY (pg_id) REFERENCES pricesmart.tb_product_group(pg_id)
);



--changeset durgaprasad.tulugu@impactanalytics.co:tb_pg_hierarchy_agg_data_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: drop columns realism_ids, size_ids, light_type_ids, derived_status_ids and add columns l6_ids, l7_ids

ALTER TABLE pricesmart.tb_pg_hierarchy_agg_data DROP COLUMN IF EXISTS realism_ids;
ALTER TABLE pricesmart.tb_pg_hierarchy_agg_data DROP COLUMN IF EXISTS size_ids;
ALTER TABLE pricesmart.tb_pg_hierarchy_agg_data DROP COLUMN IF EXISTS light_type_ids;
ALTER TABLE pricesmart.tb_pg_hierarchy_agg_data DROP COLUMN IF EXISTS derived_status_ids;
ALTER TABLE pricesmart.tb_pg_hierarchy_agg_data ADD COLUMN IF NOT EXISTS l6_ids _int4 NULL;
ALTER TABLE pricesmart.tb_pg_hierarchy_agg_data ADD COLUMN IF NOT EXISTS l7_ids _int4 NULL;
