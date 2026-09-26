--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_cluster_depth_choice_wp stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_cluster_depth_choice_wp

CREATE TABLE IF not exists assort_smart.plan_cluster_depth_choice_wp (
	plan_cls_depth_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code text NOT NULL,
	season_code int4 NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	max_cc float8 DEFAULT 0.0 NULL,
	qty_ty float8 DEFAULT 0.0 NULL,
	depth_ly float8 DEFAULT 0.0 NULL,
	depth_ty float8 DEFAULT 0.0 NULL,
	choice_ly float8 DEFAULT 0.0 NULL,
	choice_ty float8 DEFAULT 0.0 NULL,
	store_cnt float8 DEFAULT 0.0 NULL,
	cc_threshold float8 DEFAULT 0.0 NULL,
	total_choice_count_ly float8 DEFAULT 0.0 NULL,
	total_choice_count_ty float8 DEFAULT 0.0 NULL,
	compare_type int2 NULL,
	total_depth_ly float8 NULL,
	total_depth_ty float8 NULL,
	CONSTRAINT plan_cluster_depth_choice_wp_pkey PRIMARY KEY (plan_cls_depth_id)
);
CREATE INDEX plan_cluster_depth_choice__wp_plan_code_idx ON assort_smart.plan_cluster_depth_choice_wp USING btree (plan_code);

--changeset abhilash.kirtikumar@impactanalytics.co:plan_cluster_depth_choice_wp stripComments:false splitStatements:false context:MTP-48672 labels:new_column_added_to_wp_briscoes
--comment: added column to plan_cluster_depth_choice_wp
ALTER TABLE IF exists assort_smart.plan_cluster_depth_choice_wp
ADD COLUMN IF NOT exists min_cc NUMERIC NULL;

--changeset mayank.bhardwaj@impactanalytics.co liquibase:drop_launch_id_column stripComments:false splitStatements:false context:MTP-87729 labels:liquibase_project_start
--comment: Drop column launch_id
ALTER TABLE IF EXISTS assort_smart.plan_cluster_depth_choice_wp
DROP COLUMN IF EXISTS launch_id;