--liquibase formatted sql
--changeset liquibase:lock_info stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for lock_info
CREATE TABLE plan_smart.lock_info (
	id int8 NOT NULL,
	season_type varchar NOT NULL,
	channel varchar NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	week int4 NULL,
	action_code int4 NOT NULL,
	"comments" text NULL,
	CONSTRAINT pk_lock_info PRIMARY KEY (id),
	CONSTRAINT uk_lock_info UNIQUE (season_type, channel, l0_name, l1_name, l2_name, week)
);


-- plan_smart.lock_info foreign keys

ALTER TABLE plan_smart.lock_info ADD CONSTRAINT fk_lock_action_code FOREIGN KEY (action_code) REFERENCES "global".action_master(action_code);


--changeset subhash.pophale@impactanalytics.co:lock_info_new stripComments:false splitStatements:false context:Release_1_0 labels:mtp-50282
--comment: modified unique key
ALTER TABLE plan_smart.lock_info ADD COLUMN if not exists l3_name varchar NULL ;
ALTER TABLE plan_smart.lock_info DROP CONSTRAINT uk_lock_info;
ALTER TABLE plan_smart.lock_info ADD CONSTRAINT uk_lock_info UNIQUE (season_type, channel, l0_name, l1_name, l2_name, l3_name, week);