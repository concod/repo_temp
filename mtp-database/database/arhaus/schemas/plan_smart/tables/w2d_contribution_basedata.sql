--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:w2d_contribution_basedata stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42455
--comment: initial changeset for plan_smart.w2d_contribution_basedata

CREATE TABLE plan_smart.w2d_contribution_basedata (
	channel text NULL,
	hierarchy_code int4 NULL,
	current_week int4 NULL,
	delivered_week int4 NULL,
	outstanding_age int4 NULL,
	delivered_rates float4 NULL,
	adjustment_factor int4 NULL,
	non_delivered_rates float4 NULL
);

--changeset jaya.khandelwal@impactanalytics.co:w2d_contribution_basedata_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42455
--comment:  drop constraint
ALTER TABLE plan_smart.w2d_contribution_basedata drop constraint if exists pk_w2d;
ALTER TABLE plan_smart.w2d_contribution_basedata ADD CONSTRAINT pk_w2d PRIMARY KEY (channel, hierarchy_code, current_week, delivered_week);

--changeset arshad.k@impactanalytics.co:w2d_contribution_basedata_chg2 stripComments:false splitStatements:false context:Release_1_0
--comment:  add 2 new columns
alter table plan_smart.w2d_contribution_basedata 
ADD COLUMN forecasted_delivered_rates float4 NULL,
ADD COLUMN forecasted_non_delivered_rates float4 NULL;