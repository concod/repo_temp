--liquibase formatted sql
--changeset liquibase:user_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_master
CREATE TABLE "global".user_master (
	user_code serial4 NOT NULL,
	"name" varchar(255) NOT NULL,
	email varchar(255) NULL,
	user_name varchar(255) NOT NULL,
	"password" varchar(1024) NULL,
	salt varchar(1024) NULL,
	status bool NOT NULL DEFAULT true,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT user_master_un UNIQUE (user_name),
	CONSTRAINT user_name_check CHECK ((length((name)::text) > 0)),
	CONSTRAINT user_pk PRIMARY KEY (user_code),
	CONSTRAINT user_u_name_check CHECK ((length((user_name)::text) > 0)),
	CONSTRAINT user_uk UNIQUE (email),
	CONSTRAINT user_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT user_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);

--changeset chaitanyaprasad.reddy:user_master_drop_constraint stripComments:false splitStatements:false context:Release_1_0 labels:user_master_drop_constraint_user_master_un
--comment: dropping user_master_un constraint on user_master table
ALTER TABLE "global".user_master DROP CONSTRAINT user_master_un;

--changeset chaitanyaprasad.reddy:user_master_add_name_check stripComments:false splitStatements:false context:Release_1_0 labels:user_master_add_name_check_constraint_user_master_unique_name_check
--comment: adding exclusion constraint for unique name column in user master table
ALTER TABLE "global".user_master  ADD CONSTRAINT user_master_unique_name_check EXCLUDE USING gist (lower((user_name)::text) WITH =) WHERE ((NOT is_deleted));
