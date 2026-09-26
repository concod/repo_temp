--liquibase formatted sql
--changeset liquibase:lock_audit stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for lock_audit
CREATE TABLE plan_smart.lock_audit (
	id bigserial NOT NULL,
	lock_id int8 NOT NULL,
	action_code int4 NOT NULL,
	created_ts timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL,
	CONSTRAINT pk_lock_audit PRIMARY KEY (id)
);


-- plan_smart.lock_audit foreign keys

ALTER TABLE plan_smart.lock_audit ADD CONSTRAINT fk_lock_audit_action_code FOREIGN KEY (action_code) REFERENCES "global".action_master(action_code);
ALTER TABLE plan_smart.lock_audit ADD CONSTRAINT fk_lock_audit_created_by FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code);
ALTER TABLE plan_smart.lock_audit ADD CONSTRAINT fk_lock_audit_lock_id FOREIGN KEY (lock_id) REFERENCES "plan_smart".lock_info(id);