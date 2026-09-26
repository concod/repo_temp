--liquibase formatted sql
--changeset liquibase:update rule_name in rcl_constraint_master_rule runOnChange:true stripComments:false splitStatements:false context:MTP-124248 labels:MTP-124248
--comment: update rule_name in rcl_constraint_master_rule
--rollback: SELECT  1

DROP FUNCTION IF EXISTS inventory_smart.rcl_upload_constraints(text, varchar, int4, int4);

CREATE OR REPLACE FUNCTION inventory_smart.rcl_upload_constraints(_temp_tbl_name text, _psaf_config_level character varying, _module_code integer, _user_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _hierarchy_keys text[];
    _hierarchy_jsonb jsonb;
    _update_query text;
    _delete_query text;
	_insert_query text;
    _hierarchy_field text;
    _row_count integer;
    _new_entries_count integer;
 	_new_entries_table text;
	_store_hierarchy_columns varchar[];
    _concat_formula text;
    _store_field text;


BEGIN 
    -- Get initial row count
    EXECUTE 'SELECT COUNT(*) FROM ' || _temp_tbl_name INTO _row_count;
    RAISE NOTICE 'Total rows in temp table: %', _row_count;
    
    -- Get store hierarchy columns from the first row and order them by rcl_master_attribute_list
    EXECUTE 'SELECT array_agg(attribute_name ORDER BY order_of_display)
             FROM (
                 SELECT unnest(string_to_array((SELECT store_hierarchy_level FROM ' || _temp_tbl_name || ' LIMIT 1), '','')) as attribute_name
             ) attr
             JOIN inventory_smart.rcl_master_attribute_list mal USING(attribute_name)
             WHERE attribute_dimension = ''store''' 
    INTO _store_hierarchy_columns;
    
    RAISE NOTICE 'Ordered store hierarchy columns: %', _store_hierarchy_columns;
    
    -- Build concatenation formula: concat(val1, '_', val2, '_', val3)
    _concat_formula := 'CONCAT(';
    FOR i IN 1..array_length(_store_hierarchy_columns, 1) LOOP
        _store_field := trim(_store_hierarchy_columns[i]);
        
        IF i > 1 THEN
            _concat_formula := _concat_formula || ', ''_'', ';
        END IF;
        
		_concat_formula := _concat_formula || 't.store_dimension->>''' || _store_field || '''';
    END LOOP;
    _concat_formula := _concat_formula || ')';
    
    RAISE NOTICE 'Concatenation formula: %', _concat_formula;
    
    -- Step 1: Add sub_psa_code using concat logic
    EXECUTE 'ALTER TABLE ' || _temp_tbl_name || ' ADD COLUMN IF NOT EXISTS sub_psa_code TEXT';
    
    _update_query := 'UPDATE ' || _temp_tbl_name || ' t SET sub_psa_code = ' || _concat_formula;
    
    RAISE NOTICE 'Sub PSA code update query: %', _update_query;
    EXECUTE _update_query;
    
    -- Step 2: Update PSA codes by joining with rcl_psa_config_table using sub_psa_code
    _update_query := 'UPDATE ' || _temp_tbl_name || ' t
    SET psa_code = p.psa_code
    FROM inventory_smart.rcl_psa_config_table p
    WHERE p.sub_psa_code = t.sub_psa_code';
    
    -- Join PSA config level to fetch psa code
    IF _psaf_config_level IS NOT NULL AND _psaf_config_level != '' THEN
        RAISE NOTICE 'Adding PSA config level conditions for: %', _psaf_config_level;
        FOR i IN 1..array_length(string_to_array(_psaf_config_level, ','), 1) LOOP
            _hierarchy_field := trim((string_to_array(_psaf_config_level, ','))[i]);
            RAISE NOTICE 'Processing hierarchy field: %', _hierarchy_field;
            _update_query := _update_query || ' AND (t.rcl_dimension->>''' || _hierarchy_field || ''') = p.' || _hierarchy_field;
        END LOOP;
    END IF;
    
    RAISE NOTICE 'PSA update query: %', _update_query;
    EXECUTE _update_query;
  
	--Remove sub psa code col now that we have psa codes
	EXECUTE 'ALTER TABLE ' || _temp_tbl_name || ' DROP COLUMN IF EXISTS sub_psa_code';
    
    -- Step 3: Update rcl_code and rule_code for existing rules 
    _update_query := 'UPDATE ' || _temp_tbl_name || ' t
    SET rcl_code = r.rcl_code, rule_code = r.rule_code
    FROM inventory_smart.rcl_constraint_master_rule r
    WHERE t.rcl_dimension = r.rcl_dimension';
    
    RAISE NOTICE 'Rule code update query: %', _update_query;
    EXECUTE _update_query;
    
    -- Step 4: Delete constraints for existing rules then insert in rcl_constraint_master table
    _delete_query := 'DELETE FROM inventory_smart.rcl_constraint_master cm
		WHERE EXISTS (
	    SELECT 1 FROM ' || _temp_tbl_name || ' t
	    WHERE cm.rcl_code = t.rcl_code
	    AND cm.rule_code = t.rule_code  
	    AND cm.psa_code = t.psa_code
	    AND t.rcl_code IS NOT NULL
	    AND t.rule_code IS NOT NULL
	)';
	
	RAISE NOTICE 'Delete existing constraints query: %', _delete_query;
    EXECUTE _delete_query;

	_insert_query:= 'INSERT INTO inventory_smart.rcl_constraint_master (
				    rcl_code, 
				    rule_code, 
				    psa_code, 
				    min_stock, 
				    max_stock, 
				    wos, 
				    dos, 
				    validity, 
				    created_by, 
				    created_at,
					updated_by,
					updated_at
					)
					SELECT 
					    t.rcl_code, 
					    t.rule_code, 
					    t.psa_code, 
					    t.min_stock, 
					    t.max_stock, 
					    t.wos, 
					    t.dos, 
					    t.validity, 
					    t.created_by, 
					    t.created_at, 
						t.created_by,
						t.created_at
					FROM ' || _temp_tbl_name || ' t
					WHERE t.rcl_code IS NOT NULL 
					AND t.rule_code IS NOT NULL';
	
	RAISE NOTICE 'Insert constraints query: %', _insert_query;
    EXECUTE _insert_query;
    
    --update rule_name in rcl_constraint_master_rule
    _update_query := 'UPDATE inventory_smart.rcl_constraint_master_rule r
    SET rule_name = t.rule_name
    FROM ' || _temp_tbl_name || ' t
    WHERE r.rcl_code = t.rcl_code AND
    r.rule_code = t.rule_code
    AND t.rule_name IS NOT NULL';
    
    RAISE NOTICE 'Rule name update query: %', _update_query;
    EXECUTE _update_query;

    -- Step 5: Handle new constraints if any
	EXECUTE 'SELECT COUNT(*) FROM ' || _temp_tbl_name || ' WHERE rcl_code IS NULL' INTO _new_entries_count;
	RAISE NOTICE 'Rows with new entries: %', _new_entries_count;
    
    IF _new_entries_count > 0 THEN 
        EXECUTE 'SELECT DISTINCT array_agg(key ORDER BY key) 
        FROM ' || _temp_tbl_name || ' t, jsonb_object_keys(t.rcl_dimension) AS key
        LIMIT 1' INTO _hierarchy_keys;
           
        -- Create hierarchy JSONB with empty values for the persist_rcl_create_constraints SP
        SELECT jsonb_object_agg(key, '[]'::jsonb) INTO _hierarchy_jsonb
        FROM unnest(_hierarchy_keys) AS key;
        
        RAISE NOTICE 'Created hierarchy JSONB for Persist RCL SP: %', _hierarchy_jsonb;
        
        -- Create a separate temp table with new entries for persist rcl sp
		_new_entries_table := 'new_entries_' || _temp_tbl_name;
        EXECUTE 'CREATE UNLOGGED TABLE ' || _new_entries_table || ' AS 
        SELECT *, null as min_distribution FROM ' || _temp_tbl_name || ' WHERE rcl_code IS NULL';
		
        -- Update rule codes for new entries
        _update_query := 'WITH unique_dimensions AS (
            SELECT DISTINCT rcl_dimension
            FROM ' || _new_entries_table || '
        ),
        dimension_with_rule_codes AS (
            SELECT 
                rcl_dimension,
                nextval(''inventory_smart.rcl_constraint_master_rule_rule_code_seq'') as rule_code
            FROM unique_dimensions
        )
        UPDATE ' || _new_entries_table || ' t
        SET rule_code = d.rule_code
        FROM dimension_with_rule_codes d
        WHERE t.rcl_dimension = d.rcl_dimension';
        
        RAISE NOTICE 'Rule code generation query: %', _update_query;
        EXECUTE _update_query;
       
        -- Call persist_rcl_create_constraints SP
        PERFORM inventory_smart.persist_rcl_create_constraints(
            'new_entries_' || _temp_tbl_name, 
            _hierarchy_jsonb, 
            _module_code
        );
             
        EXECUTE 'DROP TABLE IF EXISTS new_entries_' || _temp_tbl_name;
    ELSE
        RAISE NOTICE 'No new entries to process';
    END IF;
    
    RAISE NOTICE 'process_constraint_upload completed successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in process_constraint_upload: %', SQLERRM;
        RAISE NOTICE 'Error occurred at: %', SQLSTATE;
        -- Clean up any temp tables
        EXECUTE 'DROP TABLE IF EXISTS new_entries_' || _temp_tbl_name;
        RAISE;
END
$function$
;
