--liquibase formatted sql
--changeset nibeel.yunus runOnChange:true stripComments:false splitStatements:false context:MTP-54788 labels:MTP-54788
--comment: MTP-54788
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_constraint_time_based_store_list_download(input refcursor, jsonb, jsonb,jsonb);
DROP FUNCTION IF EXISTS inventory_smart.estimate_constraint_time_based_store_list_download(input refcursor, jsonb, jsonb,jsonb,jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_constraint_time_based_store_list_download(input refcursor, jsonb, jsonb, jsonb,jsonb)
	RETURNS refcursor
 	LANGUAGE plpgsql
	AS $function$
 	declare
 		_query_pa text := '';
 		_query_sa text := '';
		_query_fw text := '';
		_query_table_filters text := '';
 		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
    	l0_name_updated text := '';
 		_query_combine text := '';
 		
 	begin
 		
 		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);
		_query_table_filters := global.form_table_query($5);
		raise notice '_query_table_filters %', _query_table_filters;

		IF ($4 -> 'min') IS NOT NULL THEN
            $4 := $4 - 'min' || jsonb_build_object('min_stock', $4 -> 'min');
        END IF;
        IF ($4 -> 'max') IS NOT NULL THEN
            $4 := $4 - 'max' || jsonb_build_object('max_stock', $4 -> 'max');
        END IF;

		_query_fw := global.form_main_table_filters_v2('constraint_master_weekly', $4);

		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;

 	
 	_query_combine := '
		with paf as materialized (
			select 
			    *
			from 
			inventory_smart.ph_master
			'||_query_pa||'
			),
			saf as materialized (
				select * FROM global.store_attributes_filter saf 
				'||_query_sa||'
			),
			partitioned_weekly_constraints as (
  				select * from inventory_smart.constraint_master_weekly 
				'||_query_fw||'
				AND l0_name = '||l0_name_updated||'
			),				
			product_master_filters_data as materialized (
			SELECT 
			  pmps.product_code, 
 			  pmps.mapping_code, 
 			  pmps.store_code,
              paf.article_status_tag,
              paf.l0_name, 
              paf.l1_name,
              paf.l2_name,
              paf.product_channel_name,
              paf.article,
              paf.store_pack_size,
              paf.product_description,
              paf.planning_ownership,
              paf.merchandise_category,
              paf.merchandise_brand,
              paf.metal_color,
              paf.metal_type,
              paf.sku_grade,
              paf.drop_ship_ind,
 			  saf.store_name, 
              saf.district,
              saf.dma_name,
              saf.shop_in_shop,
              saf.combo_store,
 			  saf.channel
			  FROM paf 
			  join (select * from global.product_mapping_product_store where l0_name = any('''|| concat(_l0_name) ||'''::varchar[])) pmps on paf.article = pmps.product_code and paf.l0_name = pmps.l0_name		
			  join saf using(store_code)
			),
			filtered_weekly_constraints as(
    			select 
        		c.product_code, 
        		c.mapping_code, 
        		c.store_code,
        		fiscal_year_week,
            	jsonb_build_object(
            		CONCAT(''Week_'', fiscal_year_week,''_wos''), c.wos::text,
            		CONCAT(''Week_'', fiscal_year_week,''_min''), c.min_stock::text,
            		CONCAT(''Week_'', fiscal_year_week,''_max''), c.max_stock::text,
            		CONCAT(''Week_'', fiscal_year_week,''_updated_by''), name, 
            		CONCAT(''Week_'', fiscal_year_week,''_updated_at''), to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'')
        		) as stores,
        		paf.article_status_tag,
        		paf.l0_name, 
        		paf.l1_name,
        		paf.l2_name,
        		paf.product_channel_name,
        		paf.article,
        		paf.store_pack_size,
        		paf.product_description,
        		paf.planning_ownership,
        		paf.merchandise_category,
        		paf.merchandise_brand,
        		paf.metal_color,
        		paf.metal_type,
        		paf.sku_grade,
        		paf.drop_ship_ind,
        		saf.store_name, 
        		saf.district,
        		saf.dma_name,
        		saf.shop_in_shop,
        		saf.combo_store,
        		saf.channel
      			from partitioned_weekly_constraints c
      			inner join paf on c.l0_name = paf.l0_name and paf.article = c.product_code
      			inner join saf using (store_code)
      			LEFT JOIN global.user_master um on c.updated_by = um.user_code
      			WHERE True and c.mapping_code is not null
			)
		select count(*) as total_count from filtered_weekly_constraints '|| _query_table_filters ||';		
	';
	raise notice '_query_combine %', _query_combine;
	OPEN $1 FOR EXECUTE _query_combine;
	return $1;
 		
	END
$function$
;
