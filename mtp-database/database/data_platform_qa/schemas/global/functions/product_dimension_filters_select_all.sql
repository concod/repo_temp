--liquibase formatted sql
--changeset gautam.baruah@impactanalytics.co:close_cursor runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added a line to close the used cursor
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_dimension_filters_select_all(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_dimension_filters_select_all(input refcursor, columns_json jsonb, filter_json jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query text := '';
    _projection_queries text[];
    _col text;
BEGIN
    -- Extract the list of columns from the JSON
    _col := columns_json->>'cols';
    raise notice ' json article columns - %', _col;
    
    FOREACH _col IN ARRAY string_to_array(_col, ',') LOOP
        _projection_queries := array_append(
            _projection_queries, 
            'array_agg(distinct ' || _col || ') as ' || _col || '');
    END LOOP;

    raise notice ' _projection_queries - %', _projection_queries;
    
    _query := 'SELECT ' || STRING_AGG('DISTINCT ' || _col, ', ') || '
           FROM (' || ("global".form_attribute_table_filters_v2('product_attributes',
        'product_code', filter_json)) || ' ) X';
  
   	OPEN $1 FOR EXECUTE _query;
    CLOSE $1;
    RETURN _query;
END
$function$
;
