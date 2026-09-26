
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_wedge_opt_constraint stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_wedge_opt_constraint  

CREATE TABLE IF not exists assort_smart.plan_wedge_opt_constraint (
	plan_wedge_opt_cons_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	special_classification varchar NOT NULL,
	attribute_value jsonb DEFAULT '{"min_size": 1, "increment": 1, "max_value": 500, "min_value": 1}'::jsonb NULL,
	CONSTRAINT plan_wedge_optimization_master_pk PRIMARY KEY (plan_wedge_opt_cons_id)
);