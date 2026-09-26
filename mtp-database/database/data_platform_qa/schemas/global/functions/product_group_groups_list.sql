--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:product_group_groups_list_MTP-51170 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49966,MTP-51170
--comment: added created_by, created_at, updated_at to select product_group_groups_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_group_groups_list(input jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION global.product_group_groups_list(input jsonb, jsonb, jsonb, integer)
 RETURNS TABLE(pg_code integer, name character varying, product_count bigint, special_classification character varying, created_by character varying, updated_by character varying, created_at timestamptz, updated_at timestamptz, is_mapped boolean)
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
 		_query_combine := 'SELECT 
				pg_code,
				name,
				product_count,
				special_classification,
				created_by,
				updated_by,
				created_at,
				updated_at,
				is_mapped FROM (
			select
				pg.*,
				pgm.is_mapped
			from
				(
				select
					pgmain.pg_code,
					pgmain.name,
					pgmain.special_classification,
					um1.name as created_by,
					um2.name as updated_by,
					pgmain.created_at,
					pgmain.updated_at,
					count(distinct pgmmain.product_code) as product_count
				from
					"global".product_groups pgmain 
				join
					"global".product_groups_mapping pgmmain
				on pgmain.pg_code = pgmmain.pg_code
				left join
					"global".user_master um1
				on pgmain.created_by = um1.user_code
				left join
					"global".user_master um2
				on pgmain.updated_by = um2.user_code
				where
					pgmain.is_deleted = false and pgmain.pg_code != ' || $4 || ' group by 1,4,5) pg'
 			|| _filter_con ||
			'left join (
				select
					pg_code,
					ref_pg_code,
					case when pg_code is null then false else true end as is_mapped
				from
					"global".product_groups_mapping
				where
					pg_code = ' || $4 || ' group by 1,2
				) pgm on
				pg.pg_code = pgm.ref_pg_code
) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
