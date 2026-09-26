--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:tb_sg_hierarchy_agg_data_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:tb_sg_hierarchy_agg_data_1


CREATE TABLE pricesmart.tb_sg_hierarchy_agg_data (  -- onboarding changes to be done here
	sg_id int4 NULL,
	s0_ids _int4 NULL,
	s1_ids _int4 NULL,
	s2_ids _int4 NULL,
	s3_ids _int4 NULL,
	s4_ids _int4 NULL,
	s5_ids _int4 NULL,
	CONSTRAINT fk_sg_id FOREIGN KEY (sg_id) REFERENCES pricesmart.tb_store_group(sg_id)
);


--changeset anoop.madamsetty@impactanalytics.co:tb_sg_hierarchy_agg_data_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Add s6_ids column to tb_sg_hierarchy_agg_data

ALTER TABLE pricesmart.tb_sg_hierarchy_agg_data ADD COLUMN s6_ids _int4 NULL;
