--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:assort_smart.line_plan_status stripComments:false splitStatements:false context:MTP-75019 labels:create_table
--comment: initial changeset for line_plan_status

CREATE TABLE assort_smart.line_plan_status (
	id serial4 NOT NULL,
	plan_code int4 NULL,
	status varchar NULL,
	created_by int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT line_plan_status_pkey1 PRIMARY KEY (id)
);

--changeset ezhil.kannan@impactanalytics.co:assort_smart.idx_line_plan_status stripComments:false splitStatements:false context:aps_st_v3_perf_indexes_1 labels:performance_index
--comment: Add plan_code index for DELETE/SELECT performance in aps-st-v3
CREATE INDEX IF NOT EXISTS idx_line_plan_status
ON assort_smart.line_plan_status(plan_code);