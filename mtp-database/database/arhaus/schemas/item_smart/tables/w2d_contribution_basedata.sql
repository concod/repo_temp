--liquibase formatted sql
--changeset shreyansh.pathak@impactanalytics.co:w2d_contribution_basedata stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for w2d_contribution_basedata
CREATE TABLE item_smart.w2d_contribution_basedata (
	channel text NULL,
	hierarchy_code int4 NULL,
	current_week int4 NULL,
	delivered_week int4 NULL,
	delivered_rates float4 NULL
);
ALTER TABLE item_smart.w2d_contribution_basedata drop constraint if exists pk_w2d;
ALTER TABLE item_smart.w2d_contribution_basedata ADD CONSTRAINT pk_w2d PRIMARY KEY (channel, hierarchy_code, current_week, delivered_week);