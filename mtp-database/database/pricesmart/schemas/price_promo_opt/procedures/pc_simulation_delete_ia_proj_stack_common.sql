--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_delete_ia_proj_stack_common runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_delete_ia_proj_stack_common

DROP PROCEDURE if exists price_promo_opt.pc_simulation_delete_ia_proj_stack_common;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ia_proj_stack_common(IN var_promo_id integer, IN var_disocunt_filter character varying, IN edit_mode integer DEFAULT 0, IN var_specific_start_date date DEFAULT NULL::date, IN var_specific_end_date date DEFAULT NULL::date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query_1 varchar;
    table_name varchar;
    discount_table varchar;
BEGIN
    -- Construct dynamic table names safely.
    table_name := format('price_promo.ps_recommended_stack_ia_%s', var_promo_id::varchar);
    discount_table := var_disocunt_filter;

    IF edit_mode = 1 THEN
        IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN
            query_1 = format(
					    '
					    WITH to_delete AS (
					        SELECT product_id, s0_id, s1_id, date as recommendation_date
					        FROM %s
					        WHERE date BETWEEN %L AND %L
					    )
					    DELETE FROM %s
					    USING to_delete
					    WHERE (%s.product_id, %s.s0_id, %s.s1_id, %s.recommendation_date) 
					    = (to_delete.product_id, to_delete.s0_id, to_delete.s1_id, to_delete.recommendation_date);
					    ',
					    discount_table,  -- CTE source table
					    var_specific_start_date, 
					    var_specific_end_date,
					    table_name,  -- Target table for deletion
					    table_name, table_name, table_name, table_name  -- Column references
								);
        ELSE
            query_1 = format(
					    '
					    WITH to_delete AS (
					        SELECT product_id, s0_id, s1_id, date as recommendation_date
					        FROM %s
					        WHERE date > CURRENT_DATE
					    )
					    DELETE FROM %s
					    USING to_delete
					    WHERE (%s.product_id, %s.s0_id, %s.s1_id, %s.recommendation_date) 
					    = (to_delete.product_id, to_delete.s0_id, to_delete.s1_id, to_delete.recommendation_date);
					    ',
					    discount_table,  -- CTE source table
					    table_name,  -- Target table for deletion
					    table_name, table_name, table_name, table_name  -- Column references
					);

        END IF;
    ELSE
        IF var_specific_start_date IS NOT NULL AND var_specific_end_date IS NOT NULL THEN
            query_1 = format(
					    '
					    WITH to_delete AS (
					        SELECT product_id, s0_id, s1_id, date as recommendation_date
					        FROM %s
					        WHERE date BETWEEN %L AND %L
					    )
					    DELETE FROM %s
					    USING to_delete
					    WHERE %s.product_id = to_delete.product_id
					    AND %s.s0_id = to_delete.s0_id
					    AND %s.s1_id = to_delete.s1_id
					    AND %s.recommendation_date = to_delete.recommendation_date;
					    ',
					    discount_table,  -- CTE source table
					    var_specific_start_date, 
					    var_specific_end_date,
					    table_name,  -- Target table for deletion
					    table_name, table_name, table_name, table_name  -- Column references
					);
        ELSE
            query_1 = format(
					    '
					    WITH to_delete AS (
					        SELECT product_id, s0_id, s1_id, date as  recommendation_date
					        FROM %s
					    )
					    DELETE FROM %s
					    USING to_delete
					    WHERE %s.product_id = to_delete.product_id
					    AND %s.s0_id = to_delete.s0_id
					    AND %s.s1_id = to_delete.s1_id
					    AND %s.recommendation_date = to_delete.recommendation_date;
					    ',
					    discount_table,  -- Source table
					    table_name,  -- Target table
					    table_name, table_name, table_name, table_name  -- Column references
					);
        END IF;
    END IF;

    RAISE NOTICE 'Executing Query: %', query_1;
    EXECUTE query_1;

END;
$procedure$



;