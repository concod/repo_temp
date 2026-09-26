--liquibase formatted sql
--changeset kamalesh.k@impactanalytics.co:create_paf_buckets runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:create_paf_buckets
--comment: initial changeset for create_paf_buckets sp
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.create_paf_buckets();
CREATE OR REPLACE PROCEDURE global.create_paf_buckets(
    IN p_hierarchy_filters JSONB,
    IN p_bucket_size INTEGER DEFAULT 5000
)
LANGUAGE plpgsql
AS $$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.create_paf_buckets';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    v_sql TEXT;
    v_mv_name TEXT := 'global.paf_buckets';
    v_where_clause TEXT := '';
    v_select_clause TEXT := '';
    v_partition_clause TEXT := '';
    v_group_clause TEXT := '';
    v_order_clause TEXT := '';
    v_join_clause TEXT := '';
    v_key TEXT;
    v_value TEXT;
    v_first_iteration BOOLEAN := TRUE;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'paf_buckets' AND schemaname = 'global') THEN
        EXECUTE 'DROP MATERIALIZED VIEW ' || v_mv_name;
    END IF;
    
 
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_hierarchy_filters)
    LOOP
       
        IF v_first_iteration THEN
            v_where_clause := v_where_clause || v_key || ' = ''' || v_value || '''';
            v_first_iteration := FALSE;
        ELSE
            v_where_clause := v_where_clause || ' AND ' || v_key || ' = ''' || v_value || '''';
        END IF;
        
       
        v_select_clause := v_select_clause || v_key || ', ';
       
        v_partition_clause := v_partition_clause || v_key || ', ';
        
        v_group_clause := v_group_clause || v_key || ', ';
        
        v_order_clause := v_order_clause || v_key || ', ';
        
        IF v_join_clause = '' THEN
            v_join_clause := 'hd.' || v_key || ' = hc.' || v_key;
        ELSE
            v_join_clause := v_join_clause || ' AND hd.' || v_key || ' = hc.' || v_key;
        END IF;
    END LOOP;
    
    v_select_clause := RTRIM(v_select_clause, ', ');
    v_partition_clause := RTRIM(v_partition_clause, ', ');
    v_group_clause := RTRIM(v_group_clause, ', ');
    v_order_clause := RTRIM(v_order_clause, ', ');
    
    v_sql := '
    CREATE MATERIALIZED VIEW ' || v_mv_name || ' AS
    WITH hierarchy_data AS (
        SELECT 
            ' || v_select_clause || ', product_code,
            ROW_NUMBER() OVER (
                PARTITION BY ' || v_partition_clause || ' 
                ORDER BY product_code
            ) as row_num
        FROM global.product_attributes_filter 
        WHERE ' || v_where_clause || '
    ),
    hierarchy_counts AS (
        SELECT 
            ' || v_select_clause || ', 
            COUNT(*) as record_count
        FROM hierarchy_data
        GROUP BY ' || v_group_clause || '
    ),
    bucketed_data AS (
        SELECT 
            hd.' || REPLACE(v_select_clause, ', ', ', hd.') || ',
            hd.product_code,
            hd.row_num,
            hc.record_count,
            CASE 
                WHEN hc.record_count <= ' || p_bucket_size || ' THEN 1
                ELSE CEIL(hd.row_num / ' || p_bucket_size || '.0)
            END as bucket_number
        FROM hierarchy_data hd
        JOIN hierarchy_counts hc ON ' || v_join_clause || '
    ),
    bucket_aggregated AS (
        SELECT 
            ' || v_select_clause || ',
            bucket_number,
            record_count,
            ARRAY_AGG(product_code ORDER BY product_code) as bucket_product_codes,
            COUNT(*) as actual_bucket_data_count
        FROM bucketed_data
        GROUP BY ' || v_group_clause || ', bucket_number, record_count
    )
    SELECT 
        ' || v_select_clause || ',
        ''BUCKET_'' || bucket_number::VARCHAR as bucket_name,
        bucket_number::VARCHAR as bucket_code,
        record_count,
        actual_bucket_data_count,
        bucket_product_codes as product_codes
    FROM bucket_aggregated
    ORDER BY ' || v_order_clause || ', bucket_number;
    ';
    
    EXECUTE v_sql;
    
    EXECUTE 'CREATE INDEX idx_paf_buckets_hierarchy ON ' || v_mv_name || ' (' || v_select_clause || ')';
    EXECUTE 'CREATE INDEX idx_paf_buckets_bucket ON ' || v_mv_name || ' (bucket_code)';
    EXECUTE 'CREATE INDEX idx_paf_buckets_count ON ' || v_mv_name || ' (record_count)';
    
    EXECUTE 'REFRESH MATERIALIZED VIEW ' || v_mv_name;
    
    RAISE NOTICE 'Materialized view % created successfully for hierarchy filters: % with bucket size %', 
                 v_mv_name, p_hierarchy_filters, p_bucket_size;
    
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$; 
