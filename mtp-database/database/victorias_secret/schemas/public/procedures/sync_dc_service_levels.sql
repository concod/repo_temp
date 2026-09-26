--liquibase formatted sql
--changeset Shaik.Azmathulla:sync_dc_service_levels runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-85247
--comment: DC to DC transfer - sync_dc_service_levels SP optimization
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_dc_service_levels();
CREATE OR REPLACE PROCEDURE public.sync_dc_service_levels()
LANGUAGE 'plpgsql'
AS $procedure$
DECLARE 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_service_levels';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	DROP TABLE IF EXISTS pdm_base;
	_st := clock_timestamp();

	CREATE TEMP TABLE pdm_base AS 
	 WITH filtered_dc AS (
		    SELECT dc_code, dc_code AS dc_code_alias, linked_store_code
		    FROM "global".distribution_centres
		    WHERE linked_store_code IN ('S073','S015','S003')
		),
		filtered_pm AS (
		    SELECT product_code, l0_id
		    FROM "global".product_attributes_filter
		    WHERE active = true
		),
		filtered_map AS (
		    SELECT product_code, dc_code
		    FROM "global".product_mapping_product_dc
		    WHERE validity && daterange(current_date, current_date, '[]')
		),base as 
		(
		SELECT f.product_code, d.dc_code_alias AS dc_code,d.linked_store_code,p.l0_id
		FROM filtered_map f
		JOIN filtered_pm p USING (product_code)
		JOIN filtered_dc d USING (dc_code)
		)
		SELECT product_code,dc_code
          FROM base
          WHERE NOT 
			          (linked_store_code = 'S015' AND upper(l0_id) LIKE '%VSB%') 
					 -- OR (linked_store_code = 'S003' AND upper(l0_id) NOT LIKE '%VSB%')		 
		 UNION ALL
		 
		 SELECT product_code,dc_code
         FROM base
         WHERE NOT 
			          --(linked_store_code = 'S015' AND upper(l0_id) LIKE '%VSB%') OR
			          (linked_store_code = 'S003' AND upper(l0_id) NOT LIKE '%VSB%')	;
					  
		CREATE INDEX idx_pdm_base_product_code on pdm_base USING btree (product_code);
		
		WITH eligible_products as (
            select product_code 
			from pdm_base 
            group by 1 
			having count(distinct dc_code) = 2
        )
		
	delete from inventory_smart.dc_service_levels dtc1 
	where not exists ( select 1 from eligible_products dfwl 
		where dtc1."hierarchy"->>'product_code'::varchar = dfwl.product_code );

  	raise notice 'DELETE dc_service_levels : %', (clock_timestamp() - _st);

	_st := clock_timestamp();

	 WITH dc_to_dc_base as (
        select * from pdm_base as a
        where exists
        (
            select 1 
            from (
                select product_code 
                from pdm_base 
                group by 1 having count(distinct dc_code) = 2
            ) as b
        where a.product_code = b.product_code
        )
    )
    
    ,eligible_products_v2 AS (
        SELECT product_code
        FROM dc_to_dc_base
        group by 1
    ),

    product_dc_combinations AS (
        SELECT product_code, dc_code as dc
        FROM dc_to_dc_base ep
        group by 1,2
    ),
    final_result AS (
        SELECT 
            pdc.product_code,
            pdc.dc,
            4 as target_wos,
			1 as min_stock	,
			'Service Level' as safety_stock_method,	
			null::int4 safety_stock_units,
			80 as service_level_percentage,
			null::int4 safety_stock_wos
            FROM product_dc_combinations pdc
    ),
    hierarchies_fetch AS (
        SELECT 
            product_code,
            jsonb_build_object(
                'size', "size", 
                'product_description', product_description,
                'article', article, 
                'l0_name', l0_name, 
                'l2_name', l2_name,
                'l3_name', l3_name, 
                'l4_name', l4_name, 
                'l5_name', l5_name, 
                'l6_name', l6_name, 
                'collection', collection,
                'product_code', product_code, 
                'masterstyle_descr', masterstyle_descr, 
                'product_lifecycle', product_lifecycle, 
                'subbrand_code_desc', subbrand_code_desc,
                'current_assortment_group', current_assortment_group,
                'flex_style',flex_style,
                'generic',generic,
                'sizes_mat',sizes_mat,
                'form',form,
                'user_defined_1',user_defined_1,
                'user_defined_2',user_defined_2,
                'user_defined_3',user_defined_3,
                'user_defined_4',user_defined_4,
                'user_defined_5',user_defined_5,
                'user_defined_6',user_defined_6
            ) AS "hierarchy"
        FROM "global".product_attributes_filter paf
        JOIN eligible_products_v2 ep USING (product_code)
        WHERE NOT is_deleted AND active
    ),
	 user_edited_combinations AS (
        SELECT 
            dsl."hierarchy"->>'product_code'::varchar AS product_code, 
            dc::int4 as dc, 
            safety_stock_method,
			safety_stock_units,
			service_level_percentage,
			safety_stock_wos,
            target_wos,
			min_stock,
            updated_by, 
            updated_at, 
            created_by, 
            created_at
        FROM inventory_smart.dc_service_levels dsl
        WHERE updated_by IS NOT NULL
    )

    INSERT INTO inventory_smart.dc_service_levels (
		  "hierarchy", dc,product_code, target_wos, min_stock,safety_stock_method,safety_stock_units,
		  service_level_percentage, safety_stock_wos, created_by, created_at, updated_by, updated_at
		) 
    SELECT 
        hf."hierarchy",
        fr.dc, 
        fr.product_code,
        COALESCE(uec.target_wos, fr.target_wos) AS target_wos,
        COALESCE(uec.min_stock, fr.min_stock) AS min_stock,
        COALESCE(uec.safety_stock_method, fr.safety_stock_method) AS safety_stock_method,
        COALESCE(uec.safety_stock_units, fr.safety_stock_units) AS safety_stock_units,
        COALESCE(uec.service_level_percentage, fr.service_level_percentage) AS service_level_percentage,
        COALESCE(uec.safety_stock_wos, fr.safety_stock_wos) AS safety_stock_wos,
        uec.created_by AS created_by,
        uec.created_at AS created_at,
        uec.updated_by AS updated_by,
        uec.updated_at AS updated_at
    FROM final_result fr
    LEFT JOIN user_edited_combinations uec
    USING (product_code, dc)
    JOIN hierarchies_fetch hf USING (product_code)
   	on conflict (product_code, dc)
   	DO UPDATE SET 
   	"hierarchy"=excluded."hierarchy",
   	target_wos = excluded.target_wos,
   	min_stock = excluded.min_stock,
   	safety_stock_method = excluded.safety_stock_method,
   	safety_stock_units = excluded.safety_stock_units,
   	service_level_percentage = excluded.service_level_percentage,
   	safety_stock_wos = excluded.safety_stock_wos,
   	created_by = excluded.created_by,
   	created_at = excluded.created_at,
   	updated_by = excluded.updated_by,
   	updated_at = excluded.updated_at;

	raise notice 'upsert-dc_service_levels : %', (clock_timestamp() - _st);

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$;
