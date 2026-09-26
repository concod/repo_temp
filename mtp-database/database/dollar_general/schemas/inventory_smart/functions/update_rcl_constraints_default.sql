--liquibase formatted sql
--changeset liquibase:update_rcl_constraints_default runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: initial changeset for update_rcl_constraints_default, revert constraint values to default
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints_default(selections jsonb, updated_by int, filters jsonb, meta jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_constraints_default(selections jsonb, updated_by int, filters jsonb, meta jsonb)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    updated timestamptz := now();
    _temp_sql TEXT;
   	item json;
	_where text := '';
	_query_meta_filters text;
	_pa_query text;
	_hash_cols text;
	_rcl_codes integer[];
	_temp_table text := gen_random_uuid();

BEGIN
    _query_meta_filters := inventory_smart.form_rcl_table_query(meta);
    _pa_query := global.form_main_table_filters('product_attributes_filter', filters);

   	RAISE NOTICE '_pa_query: %', _pa_query;
   	RAISE NOTICE '_query_meta_filters: %', _query_meta_filters;
   
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hash' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = '170'
	group by is_deleted;

	RAISE NOTICE '_rcl_codes: %', _rcl_codes;
	RAISE NOTICE '_hash_cols: %', _hash_cols;	
   
    IF jsonb_array_length(selections) = 0 THEN
    
        _where := ' JOIN (
		        SELECT rcl_code, rule_code, md5(r.rcl_dimension::text) rcl_hash, rcl_dimension 
		        FROM inventory_smart.rcl_constraint_master_rule r 
		        JOIN (
		            SELECT ' || _hash_cols || ' FROM global.product_attributes_filter ' || _pa_query || ' GROUP BY 1
		        ) paf 
		        ON md5(r.rcl_dimension::text) = ANY(rcl_hash)
		        AND r.rcl_code = ANY(' || quote_literal(_rcl_codes::text) || '::int[])
		        GROUP BY 1,2,3
		    ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code';

    	RAISE NOTICE '_where: %', _where;
    
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON 
						COMMIT DROP AS 
						SELECT 
							c.rule_code, c.psa_code, r.rcl_dimension->>''article'' as article, psa.psa_name,
							c.min_stock, c.max_stock, c.wos, c.st
						FROM 
							inventory_smart.rcl_constraint_master c
							JOIN inventory_smart.rcl_psa_config_table psa ON c.psa_code = psa.psa_code' || _where || _query_meta_filters ||';';

        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
        
       	_temp_sql := 'UPDATE inventory_smart.rcl_constraint_master rcm
                    SET 
                        min_stock = aldc.min,
                        max_stock = aldc.max,
                        st = aldc.st,
                        wos = aldc.wos,
                        updated_at = $1,
                        updated_by = $2
                    FROM "' || _temp_table || '" td
                    JOIN inventory_smart.article_level_default_constraints aldc
                      ON td.psa_name = aldc.psa_name
                      AND td.article = aldc.article
                    WHERE 
                        rcm.rule_code = td.rule_code
                        AND rcm.psa_code = td.psa_code;';

		EXECUTE _temp_sql USING updated, updated_by;    
    ELSE
        FOR item IN SELECT * FROM jsonb_array_elements(selections) AS t(data)
        LOOP
            UPDATE inventory_smart.rcl_constraint_master rcm
            SET 
                min_stock = aldc.min,
                max_stock = aldc.max,
                st = aldc.st,
                wos = aldc.wos,
                updated_at = updated,
                updated_by = $2
            FROM inventory_smart.article_level_default_constraints aldc
            JOIN inventory_smart.rcl_constraint_master_rule rcmr
              ON rcmr.rule_code = (item->>'rule_code')::INTEGER
            JOIN inventory_smart.rcl_psa_config_table psa
              ON psa.psa_code = (item->>'psa_code')
            WHERE 
                rcm.rule_code = (item->>'rule_code')::INTEGER
                AND rcm.psa_code = (item->>'psa_code')
                AND psa.psa_name = aldc.psa_name
                AND aldc.article = (rcmr.rcl_dimension->>'article');
        END LOOP;
    END IF;
END;
$function$;
;