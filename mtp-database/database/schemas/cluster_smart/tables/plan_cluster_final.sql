--liquibase formatted sql
--changeset liquibase:plan_cluster_final stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_cluster_final
CREATE TABLE cluster_smart.plan_cluster_final (
	cluster_code_id serial4 NOT NULL,
	cluster_name varchar NOT NULL,
	cluster_plan_code int4 NOT NULL,
	attribute_value jsonb NULL,
	CONSTRAINT plan_cluster_final_pk PRIMARY KEY (cluster_code_id),
	CONSTRAINT plan_cluster_final_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE
);

--changeset ezhil.kannan@impactanalytics.co:cluster_smart.plan_cluster_final_cluster_plan_code_idx stripComments:false splitStatements:false context:aps_st_v3_perf_indexes labels:performance_index
--comment: Add cluster_plan_code index to speed cluster mapping lookup in APS-ST v3
CREATE INDEX IF NOT EXISTS idx_plan_cluster_final_cluster_plan_code ON cluster_smart.plan_cluster_final (cluster_plan_code);
