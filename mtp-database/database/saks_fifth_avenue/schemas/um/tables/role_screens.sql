--liquibase formatted sql
--changeset liquibase:role_screens_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for role_screens - added serial 4
CREATE TABLE um.role_screens (
	id serial4 NOT NULL,
	role_id int4 NOT NULL,
	screen_id int4 NOT NULL,
	CONSTRAINT role_screens_pk PRIMARY KEY (id),
	CONSTRAINT role_screens_un UNIQUE (role_id, screen_id),
	CONSTRAINT role_screens_fk FOREIGN KEY (role_id) REFERENCES um.role_master(role_id) ON DELETE CASCADE,
	CONSTRAINT role_screens_fk_1 FOREIGN KEY (screen_id) REFERENCES um.screen_master(screen_id) ON DELETE CASCADE
);