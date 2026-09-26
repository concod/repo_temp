--liquibase formatted sql
--changeset liquibase:user_actions_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_actions - added serial 4
CREATE TABLE um.user_actions (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	action_id int4 NOT NULL,
	CONSTRAINT user_action_pk PRIMARY KEY (id),
	CONSTRAINT user_actions_fk FOREIGN KEY (action_id) REFERENCES um.action_master(action_id) ON DELETE CASCADE,
	CONSTRAINT user_actions_fk_1 FOREIGN KEY (user_id) REFERENCES um.users(id) ON DELETE CASCADE
);
