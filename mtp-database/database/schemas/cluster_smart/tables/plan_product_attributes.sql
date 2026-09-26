--liquibase formatted sql
--changeset liquibase:plan_product_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE cluster_smart.plan_product_attributes (
	cluster_plan_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	is_primary bool NOT NULL,
	is_final bool NOT NULL DEFAULT false,
	levels jsonb NULL,
	CONSTRAINT plan_product_attributes_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE
);


--changeset liquibase:add_new_columns stripComments:false splitStatements:false context:MTP-52669 labels:liquibase_project_start
--comment: Add rank and score column
ALTER TABLE cluster_smart.plan_product_attributes ADD score float4 NOT NULL DEFAULT 0.0;
ALTER TABLE cluster_smart.plan_product_attributes ADD "rank" int2 NOT NULL DEFAULT 1;

--changeset liquibase:change_is_primary_column stripComments:false splitStatements:false context:MTP-52669-is-primary labels:liquibase_project_start
--comment: Change is-primary column to null
ALTER TABLE cluster_smart.plan_product_attributes ALTER COLUMN is_primary DROP NOT NULL;
ALTER TABLE cluster_smart.plan_product_attributes ALTER COLUMN is_primary SET DEFAULT false;