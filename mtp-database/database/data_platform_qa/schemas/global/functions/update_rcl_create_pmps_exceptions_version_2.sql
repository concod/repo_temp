--liquibase formatted sql
--changeset akshay.jain:update_rcl_create_pmps_exceptions_version_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:update_rcl_create_pmps_exceptions_version_3
--comment: initial changeset for update_rcl_create_pmps_exceptions_version_3
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_rcl_create_pmps_exceptions_version_2(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer);
CREATE OR REPLACE FUNCTION global.update_rcl_create_pmps_exceptions_version_2(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer)
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
    update_query text := '';
   	_query_table_filters text := '';
   _validity datemultirange;
    /*
    Description: Inputs: $1 = persistent temp table name, $2 = jsonb array of set all/selections filters, $3 = new values for the filters, $4 = meta filters, $5 = created by.
    This function is an intermediate one to update the persistent table with the user selected values. first need to create temp table by calling global.rcl_create_pmps_exception function.
    sample call: select * from global.update_rcl_create_pmps_exceptions_version_2('1234', '[{"rule_code": 210094, "store_code": 22998}]', '{"validity": "{[06-06-2023, 08-08-2023]}"}', '{}', 251);
    */
BEGIN
    IF jsonb_array_length($2) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements($2) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
                IF _key = 'store_code'  or _key = 'psa_code' THEN 
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
        
    else
    	_where := global.form_table_query($4);

    END IF;
   
  	if ($3)::jsonb->>'validity' = 'NULL' then 
  	
  	-- directly deleting if receiving null in validity in payload
  	
  	update_query := 'delete from global.rcl_psm_new_exception_' || $1::text || _where;
  else
   
	_validity := ($3)::jsonb->>'validity';
   
   update_query := 'update global.rcl_psm_new_exception_' || $1::text || ' set validity = ' || quote_literal(_validity) || _where;
  end if;
  
  execute update_query;
  
   --RAISE NOTICE 'where: %', update_query;
END;
$function$
;
