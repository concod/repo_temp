--liquibase formatted sql
--changeset liquibase:sync_sku_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_sku_rule
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_sku_rule();
CREATE OR REPLACE PROCEDURE public.sync_sku_rule(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		if _is_historic then 
            delete from 
              inventory_smart.ph_configuration_mapping 
            where 
              true;
        end if;

        with old as (
		  select 
		    ph_code, 
		    phf2.hierarchy_code as new_ph_code, 
		    channel, 
		    default_product_profile, 
		    unnest(default_store_groups) as default_store_group, 
		    unnest(default_dcs) as default_dc, 
		    phf.path->>'article' as article, 
		    pcm.created_at, 
		    pcm.updated_at, 
		    pcm.updated_by, 
		    pcm.created_by
--		    , 
--		    case when pcm.created_at > pcm.updated_at then pcm.created_at else pcm.updated_at end as last_change_at 
		  from 
		    inventory_smart.ph_configuration_mapping pcm 
		    join "global".product_hierarchies_filter phf on pcm.ph_code = phf.hierarchy_code 
		    join "global".product_hierarchies_filter phf2 on phf.path->>'article' = phf2.path->>'article' 
		  where 
		    phf.active = false 
		    and phf2.active = true
		) insert into inventory_smart.ph_configuration_mapping (
		  ph_code, channel, default_product_profile, 
		  default_store_groups, default_dcs, 
		  created_at, updated_at, updated_by, 
		  created_by
		) 
		select 
		  new_ph_code, 
		  channel, 
		  max(old.default_product_profile), 
		  array_remove(
		    array_agg(
		      distinct old.default_store_group
		    ), 
		    null
		  ), 
		  array_remove(
		    array_agg(distinct old.default_dc), 
		    null
		  ), 
		  max(old.created_at) as created_at, 
		  max(old.updated_at) as updated_at, 
		  max(old.updated_by) as updated_by, 
		  max(old.created_by) as created_by 
		from 
		  old 
		group by 
		  1, 
		  2 on conflict(ph_code, channel) do nothing;

		 DELETE FROM 
		  inventory_smart.ph_configuration_mapping pcm USING "global".product_hierarchies_filter phf 
		WHERE 
		  pcm.ph_code = phf.hierarchy_code 
		  and phf.active = false;

		INSERT INTO inventory_smart.ph_configuration_mapping (
		  ph_code, channel, default_store_groups, 
		  default_dcs
		) 
		select 
		  ph_code, 
		  channel, 
		  array_agg(distinct sg_code), 
		  array_agg(distinct dc_code) 
		from 
		  inventory_smart.ph_master ph 
		  join (
			select 
			  sg.channel, 
			  sg.sg_code, 
			  sgm.store_code 
			from 
			  global.store_groups sg 
			  join global.store_groups_mapping sgm using(sg_code) 
			where 
			  lower(name) like '%default%'
		  ) sgm using(channel) 
		  join global.product_mapping_store_dc pmsd using(store_code) 
		group by 
		  1, 
		  2 on conflict do nothing;
	end
$procedure$
;
