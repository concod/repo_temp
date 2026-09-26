--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_filter_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_filter_promos

DROP FUNCTION IF EXISTS price_promo.fn_filter_promos;
CREATE OR REPLACE FUNCTION price_promo.fn_filter_promos(p_start_date date, p_end_date date, p_product_hierarchies jsonb, p_store_hierarchies jsonb, p_event_ids integer[] DEFAULT NULL::integer[], show_partially_overlapping_events boolean DEFAULT false, priority_numbers integer[] DEFAULT NULL::integer[])
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare
    _query text;

    _product_hierarchies_where_clause text[];

    _store_hierarchies_where_clause text[];

    date_range_where_clause text;

    key text;

    value jsonb;

    _filtered_promos int[];

    _product_hierarchies_config jsonb;
    
    _store_hierarchies_config jsonb;

begin

    select config_value::jsonb into _product_hierarchies_config 
    from price_promo.tb_tool_configurations
    where module = 'product' and config_name = 'hierarchy_filters';

    select config_value::jsonb into _store_hierarchies_config
    from price_promo.tb_tool_configurations
    where module = 'store' and config_name = 'hierarchy_filters';

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
                    '%1$s = any(array%2$s)',
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
                pm.stores_count
            FROM
                price_promo.promo_master pm
			left join 
				price_promo.ps_rules pr on pr.promo_id = pm.promo_id
            WHERE
                is_deleted = 0
                AND %1$s
				AND (%4$L IS NULL OR event_id =  ANY(%4$L))
				%5$s
        ),
        filtered_promos_cte as (
            SELECT DISTINCT promo_id
            FROM price_promo.promo_product_hierarchy
            WHERE hierarchy_id IN (
                SELECT hierarchy_id
                FROM price_promo.tb_product_hierarchy_lifecycle_combination
                %2$s
            )
            AND promo_id IN (select promo_id from promo_master_filtered_cte)
            UNION
            select promo_id from promo_master_filtered_cte where products_count = 0 
        ),
        eligible_store_promos_cte AS (
            SELECT promo_id
            FROM promo_master_filtered_cte
            WHERE store_selection_type = 1
            UNION ALL
            SELECT pmfc.promo_id
            FROM promo_master_filtered_cte pmfc
            JOIN price_promo.promo_store_hierarchy psh ON pmfc.promo_id = psh.promo_id
            GROUP BY pmfc.promo_id
            %3$s
            UNION ALL
            SELECT pmfc.promo_id
            FROM promo_master_filtered_cte pmfc
            JOIN price_promo.promo_store_sg_hierarchy pssgh ON pmfc.promo_id = pssgh.promo_id
            GROUP BY pmfc.promo_id
            %3$s
            union
		        select promo_id from promo_master_filtered_cte where stores_count = 0
        ),
        intersected_eligible_promos_cte AS (
            SELECT promo_id FROM filtered_promos_cte
            INTERSECT
            SELECT promo_id FROM eligible_store_promos_cte
        ),
        final_eligible_promos as (
            SELECT  promo_id FROM promo_master_filtered_cte WHERE status = -1
            UNION
            SELECT pmfc.promo_id AS promo_id FROM promo_master_filtered_cte pmfc WHERE step_count = 0 and status in (0, 6)
            UNION
            SELECT promo_id FROM intersected_eligible_promos_cte
        )
        select array_agg(promo_id) from final_eligible_promos
        ',
        date_range_where_clause,
        format(
            '%1$s',
            CASE
                WHEN p_product_hierarchies IS NOT NULL AND array_length(_product_hierarchies_where_clause, 1) > 0 THEN
                    format(
                        'where %1$s',
                        array_to_string(_product_hierarchies_where_clause, ' AND ')
                    )
                ELSE
                    ''
            END
        ),
        format(
            '%1$s',
            CASE
                WHEN p_store_hierarchies IS NOT NULL AND array_length(_store_hierarchies_where_clause, 1) > 0 THEN
                    format(
                        'having %1$s',
                        array_to_string(_store_hierarchies_where_clause, ' AND ')
                    )
                ELSE
                    ''
            END
        ),
		p_event_ids,
		case
			when priority_numbers is not null and array_length(priority_numbers, 1) > 0 then
				format(' and pr.priority_number in (%1$s) ', array_to_string(priority_numbers, ','))
			else
				' '  
		end
    );

    raise notice 'query: %', _query;

    execute _query into _filtered_promos;

    return coalesce(_filtered_promos, array[-1]::integer[]);
end;

$function$
;
