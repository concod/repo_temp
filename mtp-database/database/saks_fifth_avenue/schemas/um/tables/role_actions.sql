--liquibase formatted sql
--changeset liquibase:role_actions_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for role_actions - added serial 4
CREATE TABLE um.role_actions (
	id serial4 NOT NULL,
	role_id int4 NOT NULL,
	action_id int4 NOT NULL,
	CONSTRAINT roles_actions_pk PRIMARY KEY (id),
	CONSTRAINT role_actions_fk FOREIGN KEY (role_id) REFERENCES um.role_master(role_id) ON DELETE CASCADE,
	CONSTRAINT role_actions_fk_1 FOREIGN KEY (action_id) REFERENCES um.action_master(action_id) ON DELETE CASCADE
);