--liquibase formatted sql
--changeset tarunreddy.challa:oms_update_rcl_create_constraints_partial runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_update_rcl_create_constraints_partial
--comment: intial changeset for oms_update_rcl_create_constraints_partial
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_update_rcl_create_constraints_partial(_persisted_temp_tbl_name text, _select jsonb, _value text, _search_meta jsonb, _created_by integer);
CREATE OR REPLACE FUNCTION inventory_smart.oms_update_rcl_create_constraints_partial(_persisted_temp_tbl_name text, _select jsonb, _value text, _search_meta jsonb, _created_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _set jsonb;
    _temp_sql varchar;
    _where text := '';
    _key text;
    _value text;
    _con varchar[];
    _final varchar[];
    _dt_sql text;
    _dt text;
    _recordset varchar[];
    _value_record jsonb;
    _ex_cols_sql text;
    _ex_cols text[];
    _valueset text[];
    _temp_table text := gen_random_uuid();
    _temp_table_2 text := gen_random_uuid();
    _query_meta_filters text;
    /*sample call: select * from inventory_smart.update_oms_rcl_create_constraints('_temp_tbl_name', '[{"rule_code":507981}, {"rule_code":507980}]'::jsonb, '[{"start_date":"2024-09-01", "end_date":"2024-10-31","level_of_application":"applicable_all"}]', '{}', 99);
    first need to create temp table by calling global.rcl_create_constraints_exceptions function*/
BEGIN
    _query_meta_filters := inventory_smart.form_rcl_table_query(_search_meta);
    IF jsonb_array_length($2) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements($2) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP
                _con := array_append(_con,  _key || ' = ' || _value);
                RAISE NOTICE '_con: %', _con;
            END LOOP;
            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') ||')');
            _con := '{}';
        END LOOP;
       
        IF cardinality(_final) > 0 THEN
            _where := ' WHERE ' || array_to_string(_final, ' OR ');
        END IF;
        RAISE NOTICE 'where: %', _where;
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rule_code FROM public.'  || $1 || _where || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
           
    ELSE
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rule_code FROM public.'  || $1 || _query_meta_filters || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;

    _temp_sql := 'UPDATE public.'  || $1 || ' ' || $3 || ' , created_by = ' || $5 || ', created_at = now() where (rule_code) IN (SELECT rule_code FROM "' ||_temp_table || '");';
    EXECUTE _temp_sql;
END;
$function$
;
