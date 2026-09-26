--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:plan_master_audit stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22118
--comment: initial changeset for plan_master_audit
CREATE TABLE plan_smart.plan_master_audit (
	plan_code int8 NOT NULL,
	action_code text NOT NULL,
	user_code int8 NOT NULL,
	plan_actioned_ts timestamptz NOT NULL,
	"comment" text NULL
);
ALTER TABLE plan_smart.plan_master_audit ADD CONSTRAINT fk_plan_master_audit_plan_code FOREIGN KEY (plan_code) REFERENCES plan_smart.plan_master(plan_code);
CREATE INDEX idx_plan_master_audit_plan_code ON plan_smart.plan_master_audit USING btree (plan_code);