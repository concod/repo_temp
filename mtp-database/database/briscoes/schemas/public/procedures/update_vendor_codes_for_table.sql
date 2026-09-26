--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:update_vendor_codes_for_table_1 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_update_vendor_codes_for_table_1
--comment: initial changeset for update_vendor_codes_for_table_1
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.update_vendor_codes_for_table(full_table_name TEXT);

CREATE OR REPLACE PROCEDURE update_vendor_codes_for_table(full_table_name TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    target_schema TEXT;
    target_table_name TEXT;
    updated_rows INTEGER;
    stmt TEXT;
    has_article BOOLEAN;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'update_vendor_codes_for_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- ✅ Step 1: Split "schema.table" into schema and table
    target_schema := split_part(full_table_name, '.', 1);
    target_table_name := split_part(full_table_name, '.', 2);

    RAISE NOTICE 'Target schema: %, table: %', target_schema, target_table_name;

    -- ✅ Step 2: Check if target table has an 'article' column
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = target_schema
          AND table_name = target_table_name
          AND column_name = 'article'
    )
    INTO has_article;

    -- ✅ Step 3: Build the dynamic UPDATE
    IF has_article THEN
        RAISE NOTICE 'Table %.% has article column — direct join.', target_schema, target_table_name;

        stmt := format($sql$
            UPDATE %I.%I f
            SET vendor_code = m.vendor_code
            FROM (
                SELECT article,
                ----Exception handling
                case when vendor_code isnull or vendor_code='' then '-' else vendor_code end as vendor_code
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY article, vendor_code ORDER BY updated_at DESC) AS rnk1
                    FROM (
                        SELECT DISTINCT article,
                                        vendor_id AS vendor_code,
                                        updated_at
                        FROM global.product_attributes_filter
                        WHERE 
                        	1=1
                          and active
                          AND TRIM(UPPER(replen_flag)) IN ('DC','STORE')
--                          AND vendor_id NOTNULL
                    ) x
                ) y
                WHERE rnk1 = 1
                ) m
            WHERE f.article = m.article
              AND f.vendor_code IS DISTINCT FROM m.vendor_code;
        $sql$, target_schema, target_table_name);

    ELSE
        RAISE NOTICE 'Table %.% does not have article column — joining via product_master.', target_schema, target_table_name;

        stmt := format($sql$
            UPDATE %I.%I f
            SET vendor_code = m.vendor_code
            FROM (
                SELECT article, 
                ----Exception handling
                case when vendor_code isnull or vendor_code='' then '-' else vendor_code end as vendor_code
                FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (PARTITION BY article, vendor_code ORDER BY updated_at DESC) AS rnk1
                    FROM (
                        SELECT DISTINCT article,
                                        vendor_id AS vendor_code,
                                        updated_at
                        FROM global.product_attributes_filter
                        WHERE 
                        	1=1
                          and active
                          AND TRIM(UPPER(replen_flag)) IN ('DC','STORE')
--                          AND vendor_id NOTNULL
                    ) x
                ) y
                WHERE rnk1 = 1
            ) m
            JOIN global.product_attributes_filter p
              ON p.article = m.article
            WHERE f.product_code = p.product_code
              AND f.vendor_code IS DISTINCT FROM m.vendor_code;
        $sql$, target_schema, target_table_name);
    END IF;

    -- ✅ Step 4: Print the full SQL before executing
    RAISE NOTICE 'Executing SQL: %', stmt;

    -- ✅ Step 5: Execute
    EXECUTE stmt;
    GET DIAGNOSTICS updated_rows = ROW_COUNT;

    -- ✅ Step 6: Report affected rows
    RAISE NOTICE 'Updated rows in %.%: %', target_schema, target_table_name, updated_rows;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;