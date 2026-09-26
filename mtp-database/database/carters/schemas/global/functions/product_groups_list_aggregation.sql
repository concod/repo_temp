--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:product_groups_list_aggregation_MTP-92796 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-92796
--comment: using MATERIALIZED for better query time MTP-92796
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_list_aggregation(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_groups_list_aggregation(input jsonb, jsonb, jsonb)
 RETURNS TABLE(pg_code integer, name character varying, special_classification character varying, selection_metadata json, updated_at timestamp with time zone, created_by character varying, created_at timestamp with time zone, updated_by character varying, product_count bigint, pg_count bigint, product_group_definitions jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_main_filter_cnt int := 0;
	_attr_filter_cnt int := 0;
	_filter_con text := ' ';
    _keys text[] := array['created_by','updated_by']::text[];
	_vals text[] := array[$2,$3]::text[];
	agregation_level text := '';
	begin
		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($1);
		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($2);
		select * from global.fetch_aggregation_level() into  agregation_level;
		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
		_query_table_filters := global.form_table_query($3);
	 	if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0 then
	 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pa || ') x JOIN "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
	 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $1));
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pm || ') x JOIN "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
	 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $1));
	 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pm || ') x JOIN (' || _query_pa || ') y on x.product_code = y.product_code join "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
		 end if;
 		_query_combine := '
		SELECT
		    b.pg_code,
		    b.name,
		    b.special_classification,
		    b.selection_metadata,
		    b.updated_at,
		    b.created_by,
		    b.created_at,
		    b.updated_by,
		    COALESCE(b.product_count, 0) AS product_count,
		    COALESCE(b.pg_count, 0) AS pg_count,
		    b.product_group_definitions
    FROM (
        WITH
        pgm_aggregated AS MATERIALIZED (
            SELECT pg_code, ref_pg_code, ' || agregation_level || '
            FROM global.product_groups_mapping
            JOIN global.product_attributes_filter paf USING (product_code)
            WHERE pg_code IS NOT NULL AND paf.active
            GROUP BY 1, 2, 3
        ),
        pgm_count AS MATERIALIZED (
            SELECT
                pg_code,
                COUNT(DISTINCT ref_pg_code) AS pg_count,
                COUNT(DISTINCT ' || agregation_level || ') AS product_count
            FROM pgm_aggregated
            GROUP BY pg_code
        ),
        filtered_user_data AS MATERIALIZED (
            SELECT user_code, name
            FROM global.user_master
            WHERE NOT is_deleted
        ),
        pg_data AS (
            SELECT
                pg_code,
                pg.name,
                special_classification,
                selection_metadata,
                updated_at,
                um.name AS created_by,
                created_at,
                umup.name AS updated_by
            FROM global.product_groups pg
            LEFT JOIN filtered_user_data um ON pg.created_by = um.user_code
            LEFT JOIN filtered_user_data umup ON pg.updated_by = umup.user_code
            WHERE is_deleted = false
        ),
        filtered_paf AS MATERIALIZED (
            ' || COALESCE(NULLIF(_query_pa, ''), 'SELECT * FROM global.product_attributes_filter WHERE active') || '
        ),
        pgm_data AS (
            SELECT pgm.pg_code
            FROM global.product_groups_mapping pgm
            JOIN filtered_paf x ON x.product_code = pgm.product_code
            GROUP BY pgm.pg_code
        ),
        pgd_data AS MATERIALIZED (
            SELECT
                pgdrm.pg_code,
                jsonb_agg(jsonb_build_object(''pgd_code'', pgd.pgd_code, ''name'', pgd.name)) AS product_group_definitions
            FROM (
                SELECT pg_code, pgd_code
                FROM global.product_group_definitions_rules_mapping
                WHERE pg_code IS NOT NULL
                GROUP BY 1, 2
            ) pgdrm
            JOIN (
                SELECT *
                FROM global.product_group_definitions
                WHERE is_deleted = false
            ) pgd ON pgdrm.pgd_code = pgd.pgd_code
            GROUP BY pgdrm.pg_code
        )
		SELECT
	        f.pg_code,
	        pg.name,
	        pg.special_classification,
	        pg.selection_metadata,
	        pg.updated_at,
	        pg.created_by,
	        pg.created_at,
	        pg.updated_by,
	        pgm.product_count,
	        pgm.pg_count,
	        pgd.product_group_definitions        FROM pgm_data f
        JOIN pg_data pg ON pg.pg_code = f.pg_code
        LEFT JOIN pgm_count pgm ON pg.pg_code = pgm.pg_code
        LEFT JOIN pgd_data pgd ON pg.pg_code = pgd.pg_code
    ) b ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
