--liquibase formatted sql
--changeset liquibase:user_screens_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_screens - added serial 4
CREATE TABLE um.user_screens (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	screen_id int4 NOT NULL,
	CONSTRAINT user_screen_pk PRIMARY KEY (id),
	CONSTRAINT user_screens_fk FOREIGN KEY (user_id) REFERENCES um.users(id) ON DELETE CASCADE,
	CONSTRAINT user_screens_fk_1 FOREIGN KEY (screen_id) REFERENCES um.screen_master(screen_id) ON DELETE CASCADE
);