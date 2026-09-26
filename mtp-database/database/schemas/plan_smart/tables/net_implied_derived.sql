--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:net_implied_derived stripComments:false splitStatements:false context:Release_1_0 labels:mtp-30856
--comment: initial changeset for net_implied_derived
CREATE TABLE plan_smart.net_implied_derived (
	channel text NOT NULL,
	hierarchy_code int4 NOT NULL,
	dept_no text NULL,
	dept_name text NULL,
	chester_net_implied_percent float4 NULL,
	CONSTRAINT pk_net_implied_derived PRIMARY KEY (channel, hierarchy_code)
);