--liquibase formatted sql
--changeset linu.nazil:expired_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for expired_products_from_product_hierarchies_filter
create table global.expired_products(
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	created_at timestamp not null default now()
	);
CREATE INDEX expired_products_path_level_idx ON global.expired_products USING btree (path,level);

--changeset linu.nazil:phf_patch_backup stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for phf_patch_backup
create table global.product_hierarchies_filter_patch_backup as 
select * from global.product_hierarchies_filter;


--changeset linu.nazil:expired_products_migration_fix stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for expired_products_from_product_hierarchies_filter_migration
;DO $$
begin
  insert into global.expired_products
  select path, level from global.product_hierarchies_filter
  where active is false
  and path->>'product_code' is not null;
end;
$$;


DO $$
begin
  delete from global.product_hierarchies_filter 
  where path->>'product_code' is not null 
  and active is false;
end;
$$;
