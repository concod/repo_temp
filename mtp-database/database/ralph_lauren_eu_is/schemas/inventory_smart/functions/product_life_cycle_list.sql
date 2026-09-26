--liquibase formatted sql
--changeset aniket.ashis@impactanalytics.co:product_life_cycle_list runOnChange:true stripComments:false splitStatements:false context:MTP-113643, labels:MTP-113643
--comment: MTP-113643
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_life_cycle_list(input refcursor, jsonb, jsonb, jsonb,jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_life_cycle_list(input refcursor, jsonb, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * 
 * 
   Product Life Cycle Screen SP
  -------------------
  Inputs :- 
  ------
  $1 - refcursor
  $2 - ph_master attributes (product and article_status_tag)
  $3 - store attribute filters - mainly for channel
  $4 - table meta data 
  $5 - no dates filter json
 */
	declare
	_query_ph text := '';
	_query_sa text := '';
	_query_combine text := '';
	_query_table_filters text := '';
	_dates_filter text;
	BEGIN
		_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
 		_query_sa := inventory_smart.form_main_table_filters('store_attributes', $3);
 		_query_table_filters := global.form_table_query($4);
 		_dates_filter := inventory_smart.generate_where_condition_product_life_cycle($5);

		IF _dates_filter <> ''  and left(_query_table_filters, 6) = ' WHERE' then
        		_query_table_filters := ' AND ' || right(_query_table_filters, length(_query_table_filters) - 6);
    	END IF;
 		_query_combine :=  '
				with product_data as (
									 	select * from inventory_smart.ph_master ph' || _query_ph || '
									 )
				,store_data as (
								select * from global.store_attributes_filter ' || _query_sa || '
								)	
				,final_result as (select  plc.article, 
										plc.store_code, 
										sd.retail_facility_code,
										sd.currency_cd,
										STRING_TO_ARRAY(TRIM(BOTH ''{}'' from plc.markdown_date::text), ''}, {'') as markdown_date,
										STRING_TO_ARRAY(TRIM(BOTH ''{}'' from plc.clearance_date::text), ''}, {'') as clearance_date,
										to_char(plc.launch_date AT TIME ZONE '''|| inventory_smart.get_tenant_timezone() ||''', ''DD-MM-YYYY'') as launch_date,
										plc.current_status,
										um.name,
										um.user_name,
										to_char(plc.updated_at AT TIME ZONE '''|| inventory_smart.get_tenant_timezone() ||''', ''DD-MM-YYYY HH24:MI:SS'') as updated_at,
										plc.updated_by,
										plc.next_markdown_start_date,
										plc.next_clearance_start_date,
										plc.next_markdown_end_date,
										plc.next_clearance_end_date,
										plc.upload_flag,
										plc.l0_name,
										pd.l1_name,
										pd.l2_name,
										pd.l3_name,
										pd.l4_name,
										pd.style_color_id,
										pd.product_description,
										pd.model_description, 
										pd.supersede_flag
				from inventory_smart.product_life_cycle plc
				join product_data pd using (article)
				join store_data sd on sd.store_code = plc.store_code and pd.channel = sd.channel 	
				left join global.user_master um on um.user_code = plc.updated_by 
				'|| _dates_filter ||'
				)   				
				select * from final_result ' ||  _query_table_filters ||'
		';
		raise notice 'Query: %', _query_combine;
		open $1 for execute _query_combine;
		RETURN $1;
	END
$function$
;
