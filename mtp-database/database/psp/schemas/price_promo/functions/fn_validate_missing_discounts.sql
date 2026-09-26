--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_validate_missing_discounts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_validate_missing_discounts

DROP FUNCTION if exists price_promo.fn_validate_missing_discounts;
CREATE OR REPLACE FUNCTION price_promo.fn_validate_missing_discounts(
    p_promo_id int,
    p_user_id int,
    p_include_temporary_saved_changes boolean default false,
    p_new_scenario_order_ids int[] default array[]::int[],
    p_row_ids_to_skip int[] default array[]::int[]
)
 RETURNS bool
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    DECLARE
        _scenario_order_id int;
        _where_clause_array text[];
        _where_clause text;
        _query text;
        _has_missing_discounts bool;
        _source_table text; 

    BEGIN

        if p_include_temporary_saved_changes = false then
            _source_table = 'price_promo.ps_scenario_discounts';
        else
            _source_table = format(
                'price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s',
                p_promo_id,
                p_user_id
            );
        end if;


        

        for _scenario_order_id in (
            select scenario_order_id from price_promo.scenario_master where promo_id = p_promo_id
            union
            select unnest(p_new_scenario_order_ids)
        )
        loop
            -- regular price offer type id is 19
            _where_clause_array = array_append(
                _where_clause_array,
                format(
                    ' 
                    (
                        coalesce(
                            scenario_data[%1$s]->>''offer_x_value'',
                            scenario_data[%1$s]->>''offer_y_value'',
                            scenario_data[%1$s]->>''offer_z_value'',
                            scenario_data[%1$s]->>''tier_id'',
                            scenario_data[%1$s]->>''special_offer_data''
                        ) is null
                        and (scenario_data[%1$s]->>''offer_type_id'')::int <> 19
                    )
                    ' ,
                    _scenario_order_id
                )
            );
        end loop;

        _where_clause = array_to_string(_where_clause_array, ' OR ');

        if coalesce(array_length(p_row_ids_to_skip, 1), 0) > 0 then
            _where_clause = format(
                '
                    (%1$s)
                    and (not id = any(%2$L))
                ',
                _where_clause,
                p_row_ids_to_skip
            );
        end if;
        
        raise notice 'where_clause: %', _where_clause;


        _query = format(
            '
                select 
                    case when exists(
                        select 1
                        from 
                        %3$s
                        where promo_id = %1$s
                        and (%2$s)
                        limit 1
                    ) then true else false 
                    end as _has_missing_discounts
            ',
            p_promo_id,
            _where_clause,
            _source_table
        );

        raise notice 'query: %', _query;

        execute _query into _has_missing_discounts;

        return _has_missing_discounts;

    END;
$function$
;
