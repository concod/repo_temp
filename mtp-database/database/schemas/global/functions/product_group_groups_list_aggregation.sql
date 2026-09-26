--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:product_group_groups_list_aggregation_bugfix runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:style_count_fix
--comment: fixed issue in count of articles in grouping screen
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_group_groups_list_aggregation(input jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION global.product_group_groups_list_aggregation(input jsonb, jsonb, jsonb, integer)
 RETURNS TABLE(pg_code integer, name character varying, special_classification character varying, selection_metadata json, updated_at timestamp with time zone, created_by character varying, created_at timestamp with time zone, updated_by character varying, product_count bigint, pg_count bigint, is_mapped boolean)
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
 		_query_combine := 'SELECT * FROM (
			select
				pg.*,
				case when pgm.product_count is null then 0 else pgm.product_count end as product_count,
				case when pgm.pg_count is null then 0 else pgm.pg_count end as pg_count,
				pgd.is_mapped
			from
				(
				select
					pg_code,
					pg.name,
					special_classification,
					selection_metadata,
					updated_at,
					um.name as created_by,
					created_at,
					umup.name as updated_by
				from
					"global".product_groups pg
				left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) um
 					on pg.created_by = um.user_code
				left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) umup
 					on pg.updated_by = umup.user_code
				where
					is_deleted = false and pg_code != '|| $4 || ' ) pg'
 			|| _filter_con ||
			'left join (
				select
					pg_code,
					count(distinct ' || agregation_level || ' ) as product_count,
					count(distinct ref_pg_code) as pg_count
				from
					"global".product_groups_mapping join (select product_code, ' || agregation_level || ' from global.product_attributes_filter where active) paf using (product_code)
				where
					pg_code is not null
				group by
					pg_code) pgm on
				pg.pg_code = pgm.pg_code
			left join (
				select
								pg_code,
								ref_pg_code,
								case when pg_code is null then false else true end as is_mapped
							from
								"global".product_groups_mapping
							where
								pg_code = ' || $4 || ' group by 1,2) pgd on
				pg.pg_code = pgd.ref_pg_code) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
