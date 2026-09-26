--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:product_groups_list_download_MTP-43487 runOnChange:true stripComments:false splitStatements:false context:MTP-43487 labels:MTP-43487
--comment: initial changeset for product_groups_list_download
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_list_download(input refcursor, jsonb, jsonb, jsonb, text[]);
CREATE OR REPLACE FUNCTION global.product_groups_list_download(input refcursor, jsonb, jsonb, jsonb, text[])
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
	_pg_codes_query text := ''; 
	_pg_codes text[];
	_pg_codes_list text;
	product_attribute_filter_array text[] := $5;
    product_attribute_select_parameters text := '';
    val text := '';
	begin
		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($2);
		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($3);
		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
		_query_table_filters := global.form_table_query($4);
	
		FOREACH val IN ARRAY product_attribute_filter_array LOOP
            product_attribute_select_parameters := product_attribute_select_parameters || val || ', ';
        END LOOP;
       
        product_attribute_select_parameters := LEFT(product_attribute_select_parameters, LENGTH(product_attribute_select_parameters) - 2);
        
       _filter_con := ' JOIN (SELECT pg_code, product_code from "global".product_groups_mapping) pgm on pg.pg_code = pgm.pg_code
							JOIN ( select '|| product_attribute_select_parameters ||' from global.product_attributes_filter) attributes on attributes.product_code = pgm.product_code';
	 	
		if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0 then
	 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
	 		_pg_codes_query := 'select array(select distinct pg.pg_code
									from global.product_groups pg 
									join (select pgm.product_code, pgm.pg_code  from (select pg_code, product_code from global.product_groups_mapping) pgm join (' || _query_pa || ') attributes on pgm.product_code = attributes.product_code) x
									on x.pg_code = pg.pg_code
									where pg.is_deleted = false)';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
	 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $2));
	 		_pg_codes_query := 'select array(select distinct pg.pg_code
									from global.product_groups pg 
									join (select pgm.product_code, pgm.pg_code  from (select pg_code, product_code from global.product_groups_mapping) pgm join (' || _query_pm || ') attributes on pgm.product_code = attributes.product_code) x
									on x.pg_code = pg.pg_code
									where pg.is_deleted = false)';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
	 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $2));
	 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
	 		_pg_codes_query := 'select array(select distinct pg.pg_code
									from global.product_groups pg 
									join (select pgm.product_code, pgm.pg_code  from (select pg_code, product_code from global.product_groups_mapping) pgm join (select px.product_code product_code from(' || _query_pm || ') px JOIN (' || _query_pa || ') py on px.product_code = py.product_code) attributes on pgm.product_code = attributes.product_code) x
									on x.pg_code = pg.pg_code
									where pg.is_deleted = false)';
		 end if;
		raise notice '_pg_codes_query is: %',_pg_codes_query;
		raise notice 'filter_con is: %',_filter_con;
	
		execute _pg_codes_query into _pg_codes;
		_pg_codes_list := '(' || array_to_string(_pg_codes, ',') || ')';
		
 		_query_combine := 'SELECT * FROM (
			select
				pg.*,
				attributes.*
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
					is_deleted = false and pg_code in '|| _pg_codes_list ||') pg'
 			|| _filter_con ||
			') X ' || _query_table_filters;
		raise notice '%',_query_combine;
		open $1 for execute _query_combine;
        return $1;
	end $function$
;
