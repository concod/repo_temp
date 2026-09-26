--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:product_groups_list_aggregation_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-33587
--comment: initial changeset for product_groups_list_aggregation_download
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_list_aggregation_download(input refcursor, jsonb, jsonb, jsonb, text[]);
CREATE OR REPLACE FUNCTION global.product_groups_list_aggregation_download(input refcursor, jsonb, jsonb, jsonb, text[])
 RETURNS refcursor
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
	_vals text[] := array[$3,$4]::text[];
    product_attribute_filter_array text[] := $5;
    product_attribute_filter_parameters text := '';
    product_attribute_filter_final_select text := '';
    val text := '';
	begin
		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($2);
		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($3);
        
        raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;

        FOREACH val IN ARRAY product_attribute_filter_array LOOP
            product_attribute_filter_final_select := product_attribute_filter_final_select || 'pgm.' || val || ' AS ' || val || ', ';
            product_attribute_filter_parameters := product_attribute_filter_parameters || val || ', ';
        END LOOP;

        product_attribute_filter_final_select := LEFT(product_attribute_filter_final_select, LENGTH(product_attribute_filter_final_select) - 2);
        product_attribute_filter_parameters := LEFT(product_attribute_filter_parameters, LENGTH(product_attribute_filter_parameters) - 2);

        raise notice '%,%', product_attribute_filter_final_select, product_attribute_filter_parameters;

		_query_table_filters := global.form_table_query($4);
	 	if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0 then
	 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pa || ') x JOIN "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
	 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $2));
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pm || ') x JOIN "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
	 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $2));
	 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pm || ') x JOIN (' || _query_pa || ') y on x.product_code = y.product_code join "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
		 end if;
        
 		_query_combine := 'SELECT * FROM (
			select
				pg.name as name, pg.special_classification as special_classification, created_at, updated_at, created_by, updated_by, ' || product_attribute_filter_final_select || '
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
					pg_code, ' || product_attribute_filter_parameters || '
				from
					"global".product_groups_mapping join (select product_code, ' || product_attribute_filter_parameters || ' from global.product_attributes_filter where active) paf using (product_code)
				where
					pg_code is not null
                group by pg_code,' || product_attribute_filter_parameters || ') pgm on
				pg.pg_code = pgm.pg_code) X ' || _query_table_filters;
		raise notice '%',_query_combine;
        open $1 for execute _query_combine;
        return $1;
	end $function$
;