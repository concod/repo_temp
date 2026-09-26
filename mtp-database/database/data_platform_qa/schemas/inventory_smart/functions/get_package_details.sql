--liquibase formatted sql
--changeset liquibase:get_package_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_package_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_package_details(input refcursor, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.get_package_details(input refcursor, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: inventory_smart.get_package_details
 * Created by: Renugopal S
 * Created at: 01-Jun-2023
 * No of input parameter: 4
 * Parameter Description : $1 = Allocation Code
 *                         $2 = Article
 * 						   $3 = Store code (optional)

 * Purpose: This function been created to GET THE CURRENT PACK DETAILS OF AN ARTICLE
 * Calling Statement:

	begin;
	select * from inventory_smart.get_package_details('my_cur'::refcursor,
	'3_ZALES_20220826T101231',
	'20125637', 
	'D.1682');
	FETCH ALL IN "my_cur";
	commit;

 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * 
 */
declare
	_query_pm text := '';
	_store_filter text := '';

	_query_pa text := '';
	_date_range text:= '';
--	_pa_input jsonb;
	_query_table_filters text := '';
	_query_combine text;

	begin
		if ($4 = '') IS false
		then
			_store_filter := ' WHERE store = '''|| $4 ||'''   ';
		end if;

		_query_combine := '		
		WITH pack_configuration AS (
		    SELECT
		        article,
		        pack_type AS pack_id,
		        size,
		        units_in_pack
		    FROM inventory_smart.dc_pack_configuration dpc
		    GROUP BY 1, 2, 3, 4
		)
		--select * from pack_configuration;
		,
		
		allocation_results as (
		select
			*,
			SUM(pack_allocated_qty) over (partition by article,
			pack_id,
			dc) as total_allocated_packs
		from
			(
			select
				article,
				store,
				dc,
				TRIM( both ''""'' from (JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_allocated''))::character varying) as pack_id,
				(JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_allocated_qty''))::int as pack_allocated_qty,
				(JSONB_ARRAY_ELEMENTS(pack_dc_allocation->dc->''packs_available_qty''))::int as initial_packs_available
			from
				(
				select
					article,
					store,
					JSONB_OBJECT_KEYS(pack_dc_allocation) as dc,
					pack_dc_allocation
				from
					inventory_smart.create_allocation_result_flat_gurobi carfg
				where
					allocation_code = '''|| $2 ||'''
					and article = '''|| $3 ||'''
				group by
					1,
					2,
					3,
					4
		        ) as foo
			group by
				1,
				2,
				3,
				4,
				5,
				6
		    ) temp
		)
		--select * from allocation_results;
		,
		total_packs AS (
		    SELECT article, dc, pack_id, SUM(initial_packs_available) as total_packs_available
		    FROM (
		        SELECT article, dc, pack_id, AVG(initial_packs_available) AS initial_packs_available
		        FROM allocation_results
		        GROUP BY 1, 2, 3
		    ) temp
		    GROUP BY 1, 2, 3
		)
		--select * from total_packs;
		,
		long_result AS(
		    SELECT
		        a.article,
		        a.store,
		        a.dc,
		        CASE WHEN pack_id LIKE ''PPACK%'' THEN a.pack_id ELSE ''eaches'' END AS pack_id,
		        coalesce (size, pack_id) as size,
		        coalesce ( units_in_pack, 1) as units_in_pack, --default one unit in a pack
		        a.pack_allocated_qty AS allocated_packs,
		        coalesce ( (a.pack_allocated_qty * units_in_pack), a.pack_allocated_qty) AS allocated_units,
		        (c.total_packs_available - a.total_allocated_packs) AS packs_available,
		        coalesce ( ((c.total_packs_available - a.total_allocated_packs) * units_in_pack), (c.total_packs_available - a.total_allocated_packs)) AS units_available
		    FROM allocation_results a
		    LEFT JOIN pack_configuration b USING(article, pack_id)
		    LEFT JOIN total_packs c USING(article, pack_id, dc)
		    ORDER BY article
		)
		--select * from long_result;
		
		SELECT pack_id,
				 store, dc as dc_code, name as dc_name,
		       CASE WHEN pack_id = ''eaches'' THEN JSON_OBJECT_AGG(size, allocated_units)
		            ELSE JSON_OBJECT_AGG(size, units_in_pack) END as pack_config,
			   MAX(allocated_packs) AS allocated_packs, MAX(packs_available) AS packs_available,
			   SUM(allocated_units) AS allocated_units, SUM(units_available) AS units_available,
			   JSON_OBJECT_AGG(size, units_available) as each_available,
		       SUM(units_in_pack) AS units_in_pack
		FROM long_result
		left join "global".distribution_centres dc on dc = dc_code::text
		 '|| _store_filter ||'
		GROUP BY pack_id, store, dc, name'
	
		
		;
		raise notice '%',  _query_combine;
		OPEN $1 FOR execute _query_combine;  
			RETURN $1;
 	end
   $function$
;
