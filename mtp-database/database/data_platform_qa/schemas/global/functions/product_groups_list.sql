--liquibase formatted sql
--changeset chaitanyaprasad.reddy:MTP-23994 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-23994
--comment: updated product_groups_list 3 params SP to send created by, updated by as user name instead of user code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_list(input integer);
CREATE OR REPLACE FUNCTION global.product_groups_list(input integer)
 RETURNS TABLE(pg_code integer, name character varying, special_classification character varying, selection_metadata json, product_count bigint, pg_count bigint, product_group_definitions jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_combine text := '';
	begin
 		_query_combine := '
			select
				pg.*,
				pgm.product_count,
				pgm.pg_count,
				pgd.product_group_definitions
			from
				(
				select
					pg_code,
					name,
					special_classification,
					selection_metadata
				from
					"global".product_groups
				where
					is_deleted = false
					and pg_code = ' || $1 || ') pg
			left join (
				select
					pg_code,
					count(distinct product_code) as product_count,
					count(distinct ref_pg_code) as pg_count
				from
					"global".product_groups_mapping
				where
					pg_code = ' || $1 || '
				group by
					pg_code) pgm on
				pg.pg_code = pgm.pg_code
			left join (
				select
					pgdrm.pg_code,
					jsonb_agg(jsonb_build_object(''pgd_code'', pgd.pgd_code, ''name'', pgd.name)) as product_group_definitions
				from
					(
					select
						pg_code,
						pgd_code
					from
						"global".product_group_definitions_rules_mapping
					where
						pg_code = ' || $1 || ' group by 1,2) pgdrm
				join (
					select
						*
					from
						"global".product_group_definitions
					where
						is_deleted = false)
			pgd on
					pgdrm.pgd_code = pgd.pgd_code
				group by
					pgdrm.pg_code) pgd on
				pg.pg_code = pgd.pg_code';
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;

DROP FUNCTION IF EXISTS global.product_groups_list(jsonb,jsonb,jsonb);
CREATE OR REPLACE FUNCTION global.product_groups_list(input jsonb, jsonb, jsonb)
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
	begin
		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($1);
		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($2);
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
				pgd.product_group_definitions
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
					is_deleted = false) pg'
 			|| _filter_con ||
			'left join (
				select
					pg_code,
					count(distinct product_code) as product_count,
					count(distinct ref_pg_code) as pg_count
				from
					"global".product_groups_mapping
				where
					pg_code is not null
				group by
					pg_code) pgm on
				pg.pg_code = pgm.pg_code
			left join (
				select
					pgdrm.pg_code,
					jsonb_agg(jsonb_build_object(''pgd_code'', pgd.pgd_code, ''name'', pgd.name)) as product_group_definitions
				from
					(
					select
						pg_code,
						pgd_code
					from
						"global".product_group_definitions_rules_mapping
					where
						pg_code is not null group by 1,2) pgdrm
				join (
					select
						*
					from
						"global".product_group_definitions
					where
						is_deleted = false)
			pgd on
					pgdrm.pgd_code = pgd.pgd_code
				group by
					pgdrm.pg_code) pgd on
				pg.pg_code = pgd.pg_code) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
