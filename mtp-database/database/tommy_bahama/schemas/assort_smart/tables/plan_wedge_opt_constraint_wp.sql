--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_wedge_opt_constraint_wp stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_wedge_opt_constraint_wp

CREATE TABLE if not exists assort_smart.plan_wedge_opt_constraint_wp (
	min_size int4 NULL,
	min_value int4 NULL,
	max_value int4 NULL,
	"increment" int4 NULL,
	moq int4 NULL,
	cluster_code text NULL,
	cluster_display_name text NULL,
	plan_code int4 NULL,
	special_classification text NULL,
	hierarchy_code text NULL,
	channel int4 NULL,
	sub_channel int4 NULL,
	season_code int4 NULL,
	compare_type int4 NULL
);


--changeset rishabh.kumar@impactanalytics.co:add_index_on_plan_cluster_table stripComments:false splitStatements:false context:add_required_index labels:alter_table
--comment: Add required index to plan_wedge_opt_constraint_wp table
CREATE INDEX idx_pwocwp_plan_hierarchy_cluster 
ON assort_smart.plan_wedge_opt_constraint_wp (plan_code, hierarchy_code, cluster_code);

--changeset ezhil.kannan@impactanalytics.co:add_index_plan_compare_type_pwoc_wp stripComments:false splitStatements:false context:perf_optimization labels:alter_table
--comment: Add composite index on (plan_code, compare_type) for fetch-optimization-data performance
CREATE INDEX IF NOT EXISTS idx_pwoc_wp_plan_compare_type ON assort_smart.plan_wedge_opt_constraint_wp (plan_code, compare_type);