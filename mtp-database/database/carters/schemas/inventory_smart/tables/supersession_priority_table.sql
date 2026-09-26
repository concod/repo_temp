--liquibase formatted sql
--changeset shrinidhi.choragi@impactanalytics:inventory_smart.supersession_priority_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for inventory_smart.supersession_priority_table
CREATE TABLE inventory_smart.supersession_priority_table (
	dc_code text NULL,
	article text NULL,
	pack_type_id text NULL,
	final_tagging text NULL,
	qty int8 NULL,
	priority int8 NULL,
    CONSTRAINT unique_dc_article_pack UNIQUE (dc_code, article, pack_type_id)
);