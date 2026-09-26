--liquibase formatted sql
--changeset liquibase:add_ada_serve_request runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_ada_serve_request
--rollback: SELECT 1
DROP FUNCTION IF EXISTS ada.add_ada_serve_request(product_codes text, pg_codes text, hierarchy_codes text, body jsonb, "user" integer);
CREATE OR REPLACE FUNCTION ada.add_ada_serve_request(product_codes text, pg_codes text, hierarchy_codes text, body jsonb, "user" integer)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
declare
_key text;
_value text;
_keys text[] := array['product_codes', 'pg_codes','hierarchy_codes', 'created_by', 'created_at']::text[];
_vals text[] := array['''' || $1 || '''', '''' || $2 || '''','''' || $3 || '''', $5, '''' || now() || '''']::text[];
_query text;
_request_code character varying;
begin
    /*
    this function creates serve request entry
    */
    for _key, _value in select * from jsonb_each_text($4) where value is not null loop
        _keys := array_append(_keys, _key);
        _vals := array_append(_vals, '''' || _value || '''');
    end loop;
    _query := 'INSERT INTO "ada".ada_serve_request (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning request_code;';
    raise notice 'query: %s', _query;
    execute _query into _request_code;
    return _request_code;
end
$function$
;
