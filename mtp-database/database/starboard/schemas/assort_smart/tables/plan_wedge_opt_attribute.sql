--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_wedge_opt_attribute_1 stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_wedge_opt_attribute


CREATE TABLE IF not exists assort_smart.plan_wedge_opt_attribute (
	plan_code int4 NULL,
	levels jsonb NOT NULL,
	attribute_value varchar(200) NOT NULL,
	attribute_name varchar(200) NULL
);
CREATE INDEX If Not Exists plan_wedge_opt_attribute_plan_code_idx ON assort_smart.plan_wedge_opt_attribute USING btree (plan_code);