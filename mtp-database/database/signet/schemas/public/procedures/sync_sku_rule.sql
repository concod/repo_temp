--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:sync_sku_rule_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22611
--comment: Updating with some changes for sync_sku_rule new banner
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_sku_rule();

CREATE OR REPLACE PROCEDURE public.sync_sku_rule(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_sku_rule';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
		_hierarchy_level int;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if _is_historic then 
            delete from 
              inventory_smart.ph_configuration_mapping 
            where 
              true;
        end if;
        select 
          hierarchy_level into _hierarchy_level
        from 
          global.product_generic_schema_mapping 
        where 
          generic_column_name = 'article';
        -- Migrate old to new ph_code
        with old as (
  		  select 
		    ph_code, 
		    phf2.hierarchy_code as new_ph_code
		  from 
		    inventory_smart.ph_configuration_mapping pcm 
		    join (select * from "global".product_hierarchies_filter where active = false and "level" = _hierarchy_level) phf on pcm.ph_code = phf.hierarchy_code 
		    join (select * from "global".product_hierarchies_filter where active = true and "level" = _hierarchy_level) phf2 on phf.path->>'article' = phf2.path->>'article'
		  group by 1,2
		) 
		UPDATE inventory_smart.ph_configuration_mapping t1
		SET ph_code = t2.new_ph_code
		FROM old t2
		WHERE t1.ph_code = t2.ph_code;
        -- Remove non article and inactive article
		DELETE FROM 
		  inventory_smart.ph_configuration_mapping pcm USING "global".product_hierarchies_filter phf 
		WHERE 
		  pcm.ph_code = phf.hierarchy_code 
		  and phf.active = false;
		DELETE FROM 
		  inventory_smart.ph_configuration_mapping pcm USING "global".product_hierarchies_filter phf 
		WHERE 
		  pcm.ph_code = phf.hierarchy_code 
		  and phf.level != _hierarchy_level;
        -- New SG insert/update
		INSERT INTO inventory_smart.ph_configuration_mapping (
		  ph_code, channel, default_store_groups
		) 
		SELECT 
		  y.hierarchy_code as ph_code, 
		  x.channel, 
		  array_remove(array_agg(distinct sg.sg_code), null) as default_store_groups 
		FROM 
		  public.sku_rule x 
		  join global.store_groups sg on x.store_group_id = sg.name 
		  join (
		    select 
		      hierarchy_code, 
		      path->>'article' as article 
		    from global.product_hierarchies_filter phf
		      where phf.active = true
		      and level = _hierarchy_level
		  ) y on x.product_code = y.article 
		where sg.is_deleted = false
		group by 
		  1, 
		  2 on conflict(ph_code, channel) do 
		update 
		set 
		  default_store_groups = excluded.default_store_groups;
        -- New DC insert/update
		INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel, default_dcs) 
		select 
		  phf.hierarchy_code as ph_code, 
		  channel, 
		  array_agg(distinct pd.dc_code) as default_dcs 
		from 
		  global.product_mapping_product_dc pd 
		  join (
		    select 
		      sd.dc_code, 
		      channel 
		    from 
		      global.product_mapping_store_dc sd 
		      join global.distribution_centres dc on sd.dc_code = dc.dc_code 
		      join global.store_attributes_filter saf on sd.store_code = saf.store_code 
		    where 
		      sd.is_active 
		      and saf.active 
		      and not saf.is_deleted 
		      and saf.channel in ('ZALES', 'ZALES OUTLET', 'PEOPLES', 'BANTER','KAY','JARED','KAY OUTLET','JARED VAULT')  
		    group by 
		      1, 
		      2
		  ) sd on pd.dc_code = sd.dc_code 
		  join (
		    select 
		      product_code, 
		      attribute_value as article 
		    from 
		      global.product_attributes 
		    where 
		      attribute_name = 'article'
		  ) paf on pd.product_code = paf.product_code 
		  join (
		    select 
		      hierarchy_code, 
		      path->>'article' as article 
		    from global.product_hierarchies_filter phf
		      where phf.active = true
		      and level = _hierarchy_level
		  ) as phf using(article) 
		where 
		  pd.is_active 
		group by 
		  1, 
		  2 on conflict(ph_code, channel) do 
		update 
		set 
		  default_dcs = excluded.default_dcs;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$
;
