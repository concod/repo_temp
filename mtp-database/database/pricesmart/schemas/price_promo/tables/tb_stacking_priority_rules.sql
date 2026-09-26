--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_stacking_priority_rules stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_stacking_priority_rules

CREATE TABLE price_promo.tb_stacking_priority_rules (
	priority_x int4 NULL,
	priority_y int4 NULL,
	is_stackable bool NULL
);