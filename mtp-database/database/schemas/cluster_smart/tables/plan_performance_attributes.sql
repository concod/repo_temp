--liquibase formatted sql
--changeset liquibase:plan_performance_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE cluster_smart.plan_performance_attributes (
	cluster_plan_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	score float4 NOT NULL,
	"rank" int2 NOT NULL,
	is_final bool NOT NULL DEFAULT false,
	levels jsonb NULL,
	CONSTRAINT plan_performance_attributes_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE
);