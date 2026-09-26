--liquibase formatted sql
--changeset karthikeswar.saravnaan:update_rcl_constraints_partial_new_change runOnChange:true stripComments:false splitStatements:false context:intial_release labels:liquibase_project_start
--comment: initial changeset for update_rcl_constraints_partial
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean, _excluded_rows jsonb, _is_wos_incremented boolean);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
_query_part text;
_query_combine text;
_where text := '';
_final varchar[];
_query_meta_filters text;
_query_sa text;
_pa_query text;
_hash_cols text;
_rcl_codes integer[];
_dimension text[];
_item jsonb;
_key text;
_value text;
_con text[];
_key_cols text;
_dt_sql text;
_dt text;
_set jsonb;
_sets text;
_temp_sql text;
d_temp_sql text;
_temp_table text := gen_random_uuid();
_temp_table_2 text := gen_random_uuid();
_update_values text;
_rule_name text := null;
_rule_name_regex text := 'rule_name\s*=\s*([^,]+)';
_rule_name_matches text[];
/*s
Description: Inputs: $1 = set all/ selections values, $2 = product filters, $3 = store filters, $4 = new values for the filters, $5 = meta filters, $6 = created by.
This sp is used to update the base table directly.
ample call: select * from inventory_smart.update_rcl_constraints('[{"rule_code":2, "psa_code":680}, {"rule_code":3, "psa_code":1143}]', '{}'::jsonb,
'{ "created_at":"2024-05-20", "validity":"{[2024-09-01,2024-10-31]}","created_by":1}'::jsonb, '{}'::jsonb, 99);
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query($4);
   raise notice '1';
	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes ' into _rcl_codes, _hash_cols
	from global.rcl_master
	where not is_deleted
    and not is_default
	and module_code = '170'
	group by is_deleted;
--    _query_pa := replace(REPLACE(_query_pa, '(rcl_dimension->>''', ''), ''')', '');

   raise notice '2';

    IF jsonb_array_length($1) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements($1) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP
                IF _key IN ('store_code', 'psa_code', 'psa_name') THEN
                    _con := array_append(_con, _key || ' = ' || quote_literal(_value));
                ELSE
                    _con := array_append(_con, _key || ' = ' || _value);
                    RAISE NOTICE '_con: %', _con;
                END IF;
            END LOOP;
            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') || ')');
            _con := '{}';
        END LOOP;

        IF cardinality(_final) > 0 THEN
            _where := ' WHERE ' || array_to_string(_final, ' OR ');
        END IF;
        RAISE NOTICE 'where: %', _where;

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT rule_code, psa_code FROM inventory_smart.rcl_constraint_master' ||  _where || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    ELSE
        _where := ' join (
		with paf as materialized(
	 select rcl_hash from (
	           select unnest(rcl_hashes) as rcl_hash from (select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' and active
	)x ) y where rcl_hash is not null group by 1)
	select
	          	rcl_code,
	          rule_code,
			rule_name,
	          md5(rcl_dimension::text) rcl_hash
	          ,
	          rcl_dimension
	          from inventory_smart.rcl_constraint_master_rule
	    WHERE  rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
	          	and exists (
                            select 1 from paf where rcl_hash = md5(rcl_dimension::text)
                            )
	          	group by 1,2,3,4,5
	) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT c.rule_code, c.psa_code FROM inventory_smart.rcl_constraint_master c' || _where || _query_meta_filters ||';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
		if _is_all_records_selected and jsonb_array_length(_excluded_rows) > 0 then
            d_temp_sql := format('
                delete from "%s"
                where (rule_code, psa_code) in (
                    select (value->>''rule_code'')::integer as rule_code,
                           (value->>''psa_code'')::varchar as psa_code
                    from jsonb_array_elements(%L::jsonb) as value
                )', _temp_table, _excluded_rows);
			execute d_temp_sql;
		end if;
    END IF;

    _update_values := $3;

    -- Check if rule_name is in the values to be updated
    IF position('rule_name' in _update_values) > 0 THEN
        -- Extract rule_name value using a more robust approach
        BEGIN
            SELECT regexp_matches(_update_values, _rule_name_regex) INTO _rule_name_matches;
            IF _rule_name_matches IS NOT NULL AND array_length(_rule_name_matches, 1) > 0 THEN
                _rule_name := trim(_rule_name_matches[1]);

                -- Remove rule_name from the update string more carefully
                _update_values := regexp_replace(_update_values, 'rule_name\s*=\s*[^,]+(,|$)', '', 'g');
                -- Clean up any trailing commas
                _update_values := regexp_replace(_update_values, ',\s*$', '');

                -- Update rule_name in rcl_constraint_master_rule
                EXECUTE 'UPDATE inventory_smart.rcl_constraint_master_rule
                         SET rule_name = ' || quote_literal(_rule_name) || '
                         WHERE rule_code IN (SELECT rule_code FROM "' || _temp_table || '")';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error extracting rule_name: %', SQLERRM;
        END;
    END IF;

    -- Update rcl_constraint_master with remaining fields if any
    IF _update_values IS NOT NULL AND trim(_update_values) <> '' THEN
        BEGIN
            _temp_sql := 'UPDATE inventory_smart.rcl_constraint_master
                          SET ' || _update_values || ', updated_by = ' || $5 || ', updated_at = now()
                          WHERE (rule_code, psa_code) IN (SELECT rule_code, psa_code FROM "' || _temp_table || '")';
            EXECUTE _temp_sql;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error updating fields: %', SQLERRM;
        END;
    END IF;

end
$function$
;