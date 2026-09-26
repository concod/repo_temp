--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:pc_load_product_hierarchy_combination runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: loading product hierarchy combination

DROP PROCEDURE IF EXISTS price_promo_opt.pc_load_product_hierarchy_combination;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_load_product_hierarchy_combination()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_config jsonb;
    v_version_code int;
    
    v_target_cols text := '';
    v_source_cols text := '';
    v_sql_final text;
    
    i int;
    v_level_key text;
    v_level_conf jsonb;
    v_prod_col text;
BEGIN
    -- 1. Get Version Code
	SELECT COALESCE(
		global.get_table_version('price_promo.tb_product_hierarchy_combination_version'), 
		(SELECT MAX(version_code)
       	FROM price_promo.tb_product_hierarchy_combination_version)
	) INTO v_version_code;    

    RAISE NOTICE 'Loading for version_code: %', v_version_code;

    -- 2. Fetch Config
    SELECT config_value::jsonb 
    INTO v_config 
    FROM price_promo.tb_tool_configurations  
    WHERE "module" = 'product' 
      AND config_name = 'hierarchy_filters'
    LIMIT 1; 

    -- 3. Cleanup existing data for this version
    DELETE FROM price_promo.tb_product_hierarchy_combination_version 
    WHERE version_code = v_version_code;

    -- 4. Determine product column
    v_prod_col := COALESCE(v_config->'product_ids'->>'id_column', 'product_id');

    -- 5. Build dynamic column lists
    FOR i IN 0..7 
	LOOP
        v_level_key := 'l' || i || '_ids';
        
        -- Target columns
        v_target_cols := v_target_cols || format(', l%s_id, l%s_cid, l%s_cuq', i, i, i);
        
        -- Source columns
        IF (v_config ? v_level_key) THEN
            v_level_conf := v_config -> v_level_key;
            
            v_source_cols := v_source_cols || format(
                ', %I, %I, %I', 
                v_level_conf->>'name_column',   -- → lX_id
                v_level_conf->>'id_column',     -- → lX_cid
                v_level_conf->>'value_column'   -- → lX_cuq
            );
        ELSE
            v_source_cols := v_source_cols || format(
                ', l%s_id, l%s_cid, l%s_cuq', 
                i, i, i
            );
        END IF;
    END LOOP;

    -- 6. Build final INSERT query
    v_sql_final := format(
        'INSERT INTO price_promo.tb_product_hierarchy_combination_version
         (version_code, hierarchy_id %s, product_id)
         SELECT 
            %s,
            %I
            %s,
            product_id
         FROM price_promo.product_master',
         v_target_cols,
         v_version_code,
         v_prod_col,
         v_source_cols
    );

    -- 7. Execute
    EXECUTE v_sql_final;

    RAISE NOTICE 'Data load complete for version_code: %', v_version_code;

END;
$procedure$
;
