--liquibase formatted sql
--changeset linu.nazil:update_rcl_create_constraints_exceptions_partial runOnChange:true stripComments:false splitStatements:false context:Release_4 labels:liquibase_project_start
--comment: initial changeset for update_rcl_create_constraints_exceptions_partial
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_create_constraints_exceptions_partial(_persisted_temp_tbl_name text, _unique_id text, _select jsonb, _value text, _search_meta jsonb, _created_by int4);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_create_constraints_exceptions_partial(_persisted_temp_tbl_name text, _select jsonb, _value text, _search_meta jsonb, _created_by integer)
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
    /*
    Description: Inputs: $1 = persistent temp table name, $2 = jsonb array of set all, selections filters, $3 = new values for the filters, $4 = meta filters, $5 = created by.
    This function is an intermediate one to update the persistent temp table with the user selected values. first need to create temp table by calling inventory_smart.rcl_create_constraints_exception function.
    sample call: select * from inventory_smart.update_rcl_create_constraints_exceptions('rule_store_groups_temp1', '[{"rule_code":2, "store_code":10005347}, {"rule_code":3, "store_code":138800005}]', '[{"start_date":"2024-09-01", "end_date":"2024-10-31"}]', '{}', 99);
    first need to create temp table by calling global.rcl_create_constraints_exceptions function*/
BEGIN
    _query_meta_filters := inventory_smart.form_rcl_table_query(_search_meta);
    IF jsonb_array_length($2) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements($2) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
                IF _key = 'store_code' or _key = 'psa_code' THEN 
                    _con := array_append(_con,  _key || ' = ' || quote_literal(_value));
                ELSE
                    _con := array_append(_con,  _key || ' = ' || _value);
                    RAISE NOTICE '_con: %', _con;
                END IF;
            END LOOP;
            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') ||')');
            _con := '{}';
        END LOOP;
       
        IF cardinality(_final) > 0 THEN
            _where := ' WHERE ' || array_to_string(_final, ' OR ');
        END IF;
        RAISE NOTICE 'where: %', _where;
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rule_code, psa_code, store_code FROM public.'  || $1 || _where || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
           
    ELSE
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rule_code, psa_code, store_code FROM public.'  || $1 || _query_meta_filters || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;

    _temp_sql := 'UPDATE public.'  || $1 || ' ' || $3 || ', created_by = ' || $5 || ', created_at = now() where (rule_code, store_code, psa_code) IN (SELECT rule_code, store_code, psa_code FROM "' ||_temp_table || '");';
    EXECUTE _temp_sql;
END;
$function$
;