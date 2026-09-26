--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_get_invalid_and_inactive_sku_store_mapping_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_get_invalid_and_inactive_sku_store_mapping_3

DROP FUNCTION if exists price_markdown.fn_get_invalid_and_inactive_sku_store_mapping;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_invalid_and_inactive_sku_store_mapping(p_product_store_mapping text[], p_delimiter character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    final_response jsonb;

begin
    with user_sku_stores as (
        select
            s.*
        from (
            select
                split_part(sku_store_mapping,p_delimiter,1) as l5_id,
                split_part(sku_store_mapping,p_delimiter,2) as store_id
            from
                unnest(p_product_store_mapping) sku_store_mapping
        ) s
    ),
    sku_store_data as (
        select
            pm.product_id || '_' || ss.store_id as sku_map_id,
            pm.is_active as product_is_active,
			pm.product_id,
			pm.product_name,
			ss.l5_id,
			pm.l5_name,
			pm.l6_id,
			pm.l6_name,
			pm.l7_id,
			pm.l7_name,
            case
                when pm.product_id is null
                or sm.store_id is null then 'invalid'
                when pm.is_active = 0
                or sm.is_active = 0 then 'inactive'
                when pm.clearance_indicator = 1 then 'Already in Clearance'
                else 'valid'
            end as validity,
            coalesce (sm.store_id :: text, ss.store_id) as store_id,
            sm.is_active as store_is_active
        from
            user_sku_stores as ss
            left join price_markdown.product_master pm on pm.l5_id :: text = ss.l5_id
            left join price_markdown.tb_store_master sm on sm.store_id :: text = ss.store_id
    ),
    response_cte as (
        select
        validity,
        array_agg(
                json_build_object(
                    'sku_map_id',sku_map_id,
                    'status',validity,
					'product_name',product_name,
                    'store_id',store_id,
					'product_id',product_id,
					'l5_id',l5_id,
                    'l5_name',l5_name,
                    'l6_name',l6_name,
                    'l7_name',l7_name,
                    'product_is_active',product_is_active,
                    'store_is_active',store_is_active
                )
        ) as response_data
        from sku_store_data
        where validity != 'valid'
        group by validity
    )
    select jsonb_build_object(
        'inactive', coalesce((select response_data from response_cte where validity = 'inactive'),array[]::json[]),
        'invalid', coalesce((select response_data from response_cte where validity = 'invalid'),array[]::json[]),
        'already_in_clearance', coalesce((select response_data from response_cte where validity = 'Already in Clearance'),array[]::json[])

    ) into final_response;

    return final_response;

END;
$function$
;
