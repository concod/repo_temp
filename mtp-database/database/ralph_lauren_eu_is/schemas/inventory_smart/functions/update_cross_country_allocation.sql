
--liquibase formatted sql
--changeset kailash:update_cross_country_allocation stripComments:false splitStatements:false runOnChange:true context:MTP-64175 labels:MTP-64175
--comment: MTP-64175 update_cross_country_allocation
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_cross_country_allocation(refcursor, jsonb, jsonb, jsonb, text, int4, text);
CREATE OR REPLACE FUNCTION inventory_smart.update_cross_country_allocation(input refcursor, jsonb, jsonb, jsonb, text, integer, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_channel text[] := inventory_smart.get_channel_from_input_new($3);
	_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
	_l0_name_updated text := ''; 
	_query_combine_format text := '';
	_query_pa text := '';
  	_query_sa text := '';
  	_table_query text := '';
  	_ph_data text;
  	_select_1 text := 'select 1 as success';
begin
	_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
	--raise notice ' _query_pa : % ', _query_pa ;
	_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
	--raise notice ' _query_sa : %  ', _query_sa ;
	_table_query := global.form_table_query($4);
	--raise notice ' _table_query : %  ', _table_query ;
	select 'any('''|| concat(_l0_name) ||'''::varchar[])' into _l0_name_updated;
	select replace(_table_query, 'WHERE', 'AND') into _table_query;
	
	raise notice '_channel : %',_channel[1];
	raise notice '_l0_name : %',_l0_name;
	
	_ph_data := '
		with ph_temp as materialized (
				select * from
				inventory_smart.ph_master ph '|| _query_pa ||'
					'|| _table_query ||'
				)
				-- select * from ph_temp
				
			,saf as materialized (
				select array_agg(store_code) as store_codes FROM "global".store_attributes_filter '|| _query_sa || '
			)
			,product_store_mapping as (
				select ph_code, channel,
				(
					select array_agg(distinct store_code) from global.product_mapping_product_store 
					WHERE (l0_name::varchar = '||_l0_name_updated||') and is_active = true and product_code = ANY (ph.product_codes)
					and store_code = any(saf.store_codes)
				) as store_codes
				from ph_temp ph cross join saf
			)
			-- select * from product_store_mapping
			,ph_data as (
						select ph_code, channel from product_store_mapping
						WHERE channel='''||_channel[1]||'''
			)
			-- select * from ph_data		
   		';

	
	if $7 ilike 'record_count' then 
	_query_combine_format ='
		'||_ph_data||'
		select jsonb_build_object(''record_count'', record_count , ''sku_count'', record_count) as count from 
		(select count(distinct ph_code)  record_count from ph_data) x
	';
	end if;

	if $7 ilike 'insert_update' then
	_query_combine_format='
		'||_ph_data||'
		, upsert_data AS (
		    SELECT ph_code, channel, now() as created_at, now() as updated_at , '||$6||' as created_by, '||$6||' as updated_by,  '''|| $5 ||''' AS cross_country_allocation
		    FROM ph_data 
		)

		INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel, created_at, updated_at, created_by, updated_by, cross_country_allocation)
		SELECT ph_code,channel,created_at, updated_at, created_by, updated_by, cross_country_allocation
		FROM upsert_data
		ON CONFLICT (ph_code,channel)
		DO UPDATE SET
    		updated_at = EXCLUDED.updated_at,
			updated_by = EXCLUDED.updated_by,
    		cross_country_allocation = EXCLUDED.cross_country_allocation;

	';
	end if;
	
	raise notice ' _query_combine_format : %  ', _query_combine_format ;

	if $7 ilike 'record_count' then 
		OPEN $1 FOR EXECUTE _query_combine_format;
	   	return $1;
	else
		EXECUTE _query_combine_format;
		OPEN $1 FOR EXECUTE _select_1;
		return $1;
   	end if;

end;
$function$
;
