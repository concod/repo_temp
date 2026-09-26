--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:aggregate_allocation_at_range_level_V2 runOnChange:true stripComments:false splitStatements:false context:lovisa_inv_smart labels:MTP-130812-aggregate_allocation_at_range_level_V2
--comment: Changeset for aggregate_allocation_at_range_level_V2


DROP PROCEDURE IF EXISTS public.aggregate_allocation_at_range_level();
CREATE OR REPLACE PROCEDURE public.aggregate_allocation_at_range_level()
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    attr_rec RECORD;
    v_first_plan_code TEXT;
    v_plan_codes TEXT[];
    v_merged_text TEXT;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.aggregate_allocation_at_range_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

/*
 * Function/Procedure name: public.aggregate_allocation_at_range_level
 * Created by: Swapnil Bhange
 * Created at: 23-Feb-2026
 * Parameter Description : 
 * Purpose: This procedure has been created to aggregate the auto allocations at Range level
 * Calling Statement:
		 CALL public.aggregate_allocation_at_range_level()
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * 		Updated_by       	Updated_on      	Purpose
 * 		----------       	-----------     	--------
 	    Swapnil Bhange		23th Feb, 2026      https://impactanalytics.atlassian.net/browse/MTP-130812
 */
    ---------------------------------------------------
    -- LOOP THROUGH RANGES HAVING MULTIPLE COMPLETED PLANS
    ---------------------------------------------------
    FOR rec IN
       SELECT range_name,
               ARRAY_AGG(allocation_code ORDER BY allocation_code) AS plan_list
        FROM inventory_smart.auto_allocation_input
        WHERE allocation_status = 'completed'
          AND allocation_code IS NOT null
          and allocation_code in (select plan_code from inventory_smart.plan_master where status = 1 and is_deleted = False)
        GROUP BY range_name
        HAVING COUNT(*) > 1
    LOOP

        v_first_plan_code := rec.plan_list[1];
        v_plan_codes := rec.plan_list;

---------------------------------------------------
-- 1️ UPDATE RESULT TABLE (allocation_code + description)
---------------------------------------------------

DECLARE
    v_description TEXT;
BEGIN
    -- Get description of surviving allocation_code
    SELECT description
    INTO v_description
    FROM inventory_smart.create_allocation_result_flat_gurobi
    WHERE allocation_code = v_first_plan_code
    LIMIT 1;

    -- Update other allocation codes
    UPDATE inventory_smart.create_allocation_result_flat_gurobi
    SET allocation_code = v_first_plan_code,
        description     = v_description
    WHERE allocation_code = ANY(v_plan_codes)
      AND allocation_code <> v_first_plan_code;
END;

        ---------------------------------------------------
        -- 2️ MERGE PLAN_ATTRIBUTES
        ---------------------------------------------------
        FOR attr_rec IN
            SELECT DISTINCT attribute_name
            FROM inventory_smart.plan_attributes
            WHERE plan_code = ANY(v_plan_codes)
        LOOP

            v_merged_text := NULL;

            --------------------------------------------------
            -- STATIC ATTRIBUTES
            --------------------------------------------------
            IF attr_rec.attribute_name IN ('allocation_type','released_at') THEN

                SELECT attribute_value
                INTO v_merged_text
                FROM inventory_smart.plan_attributes
                WHERE plan_code = v_first_plan_code
                  AND attribute_name = attr_rec.attribute_name
                LIMIT 1;

            --------------------------------------------------
            -- article_dc_codes → JSON SUM → STRING VALUE
            --------------------------------------------------
            ELSIF attr_rec.attribute_name = 'article_dc_codes' THEN

                SELECT COALESCE(
                    jsonb_object_agg(key, total_value::text)::text,
                    '{}'
                )
                INTO v_merged_text
                FROM (
                    SELECT key,
                           SUM(clean_value)::int AS total_value
                    FROM (
                        SELECT key,
                               regexp_replace(value::text, '[^0-9\-]', '', 'g')::int AS clean_value
                        FROM inventory_smart.plan_attributes pa,
                             jsonb_each(pa.attribute_value::jsonb)
                        WHERE pa.plan_code = ANY(v_plan_codes)
                          AND pa.attribute_name = 'article_dc_codes'
                    ) x
                    GROUP BY key
                ) y;

            --------------------------------------------------
            -- article_dc_names → JSON DISTINCT MERGE
            --------------------------------------------------
            ELSIF attr_rec.attribute_name = 'article_dc_names' THEN

                SELECT COALESCE(
                    jsonb_object_agg(key, value)::text,
                    '{}'
                )
                INTO v_merged_text
                FROM (
                    SELECT DISTINCT key, value
                    FROM inventory_smart.plan_attributes pa,
                         jsonb_each(pa.attribute_value::jsonb)
                    WHERE pa.plan_code = ANY(v_plan_codes)
                      AND pa.attribute_name = 'article_dc_names'
                ) s;

            --------------------------------------------------
            -- JSON NUMERIC SUM COLUMNS
            --------------------------------------------------
            ELSIF attr_rec.attribute_name IN (
                'article_allocated_total',
                'article_inv_avai',
                'article_no_store_allocated',
                'article_no_store_eligible'
            ) THEN

                SELECT COALESCE(
                    jsonb_object_agg(key, total_value)::text,
                    '{}'
                )
                INTO v_merged_text
                FROM (
                    SELECT key,
                           SUM(clean_value)::int AS total_value
                    FROM (
                        SELECT key,
                               regexp_replace(value::text, '[^0-9\-]', '', 'g')::int AS clean_value
                        FROM inventory_smart.plan_attributes pa,
                             jsonb_each(pa.attribute_value::jsonb)
                        WHERE pa.plan_code = ANY(v_plan_codes)
                          AND pa.attribute_name = attr_rec.attribute_name
                    ) x
                    GROUP BY key
                ) y;

            --------------------------------------------------
            -- JSON ARRAY MERGE → article_store_allocated
            --------------------------------------------------
            ELSIF attr_rec.attribute_name = 'article_store_allocated' THEN

                SELECT COALESCE(
                    jsonb_object_agg(key, store_array)::text,
                    '{}'
                )
                INTO v_merged_text
                FROM (
                    SELECT key,
                           jsonb_agg(DISTINCT store_code ORDER BY store_code) AS store_array
                    FROM (
                        SELECT key,
                               store_code
                        FROM inventory_smart.plan_attributes pa,
                             jsonb_each(pa.attribute_value::jsonb) obj,
                             jsonb_array_elements_text(obj.value) store_code
                        WHERE pa.plan_code = ANY(v_plan_codes)
                          AND pa.attribute_name = 'article_store_allocated'
                    ) s
                    GROUP BY key
                ) t;

            --------------------------------------------------
            -- JSON ARRAY MERGE → article_store_eligible
            --------------------------------------------------
            ELSIF attr_rec.attribute_name = 'article_store_eligible' THEN

                SELECT COALESCE(
                    jsonb_object_agg(key, store_array)::text,
                    '{}'
                )
                INTO v_merged_text
                FROM (
                    SELECT key,
                           jsonb_agg(DISTINCT store_code ORDER BY store_code) AS store_array
                    FROM (
                        SELECT key,
                               store_code
                        FROM inventory_smart.plan_attributes pa,
                             jsonb_each(pa.attribute_value::jsonb) obj,
                             jsonb_array_elements_text(obj.value) store_code
                        WHERE pa.plan_code = ANY(v_plan_codes)
                          AND pa.attribute_name = 'article_store_eligible'
                    ) s
                    GROUP BY key
                ) t;

            --------------------------------------------------
            -- NUMERIC SUM ATTRIBUTES
            --------------------------------------------------
            ELSIF attr_rec.attribute_name IN (
                'total_allocated_qty',
                'article_count',
                'no_stores_allocated',
                'no_allocated_articles'
            ) THEN

                SELECT COALESCE(
                    SUM(
                        regexp_replace(attribute_value, '[^0-9\.\-]', '', 'g')::numeric
                    ),
                    0
                )::text
                INTO v_merged_text
                FROM inventory_smart.plan_attributes
                WHERE plan_code = ANY(v_plan_codes)
                  AND attribute_name = attr_rec.attribute_name;

            --------------------------------------------------
            -- STORE CODE COUNT
            --------------------------------------------------
            ELSIF attr_rec.attribute_name = 'store_code_count' THEN

                SELECT COUNT(DISTINCT val)::text
                INTO v_merged_text
                FROM (
                    SELECT trim(both '"' from unnest(
                        string_to_array(
                            regexp_replace(pa.attribute_value, '[{}]', '', 'g'),
                            ','
                        )
                    )) AS val
                    FROM inventory_smart.plan_attributes pa
                    WHERE pa.plan_code = ANY(v_plan_codes)
                      AND pa.attribute_name = 'store_code'
                ) s;

            --------------------------------------------------
            -- DEFAULT DISTINCT TEXT ARRAY MERGE
            --------------------------------------------------
            ELSE

                SELECT COALESCE(
                    '{' || string_agg(DISTINCT '"' || trim(val) || '"', ',') || '}',
                    '{}'
                )
                INTO v_merged_text
                FROM (
                    SELECT trim(both '"' from unnest(
                        string_to_array(
                            regexp_replace(pa.attribute_value, '[{}]', '', 'g'),
                            ','
                        )
                    )) AS val
                    FROM inventory_smart.plan_attributes pa
                    WHERE pa.plan_code = ANY(v_plan_codes)
                      AND pa.attribute_name = attr_rec.attribute_name
                ) s;

            END IF;

            --------------------------------------------------
            -- UPDATE FIRST PLAN ATTRIBUTE
            --------------------------------------------------
            UPDATE inventory_smart.plan_attributes
            SET attribute_value = v_merged_text
            WHERE plan_code = v_first_plan_code
              AND attribute_name = attr_rec.attribute_name;

        END LOOP;

        ---------------------------------------------------
        -- 3️ SOFT DELETE OTHER PLANS
        ---------------------------------------------------
        UPDATE inventory_smart.plan_master
        SET is_deleted = true
        WHERE plan_code = ANY(v_plan_codes)
          AND plan_code <> v_first_plan_code
          AND is_deleted = false;

    END LOOP;

    RAISE NOTICE 'Range level aggregation completed successfully.';

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;