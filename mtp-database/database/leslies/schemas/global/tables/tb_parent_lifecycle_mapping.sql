--liquibase formatted sql
--changeset liquibase:tb_parent_lifecycle_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_parent_lifecycle_mapping
CREATE TABLE "global".tb_parent_lifecycle_mapping (
	l5_id text NULL,
	product_id int4 NULL,
	lifecycle_indicator_id int4 NULL,
	lifecycle_indicator text NULL
);

-- changeset vamsi.balaga@impactanalytics.co:tb_parent_lifecycle_mapping_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_parent_lifecycle_mapping
ALTER TABLE "global".tb_parent_lifecycle_mapping
    ADD CONSTRAINT tb_parent_lifecycle_mapping_pk PRIMARY KEY (l5_id, product_id, lifecycle_indicator_id);
