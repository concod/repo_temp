--liquibase formatted sql
--changeset sadhana.j:client_specific runOnChange:true stripComments:false splitStatements:false context:client_specific labels:sync_product_hierarchy_group
--comment: move to client_specific
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_hierarchy_group();
CREATE OR REPLACE PROCEDURE public.sync_product_hierarchy_group()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
_query text;
begin
	insert into assort_smart.product_hierarchy_group
	(hierarchy_code	,
	  path,
	  level,
	  active )
	select
	 a.hierarchy_code::text,
	  a.path,
	  a.level,
	  a.active
	from
	  global.product_hierarchies_filter a
	  where
	  not exists (select 1 from  assort_smart.product_hierarchy_group b
		where
	  a.hierarchy_code::text = b.hierarchy_code
	  and is_custom_hierarchy =false)
	  on conflict("path", "level") do nothing;

end $procedure$
;
