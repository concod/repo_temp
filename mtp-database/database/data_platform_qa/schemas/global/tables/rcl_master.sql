--liquibase formatted sql
--changeset ashish_gupta:rcl_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_master
create or replace function global.form_array(i in varchar[])
  returns varchar
  immutable
  language plpgsql
as $body$
declare
	o varchar;
begin
  select string_agg(item, '|') into o from (select item from (select unnest(i) as item) x group by item order by item)y;
 return o;
end;
$body$;

CREATE TABLE "global".rcl_master (
	rcl_code serial4 NOT NULL,
	"module_code" int4 NOT NULL,
	"level" _varchar NOT NULL DEFAULT ARRAY[]::character varying[],
	hierarchy_selections jsonb NOT NULL DEFAULT '{}'::jsonb,
	validity datemultirange NOT NULL,
	priority int2 NOT NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NULL,
	CONSTRAINT rcl_level_check CHECK ((cardinality(level) > 0)),
	CONSTRAINT rcl_pk PRIMARY KEY (rcl_code),
	CONSTRAINT rcl_uk EXCLUDE USING gist (module_code WITH =, global.form_array(level) WITH =, validity WITH &&) WHERE ((is_deleted = false))
);
CREATE UNIQUE INDEX rcl_module_priority_idx ON global.rcl_master USING btree (module_code, priority) WHERE (is_deleted = false);
ALTER TABLE "global".rcl_master ADD CONSTRAINT rcl_fk FOREIGN KEY (module_code) REFERENCES global.module_master(module_code) ON DELETE RESTRICT;

ALTER TABLE "global".rcl_master ADD CONSTRAINT rcl_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_master ADD CONSTRAINT rcl_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;

--changeset linu.nazil:rcl_master_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modified changeset for rcl_master
alter table "global".rcl_master alter column rcl_code drop default;
drop sequence if exists global.rcl_master_rcl_code_seq;
alter table "global".rcl_master alter column rcl_code type int4;

-- ALTER TABLE "global".rcl_master ADD CONSTRAINT rcl_code_fk FOREIGN KEY (rcl_code) REFERENCES global.rcl_priority_mapping(rcl_code) ON DELETE RESTRICT;

--changeset linu.nazil:rcl_master_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modified changeset for rcl_master
alter table global.rcl_master alter column priority type int4;

--changeset linu.nazil:rcl_master_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modified changeset for rcl_master
create sequence if not exists global.rcl_master_rcl_code_seq;
alter table "global".rcl_master alter column rcl_code SET DEFAULT nextval('global.rcl_master_rcl_code_seq');

--changeset akshay.jain:rcl_master_v5 stripComments:false splitStatements:false context:Release_1_1 labels:add_lowest_level
--comment: modified changeset for add_lowest_level
ALTER TABLE global.rcl_master ADD COLUMN rcl_lowest_level _varchar DEFAULT ARRAY[]::character varying[] NULL;

--changeset linu.nazil:rcl_master_v6 stripComments:false splitStatements:false context:Release_1_1 labels:adding_is_default
--comment: modified changeset for adding is_default
ALTER TABLE global.rcl_master ADD COLUMN is_default bool DEFAULT false null;