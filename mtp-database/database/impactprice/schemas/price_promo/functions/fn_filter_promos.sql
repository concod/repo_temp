--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_filter_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_filter_promos

DROP FUNCTION IF EXISTS price_promo.fn_filter_promos;
CREATE OR REPLACE FUNCTION price_promo.fn_filter_promos(
    p_start_date date,
    p_end_date date,
    p_product_hierarchies jsonb,
    p_store_hierarchies jsonb,
    p_user_id integer,
    p_event_ids integer[] DEFAULT NULL::integer[],
    show_partially_overlapping_events boolean DEFAULT false,
    priority_numbers integer[] DEFAULT NULL::integer[],
    is_vendor_portal_request boolean DEFAULT false,
    p_customer_hierarchies jsonb DEFAULT '{}'::jsonb
)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare
    _query text;

    _product_hierarchies_where_clause text[];

    _store_hierarchies_where_clause text[];

    _customer_hierarchies_where_clause text[];

    date_range_where_clause text;

    key text;

    value jsonb;

    _filtered_promos int[];

    _product_hierarchies_config jsonb;
    
    _store_hierarchies_config jsonb;

    _customer_hierarchies_config jsonb;

begin

    select config_value::jsonb into _product_hierarchies_config 
    from price_promo.tb_tool_configurations
    where module = 'product' and config_name = 'hierarchy_filters';

    select config_value::jsonb into _store_hierarchies_config
    from price_promo.tb_tool_configurations
    where module = 'store' and config_name = 'hierarchy_filters';

    select config_value::jsonb into _customer_hierarchies_config
    from price_promo.tb_tool_configurations
    where module = 'customer' and config_name = 'hierarchy_filters';

    -- building product hierarchies where clause
    for key,value in (
        select
            *
        from
            jsonb_each(p_product_hierarchies)
    ) loop
        if value is not null and value != '[]' then 
            _product_hierarchies_where_clause = array_append(
                _product_hierarchies_where_clause,
                format(
                    'phc.%1$s = any(array%2$s)',
                    (_product_hierarchies_config->key)->>'id_column',
                    value
                )
            );
        end if;
    end loop;

    -- building store hierarchies where clause
    for key,value in (
        select
            *
        from
            jsonb_each(p_store_hierarchies)
    ) loop
        if value is not null and value != '[]' then 
            _store_hierarchies_where_clause = array_append(
                _store_hierarchies_where_clause,
                format(
                    ' COUNT(CASE WHEN hierarchy_level_id = %1$s AND hierarchy_value_id = any(array%2$s) THEN 1 END) > 0 ',
                    (_store_hierarchies_config->key)->>'id',
                    value
                )
            );
        end if;
    end loop;

    -- building customer hierarchies where clause
    for key,value in (
        select
            *
        from
            jsonb_each(p_customer_hierarchies)
    ) loop
        if value is not null and value != '[]' then 
            _customer_hierarchies_where_clause = array_append(
                _customer_hierarchies_where_clause,
                format(
                    '%1$s = any(array%2$s)',
                    (_customer_hierarchies_config->key)->>'id_column',
                    value
                )
            );
        end if;
    end loop;

    date_range_where_clause := format(
        CASE 
            WHEN show_partially_overlapping_events = true THEN 
                'start_date <= TO_DATE(%L, ''YYYY-MM-DD'') 
                AND end_date >= TO_DATE(%L, ''YYYY-MM-DD'')'
            ELSE 
                'end_date <= TO_DATE(%L, ''YYYY-MM-DD'') 
                AND start_date >= TO_DATE(%L, ''YYYY-MM-DD'')'
        END,
        p_end_date, p_start_date
    );

    _query = format(
        'WITH promo_master_filtered_cte AS (
            SELECT
                pm.promo_id,
                pm.products_count,
                pm.store_selection_type,
                pm.status,
                pm.step_count,
                pm.stores_count,
                pm.created_by,
				pm.customers_count
            FROM
                price_promo.promo_master pm
            WHERE
                is_deleted = 0
                AND %1$s
				AND (%5$L IS NULL OR %5$L = ''{}'' or event_id =  ANY(%5$L))
                %6$s
				AND pm.is_vendor_created_promo = %7$L
        ),
        filtered_promos_cte as (
            SELECT DISTINCT promo_id
            FROM price_promo.promo_product_hierarchy
            WHERE hierarchy_id IN (
                SELECT distinct hierarchy_id FROM price_promo.fn_get_user_restricted_products(%8$L)
                %2$s
            )
            AND promo_id IN (select promo_id from promo_master_filtered_cte)
            UNION
            select promo_id from promo_master_filtered_cte where products_count = 0 and created_by = %8$L
        ),
        eligible_store_promos_cte AS (
            SELECT promo_id
            FROM promo_master_filtered_cte
            WHERE store_selection_type = 1
            UNION ALL
            SELECT pmfc.promo_id
            FROM promo_master_filtered_cte pmfc
            JOIN price_promo.promo_store_hierarchy psh ON pmfc.promo_id = psh.promo_id
            JOIN price_promo.promo_store ps ON psh.promo_id = ps.promo_id
            JOIN price_promo.fn_get_user_restricted_stores(%8$L) us ON ps.store_id = us.store_id
            GROUP BY pmfc.promo_id
            %3$s
            UNION ALL
            SELECT pmfc.promo_id
            FROM promo_master_filtered_cte pmfc
            JOIN price_promo.promo_store_sg_hierarchy pssgh ON pmfc.promo_id = pssgh.promo_id
            GROUP BY pmfc.promo_id
            %3$s
            union
		        select promo_id from promo_master_filtered_cte where stores_count = 0 and created_by = %8$L
        ),
        filtered_customers_cte as (
            SELECT
                cm.customer_id
            FROM pricesmart.customer_master cm
            %4$s
        ),
        eligible_customer_promos_cte as (
            SELECT distinct
                tpc.promo_id
            FROM price_promo.tb_promo_customers tpc
            inner join filtered_customers_cte fcc on tpc.customer_id = fcc.customer_id
            Where
                promo_id IN (select promo_id from promo_master_filtered_cte)
            UNION
                select promo_id from promo_master_filtered_cte where customers_count = 0 
        ),
        intersected_eligible_promos_cte AS (
            SELECT promo_id FROM filtered_promos_cte
            INTERSECT
            SELECT promo_id FROM eligible_store_promos_cte
            INTERSECT 
            SELECT promo_id FROM eligible_customer_promos_cte
        ),
        final_eligible_promos as (
            SELECT  promo_id FROM promo_master_filtered_cte WHERE status = -1
            UNION
            SELECT pmfc.promo_id AS promo_id FROM promo_master_filtered_cte pmfc WHERE step_count = 0 and status in (0, 6) and created_by = %8$L
            UNION
            SELECT promo_id FROM intersected_eligible_promos_cte
        )
        select array_agg(promo_id) from final_eligible_promos
        ',
        date_range_where_clause,

        CASE
            WHEN p_product_hierarchies IS NOT NULL AND array_length(_product_hierarchies_where_clause, 1) > 0 THEN
                format(
                    'where %1$s',
                    array_to_string(_product_hierarchies_where_clause, ' AND ')
                )
            ELSE
                ''
        END,

        CASE
            WHEN p_store_hierarchies IS NOT NULL AND array_length(_store_hierarchies_where_clause, 1) > 0 THEN
                format(
                    'having %1$s',
                    array_to_string(_store_hierarchies_where_clause, ' AND ')
                )
            ELSE
                ''
        END,
        CASE
            WHEN p_customer_hierarchies IS NOT NULL AND array_length(_customer_hierarchies_where_clause, 1) > 0 THEN
                format(
                    'where %1$s',
                    array_to_string(_customer_hierarchies_where_clause, ' AND ')
                )
            ELSE
                ''
        END,
		p_event_ids,
        case
			when priority_numbers is not null and array_length(priority_numbers, 1) > 0 then
				format(' and pm.promo_id in (select promo_id from price_promo.ps_rules where priority_number in (%1$s)) ', array_to_string(priority_numbers, ','))
			else
				' '  
		end,
		is_vendor_portal_request,
		p_user_id
    );

    raise notice 'query: %', _query;

    execute _query into _filtered_promos;

    return coalesce(_filtered_promos, array[-1]::integer[]);
end;

$function$
;
