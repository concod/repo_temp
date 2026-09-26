--liquibase formatted sql
--changeset liquibase:user_attributes_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_attributes - added serial 4
CREATE TABLE um.user_attributes (
	id serial4 NOT NULL,
	attribute_name varchar(512) NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	user_id int4 NOT NULL,
	attribute_value _varchar NULL,
	CONSTRAINT user_attributes_pkey PRIMARY KEY (id),
	CONSTRAINT user_attributes_user_id_e6d8e49d_fk_users_id FOREIGN KEY (user_id) REFERENCES um.users(id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX user_attributes_user_id_e6d8e49d ON um.user_attributes USING btree (user_id);