--liquibase formatted sql
--changeset surya.kuruvadi@impactanalytics.co:MTP-113480 runOnChange:true stripComments:false splitStatements:false context:MTP-113480 labels:MTP-113480
--comment: MTP-47654, add change: upload_flag column , MTP-113480
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.store_capacity_configuration(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.store_capacity_configuration(input refcursor, jsonb, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
    _query_combine_format text := '';
    _query_combine_count_format text := '';
    _ph_sort text;
    _ph_search text;
    _overall_search text;
    _limit int;
    _offset int;
    _sub_limit int;
    _sub_offset int;
    _dummy text;
    _sa_search text;
    _formatter jsonb;
   	_sa_sort text;
   	_suc_search text;
   	_suc_sort text;
	_query_pa text;
   	_query_sa text;

	begin
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _dummy, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
       	SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_unit_capacity', 'inventory_smart') INTO _dummy, _suc_search, _dummy, _dummy, _dummy, _dummy, _dummy;
		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);

       	_ph_sort = inventory_smart.generate_sort_clause($4, 'product_attributes_filter', 'global');
		_sa_sort = inventory_smart.generate_sort_clause($4, 'store_attributes_filter', 'global');
		_suc_sort = inventory_smart.generate_sort_clause($4, 'store_unit_capacity', 'inventory_smart');

		if TRIM(BOTH ' ' FROM _sa_sort) != '' and TRIM(BOTH ' ' FROM _suc_sort) != '' then
			_suc_sort := ','||TRIM(BOTH 'ORDER BY' FROM _sa_sort);
		end if;

        _query_combine_count_format := $$
            SELECT COUNT(*)
            FROM
            (
                SELECT * FROM global.product_attributes_filter {_query_pa} {_ph_search}
                {limit_final}
            ) sq
        $$;

		IF TRIM(BOTH ' ' FROM _ph_sort) = '' and TRIM(BOTH ' ' FROM _sa_sort) = '' and TRIM(BOTH ' ' FROM _suc_sort) = '' and THEN
       		_suc_sort := 'order by product_hierarchy, store_code desc';
       		_ph_sort := 'order by l3_name, l1_name desc';
    	END IF;

       _query_combine_format := $$
            WITH paf as (
				select l3_name, l1_name from global.product_attributes_filter
				{_query_pa}
				{_ph_search}
				group by 1, 2
				{_ph_sort}
                {limit_final}
            )
            , saf as (
                select store_code,store_name, channel, retail_facility_code FROM global.store_attributes_filter
                {_query_sa}
                {_sa_search}
            )
			, excess_inv as (
            	select
				{limit} "limit",
				{offset} "offset",
				{sub_limit} sub_limit,
				--ROW_NUMBER () OVER () as sub_offset,
				paf.l3_name,
				saf.channel,
				saf.retail_facility_code,
				saf.store_code,
				saf.store_name,
				suc.unit_capacity as capacity,
				suc.product_hierarchy as capacity_level,
				suc.upload_flag,
				TO_CHAR((suc.updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'US/Eastern', 'MM-DD-YYYY HH:MI:SS') AS updated_at,
				um.name as updated_by
				FROM paf
				LEFT join inventory_smart.store_unit_capacity suc ON paf.l3_name = suc.product_hierarchy
				left join saf ON saf.store_code = suc.store_code 
				left join global.user_master um on (um.user_code = suc.updated_by)
				where saf.store_code IS NOT null and paf.l3_name is not null
				{_suc_search}
				{_sa_sort}
				{_suc_sort}
            	{sub_limit_final}
			)
			, result as (
				SELECT *,
					   CONCAT(capacity_level, store_code) key,
					   {sub_offset} + ROW_NUMBER () OVER () as sub_offset,
					   {limit} "limit",
					   {offset} "offset",
					   {sub_limit} sub_limit
				FROM excess_inv
				ORDER BY sub_offset
			)
			SELECT {select} FROM result
        $$;
       	
		_formatter = json_build_object(
			'_query_pa', _query_pa,
            '_query_sa', _query_sa,
            '_ph_search', _ph_search,
            '_sa_search', _sa_search,
            'limit', _limit,
            'sub_limit', _sub_limit,
            'offset', _offset,
            'sub_offset', _sub_offset,
            '_ph_sort', _ph_sort,
            '_sa_sort', _sa_sort,
            '_suc_search', _suc_search,
            '_suc_sort', _suc_sort
        );
       
       raise notice '_query_combine_format %', _query_combine_format;
       
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;
