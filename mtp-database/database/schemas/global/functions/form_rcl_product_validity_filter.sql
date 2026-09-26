--liquibase formatted sql
--changeset liquibase:form_rcl_product_validity_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for form_rcl_product_validity_filter
--rollback: SELECT 1
drop function if exists global.form_rcl_product_validity_filter(jsonb, text[]);
create or replace function global.form_rcl_product_validity_filter(jsonb, text[])
returns text 
language plpgsql as $function$
declare 
_key text;
_value text;
_attr_cols text[] := array[]::text[];
_dt_sql text;
_dt text;
_filter text;
   	_con text[];
   	_con_val text;
   	_combine_where text[];
_where text := '';
   	_list_values text;
_final varchar;
--_end_dates varchar[];
_datemultirange daterange;
_query_meta_filters text;
/*
Description: forms filter for rcl tables when product filters and validity is supplied as input.
Sample call: select * from global.form_rcl_product_validity_filter('{}'::jsonb, '{}'::text[]);
*/
begin
	SELECT '(' || string_agg(quote_literal(date_val), ', ') || ')' 
	    INTO _final
	    FROM unnest($2::TEXT[]) AS date_val;
	   
	    FOR _key, _value IN 
	        SELECT * 
	        FROM jsonb_each_text($1) 
	        WHERE value IS NOT NULL 
	    loop
		    _value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
	        _attr_cols := array_append(_attr_cols, _key);
	        _dt_sql := 'select coalesce(max(datatype), ''varchar'') from "global".product_attributes_list where attribute_name = ''' || _key || ''';';
	        EXECUTE _dt_sql INTO _dt;
	        _key := '(rcl_dimension->>' || quote_literal(_key) || ')';
	        
	        FOR _filter IN 
	            SELECT * 
	            FROM json_array_elements(_value::json) 
	        LOOP
	            IF (_filter::json)->>'type' = 'custom' THEN
	                IF (_filter::json)->>'values' = 'null' THEN
	                    _con_val := ((_filter::json)->>'values');
	                ELSE
	                    _con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
	                END IF;
	                _con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
	            ELSIF (_filter::json)->>'type' = 'list' THEN
	                IF COALESCE((_filter::json)->>'values','[]') = '[]' THEN
	                    CONTINUE;
	                END IF;
	                SELECT CONCAT(array_agg(value)) 
	                INTO _list_values 
	                FROM json_array_elements_text(((_filter::json)->>'values')::json);
	                IF (_filter::json)->>'operator' = 'in' THEN
	                    _con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
	                ELSE
	                    _con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
	                END IF;
	            ELSIF (_filter::json)->>'type' = 'expression' THEN
	                _con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
	            END IF;
	        END LOOP;
	
	        IF cardinality(_con) > 0 THEN
	            _combine_where := array_append(_combine_where, ARRAY_TO_STRING(_con, ' AND ', ''));
	            _con := array[]::text[];
	        END IF;
	    END LOOP;

	IF cardinality(_combine_where) > 0 THEN
		IF cardinality($2) > 0 THEN
	            _where := ' WHERE ' || array_to_string(_combine_where, ' AND ', '') || ' and daterange' || _final || ' <@ validity';
	    ELSE
	            _where := ' WHERE ' || array_to_string(_combine_where, ' AND ', '');
	    END IF;
	ELSE
		if cardinality($2) > 0 THEN
	            _where := ' WHERE daterange' || _final || ' <@ validity';
		end if;
	END IF;
	   	return _where;
end $function$
;