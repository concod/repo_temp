--liquibase formatted sql
--changeset liquibase:sync_hierarchy_reclassification runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_hierarchy_reclassification
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_hierarchy_reclassification();
CREATE OR REPLACE PROCEDURE public.sync_hierarchy_reclassification()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _cnt INT;
    _st TIMESTAMP := clock_timestamp();
	_rcl_hash text;
	_worker text;
BEGIN
    SELECT COUNT(1) INTO _cnt FROM hierarchy_delta;

    IF _cnt = 0 THEN
        CALL global.data_ingestion_logs(
            gen_random_uuid()::text,
            'public.sync_hierarchy_reclassification',
            'first',
            NULL,
            (clock_timestamp() - _st)::text,
            NULL
        );
        RAISE NOTICE 'No hierarchy reclassification';
        RETURN;
    END IF;

    ALTER TABLE "public"."hierarchy_delta" ADD COLUMN IF NOT EXISTS rcl_hash_old jsonb DEFAULT '{}'::jsonb NOT NULL;

    select 
		  string_agg(distinct v, ' || ') into _rcl_hash
		from 
		  (
		    select 
		      'jsonb_build_object(' || global.get_rcl_hash_query_v2(rcl_code, level) || ')' as v, 
		      unnest(level) as l 
		    from 
		      global.rcl_master 
		    where 
		      not is_deleted
		  ) x;

			execute 'update 
			  public.hierarchy_delta t1 
			set 
			  rcl_hash_old = ' ||  _rcl_hash || ';';
raise notice 'sync hybrid start';

call public.sync_hybrid_attributes();

raise notice 'sync hybrid end';


    -- ===================================================
    -- 1. rcl_constraint_master_rule
    -- ===================================================
    CREATE TEMP TABLE hierarchy_delta_update_constraints
    ON COMMIT DROP AS
    SELECT paf.product_code, hd.rcl_hash, rcmr.*
    FROM public.hierarchy_delta hd
    JOIN global.product_attributes_filter paf USING (product_code)
    JOIN inventory_smart.rcl_constraint_master_rule rcmr
      ON md5(rcl_dimension::text) = (hd.rcl_hash ->> rcl_code::text);

	raise notice 'hierarchy_delta_update_constraints created';


	CREATE TEMP TABLE new_constraints
    ON COMMIT DROP AS
	SELECT DISTINCT rhl.rcl_code, rhl.rule_code
	FROM global.product_attributes_filter paf
	CROSS JOIN jsonb_each_text(paf.rcl_hash) AS jt(key, value)
	JOIN inventory_smart.rcl_constraint_master_rule rhl 
	  ON rhl.rcl_code::text = jt.key 
	  AND md5(rcl_dimension::text) = jt.value;

	raise notice 'new_constraints created';

    IF EXISTS (SELECT 1 FROM hierarchy_delta_update_constraints) THEN
        CALL public.update_rcl_dimension(
            'inventory_smart.rcl_constraint_master_rule', 
			'hierarchy_delta_update_constraints',
			'new_constraints'
        );
    END IF;

    -- ===================================================
    -- 2. rcl_dc_store_policy_rule
    -- ===================================================
    CREATE TEMP TABLE hierarchy_delta_update_dc_store
    ON COMMIT DROP AS
    SELECT paf.*, hd.rcl_hash, rcmr.*
    FROM public.hierarchy_delta hd
    JOIN global.product_attributes_filter paf USING (product_code)
    JOIN inventory_smart.rcl_dc_store_policy_rule rcmr
      ON md5(rcl_dimension::text) = (hd.rcl_hash ->> rcl_code::text);
	
	raise notice 'hierarchy_delta_update_dc_store created';


	CREATE TEMP TABLE new_dc_store
    ON COMMIT DROP AS
	SELECT DISTINCT rhl.rcl_code, rhl.rule_code
	FROM global.product_attributes_filter paf
	CROSS JOIN jsonb_each_text(paf.rcl_hash) AS jt(key, value)
	JOIN inventory_smart.rcl_dc_store_policy_rule rhl 
	  ON rhl.rcl_code::text = jt.key 
	  AND md5(rcl_dimension::text) = jt.value;

	raise notice 'new_dc_store created';

    IF EXISTS (SELECT 1 FROM hierarchy_delta_update_dc_store) THEN
        CALL public.update_rcl_dimension(
            'inventory_smart.rcl_dc_store_policy_rule',
			'hierarchy_delta_update_dc_store',
			'new_dc_store'
        );
    END IF;
----
------    -- ===================================================
------    -- 3. rcl_product_mapping_product_store_rule
------    -- ===================================================
    CREATE TEMP TABLE hierarchy_delta_update_psm
    ON COMMIT DROP AS
    SELECT paf.*, hd.rcl_hash_old, rcmr.*
    FROM public.hierarchy_delta hd
    JOIN global.product_attributes_filter paf USING (product_code)
    JOIN global.rcl_product_mapping_product_store_rule rcmr
      ON md5(rcl_dimension::text) = (hd.rcl_hash_old ->> rcl_code::text);

	raise notice 'hierarchy_delta_update_psm created';


	CREATE TEMP TABLE new_psm
    ON COMMIT DROP AS
	SELECT DISTINCT rhl.rcl_code, rhl.rule_code
	FROM global.product_attributes_filter paf
	CROSS JOIN jsonb_each_text(paf.rcl_hash) AS jt(key, value)
	JOIN global.rcl_product_mapping_product_store_rule rhl 
	  ON rhl.rcl_code::text = jt.key 
	  AND md5(rcl_dimension::text) = jt.value;

	raise notice 'new psm created';

    IF EXISTS (SELECT 1 FROM hierarchy_delta_update_psm) THEN
        CALL public.update_rcl_dimension(
            'global.rcl_product_mapping_product_store_rule',
			'hierarchy_delta_update_psm',
			'new_psm'
        );
    END IF;
--
------    -- ===================================================
------    -- 4. rcl_oms_constraint_master_rule
------    -- ===================================================
    CREATE TEMP TABLE hierarchy_delta_update_oms_constraints
    ON COMMIT DROP AS
    SELECT paf.*, hd.rcl_hash, rcmr.*
    FROM public.hierarchy_delta hd
    JOIN global.product_attributes_filter paf USING (product_code)
    JOIN inventory_smart.rcl_oms_constraint_master_rule rcmr
      ON md5(rcl_dimension::text) = (hd.rcl_hash ->> rcl_code::text);

    raise notice 'hierarchy_delta_update_oms_constraints created';


	CREATE TEMP TABLE new_oms_constraints
    ON COMMIT DROP AS
	SELECT DISTINCT rhl.rcl_code, rhl.rule_code
	FROM global.product_attributes_filter paf
	CROSS JOIN jsonb_each_text(paf.rcl_hash) AS jt(key, value)
	JOIN inventory_smart.rcl_oms_constraint_master_rule rhl 
	  ON rhl.rcl_code::text = jt.key 
	  AND md5(rcl_dimension::text) = jt.value;

	raise notice 'new_oms_constraints created';

    IF EXISTS (SELECT 1 FROM hierarchy_delta_update_dc_store) THEN
        CALL public.update_rcl_dimension(
            'inventory_smart.rcl_dc_store_policy_rule',
			'hierarchy_delta_update_dc_store',
			'new_oms_constraints'
        );
    END IF;

    -- Final log
    CALL global.data_ingestion_logs(
        gen_random_uuid()::text,
        'public.sync_hierarchy_reclassification',
        'completed',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );
END;
$procedure$
;