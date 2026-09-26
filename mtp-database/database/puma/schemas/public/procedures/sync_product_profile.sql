--liquibase formatted sql
--changeset liquibase:sync_product_profile runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_profile
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_profile();
CREATE OR REPLACE PROCEDURE public.sync_product_profile()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	declare 
 		_hies varchar;
 		_ph_hie_level int;
 		_sql text;
 	begin
 		select 
 		  string_agg(generic_column_name, ', '), 
 		  max(hierarchy_level) into _hies, _ph_hie_level
 		from 
 		  (
 		    select 
 		      generic_column_name, 
 		      hierarchy_level 
 		    from 
 		      global.product_generic_schema_mapping 
 		    where 
 		      hierarchy_level <= (
 		        select 
 		          hierarchy_level 
 		        from 
 		          global.product_generic_schema_mapping 
 		        where 
 		          generic_column_name = 'article'
 		      ) 
 		    order by 
 		      2 asc
 		  ) x;
 		delete from 
 		  inventory_smart.product_profile_master 
 		where 
 		  special_classification = 'ia-recommended';
 		_sql := 'INSERT INTO inventory_smart.product_profile_master (
 		  pp_code, "name", description, special_classification, 
 		  ph_code
 		) 
 		select 
 		  pp_code, 
 		  "name", 
 		  description, 
 		  special_classification, 
 		  phf.hierarchy_code as ph_code 
 		from 
 		  public.product_profile x 
 		  --join global.product_attributes_filter paf using(' || _hies || ') 
 		  join (
 		    select 
 		      hierarchy_code, 
 		      ' || _hies || '
 		    from 
 		      global.product_hierarchies_filter_flattened
 		    where 
 		      "level" = ' || _ph_hie_level || ' 
 		      and active
 		  ) phf using(' || _hies || ') 
 		group by 
 		  1, 
 		  2, 
 		  3, 
 		  4, 
 		  5';
 		raise notice '%', _sql;
 		execute _sql;
 		INSERT INTO inventory_smart.product_profile_mapping (
 		  pp_code, mapping_code, l0_name, size_level_proportion, 
 		  overall_proportion, product_code, 
 		  store_code
 		) 
 		SELECT 
 		  pp_code, 
 		  pmps.mapping_code, 
 		  pmps.l0_name,
 		  size_level_proportion, 
 		  overall_proportion, 
 		  product_code, 
 		  store_code 
 		FROM 
 		  public.product_profile x 
 		  left join global.product_mapping_product_store pmps using(product_code, store_code)
 		 where exists (select 'p' from inventory_smart.product_profile_master a where a.pp_code = x.pp_code);
 	end
 $procedure$
;
