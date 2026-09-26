--liquibase formatted sql
--changeset liquibase:user_roles_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_roles - added serial 4
CREATE TABLE um.user_roles (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	role_id int4 NOT NULL,
	CONSTRAINT user_roles_pk PRIMARY KEY (id),
	CONSTRAINT users_roles_user_id_group_id_fc7788e8_uniq UNIQUE (user_id, role_id),
	CONSTRAINT user_roles_fk FOREIGN KEY (role_id) REFERENCES um.role_master(role_id),
	CONSTRAINT users_roles_fk_user_id FOREIGN KEY (user_id) REFERENCES um.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX users_roles_role_id_2f3517aa ON um.user_roles USING btree (role_id);
CREATE INDEX users_roles_user_id_f500bee5 ON um.user_roles USING btree (user_id);