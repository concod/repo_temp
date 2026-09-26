--liquibase formatted sql
--changeset chaitanyaprasad.reddy:product_groups_styles_list_by_pseudo_code_mtp-36176 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:product_groups_styles_list_by_pseudo_code_mtp-36176 
--comment: made changes to accomodate grouping defn at dynamic aggregated level
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_styles_list_by_pseudo_code(input refcursor, jsonb, jsonb, jsonb, text, integer[], boolean);
CREATE OR REPLACE FUNCTION global.product_groups_styles_list_by_pseudo_code(input refcursor, jsonb, jsonb, jsonb, text, integer[], boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    declare
    _query_pm text := '';
    _query_pa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    n varchar;
    a varchar;
    p text;
    attr jsonb := '{}';
    _query_pa_patch text := '';
    select_clause_arr text[];
    group_clause_arr text[];
    group_clause text;
    _final_query text;
   select_clause_str text;
   input_select_clause text;
begin
    _query_pa_patch := global.get_query_product_fetch_using_definition_rule($5, $6);
    SELECT * FROM global.aggregation_level_select_group_clause($3) INTO input_select_clause, group_clause;
   	$3 := $3 || $2; 
   _query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $2));
    _query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
    _query_table_filters := global.form_table_query($4);
    RAISE NOTICE '%',_query_pm;
    RAISE NOTICE '%',_query_pa_patch;
    RAISE NOTICE '%',_query_pa;
   	
    raise notice '%', input_select_clause;
	WITH select_clause_data AS (
    SELECT string_agg(
        CASE 
            WHEN t.input_select_clause ~ 'string_agg\(.*?\)' THEN regexp_replace(t.input_select_clause, ',(?=[^()]*\))', '__DELIMITER__', 'g')
            ELSE t.input_select_clause
        END
        , ',') AS select_clause
    FROM (
        SELECT input_select_clause as input_select_clause 
    ) AS t
), replaced_data AS (
    SELECT STRING_TO_ARRAY(select_clause, ',') AS select_clause_array
    FROM select_clause_data
), modified_select_clause_array AS (
    SELECT ARRAY(
        SELECT 
            CASE 
                WHEN element ~ 'string_agg\(.*?\)' THEN regexp_replace(element, 'distinct (\w+)::', 'distinct pm.\1::')
                ELSE 'pm.' || element
            END
        FROM UNNEST(select_clause_array) AS element
    ) AS modified_select_clause_array
    FROM replaced_data
), final_select_clause AS (
    SELECT ARRAY_TO_STRING(modified_select_clause_array, ',') AS final_select_clause_string
    FROM modified_select_clause_array
)
SELECT regexp_replace(final_select_clause_string, '__DELIMITER__', ',', 'g')
FROM final_select_clause into input_select_clause;

raise notice '%', input_select_clause;
   
   
    
    -- Parse the group clause string into an array
    group_clause_arr := string_to_array(group_clause, ',');
    
    -- Loop through the array and prepend 'pm.' to each column reference
    FOR i IN 1..array_length(group_clause_arr, 1) LOOP
        group_clause_arr[i] := 'pm.' || group_clause_arr[i];
    END LOOP;
    
    -- Join the modified array back into a comma-separated string
    group_clause := array_to_string(group_clause_arr, ',');
    
    _query_combine := '
		select
 							  *
 			from
        (SELECT
            ' || input_select_clause || ',
            array_agg(DISTINCT pm.product_code) AS product_codes
        FROM
            ('
             || _query_pa ||   
            ') AS pm
        JOIN
            (' || _query_pa_patch || ') AS patch
        ON
            pm.product_code = patch.product_code
        GROUP BY 
            ' || group_clause||
 ' ) X ' || _query_table_filters;
    
    RAISE NOTICE '%',_query_combine;
    
    IF $7 IS FALSE THEN 
        _final_query := _query_combine;
    ELSE
        _final_query := 'SELECT COUNT(*) FROM (' || _query_combine || ') AS temp';
    END IF;
    
    OPEN $1 FOR EXECUTE _final_query;
    RETURN $1;
END $function$;
