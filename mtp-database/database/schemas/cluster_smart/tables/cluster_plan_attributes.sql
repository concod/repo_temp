--liquibase formatted sql
--changeset liquibase:cluster_plan_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE cluster_smart.cluster_plan_attributes (
	cluster_plan_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT cluster_plan_attribute_name_lc_check CHECK (((attribute_name)::text = lower((attribute_name)::text))),
	CONSTRAINT plan_attributes_un UNIQUE (cluster_plan_code, attribute_name),
	CONSTRAINT cluster_plan_attributes_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE
);