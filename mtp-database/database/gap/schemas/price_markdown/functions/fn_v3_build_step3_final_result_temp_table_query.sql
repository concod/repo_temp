--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_build_step3_final_result_temp_table_query_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_build_step3_final_result_temp_table_query_6
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_build_step3_final_result_temp_table_query;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_build_step3_final_result_temp_table_query(pcd_metrics_where_clause text DEFAULT ''::text, approval_filter_where_clause text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
   
BEGIN
    if pcd_metrics_where_clause is null then 
		pcd_metrics_where_clause = '';
	end if;
	if approval_filter_where_clause is null then
		approval_filter_where_clause = '';
	end if;
	--record_filter_where_clause = '';
    return 	'	create temp table final_result on commit drop as 
                select 
					s.* 
				from (
                        select
                            rowId,
                            order_,
                            is_footer_row,
                            case
                                when is_row_locked = 0 then false
                                else true
                            end as is_row_locked,
                            product_level_id,
                            product_level_value,
                            store_level_id,
                            store_level_value,
                            cw_offer_percentage,
                            jsonb_object_agg(key,value) as pcd_metrics,
                            brand,
                            division,
                            department,
							style,
                            color,
                            size,
							product_name,
							age,
                            base_price
                        from table_data_cte
                        cross join
                        lateral jsonb_each(pcd_metrics) as pcd_metric(key,value)
                        group by 
							rowId,
						    order_,
						    is_footer_row,
						    is_row_locked,
						    product_level_id,
						    product_level_value,
						    store_level_id,
						    store_level_value,
						    cw_offer_percentage,
						    brand,
						    division,
						    department,
							style,
                            color,
                            size,
						    product_name,
						    age,
						    base_price
               	) s 
                    ' || approval_filter_where_clause || '
                    '|| pcd_metrics_where_clause ||'
         	;';
end;
$function$
;
