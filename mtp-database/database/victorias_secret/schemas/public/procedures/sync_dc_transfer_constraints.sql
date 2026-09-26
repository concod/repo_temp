--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_dc_transfer_constraints runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-59895
--comment: SP Update 
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_dc_transfer_constraints();
CREATE OR REPLACE PROCEDURE public.sync_dc_transfer_constraints()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_transfer_constraints';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    delete from inventory_smart.dc_transfer_constraints dtc1 
	where not exists (
        with base as (
            select product_code,dc.dc_code,dc.linked_store_code,pm.l0_id
            from "global".product_mapping_product_dc a
            join  "global".product_attributes_filter pm 
            using(product_code)
            join "global".distribution_centres dc using(dc_code)
            where validity && daterange(current_date, current_date, '[]')
            and pm.active and dc.linked_store_code in ('S073','S015','S003')
        )
        
        ,pdm_base as 
        (SELECT product_code,dc_code
          FROM base
          WHERE NOT (
          (linked_store_code = 'S015' AND upper(l0_id) LIKE '%VSB%') OR
          (linked_store_code = 'S003' AND upper(l0_id) NOT LIKE '%VSB%')
           ))
           
        ,eligible_products as (
            select product_code 
            from pdm_base 
            group by 1 having count(distinct dc_code) = 2
        )

    	select 1 from eligible_products dfwl
    	where dtc1."hierarchy"->>'product_code'::varchar = dfwl.product_code
	);

   WITH user_edited_combinations AS (
        SELECT 
            dtc."hierarchy"->>'product_code'::text AS product_code, 
            source_dc::int4 as source_dc, 
            destination_dc::int4 as destination_dc,
            min_transfer_quantity,            
            updated_by, 
            updated_at, 
            created_by, 
            created_at
        FROM inventory_smart.dc_transfer_constraints dtc         
        WHERE updated_by IS NOT NULL
        )

        ,base as (
            select product_code,dc.dc_code,dc.linked_store_code,pm.l0_id
            from "global".product_mapping_product_dc a
            join  "global".product_attributes_filter pm 
            using(product_code)
            join "global".distribution_centres dc using(dc_code)
            where validity && daterange(current_date, current_date, '[]')
            and pm.active and dc.linked_store_code in ('S073','S015','S003')
        )
        
        ,pdm_base as 
        (SELECT product_code,dc_code
          FROM base
          WHERE NOT (
          (linked_store_code = 'S015' AND upper(l0_id) LIKE '%VSB%') OR
          (linked_store_code = 'S003' AND upper(l0_id) NOT LIKE '%VSB%')
           )
         )
    
    ,dc_to_dc_base as (
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
    
    ,eligible_products AS (
        SELECT product_code
        FROM dc_to_dc_base
        group by 1
    )

    ,product_dc_combinations AS (
        SELECT 
        a.product_code,
        a.dc_code AS source_dc,
        b.dc_code AS destination_dc
        FROM dc_to_dc_base a
        JOIN dc_to_dc_base b 
        ON a.product_code = b.product_code
        WHERE a.dc_code <> b.dc_code
    )
    ,final_result AS (
        SELECT 
            pdc.product_code,
            pdc.source_dc,
            pdc.destination_dc,
            10 as min_transfer_quantity            
        FROM product_dc_combinations pdc
    )
    ,hierarchies_fetch AS (
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
                'current_assortment_group',current_assortment_group,
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
        JOIN eligible_products ep USING (product_code)
        WHERE NOT is_deleted AND active
    )
    INSERT INTO inventory_smart.dc_transfer_constraints (
		  "hierarchy",product_code, source_dc, destination_dc, min_transfer_quantity, 
		  created_by, created_at, updated_by, updated_at
		) 
    SELECT 
        hf."hierarchy",
        fr.product_code,
        fr.source_dc, 
        fr.destination_dc, 
        COALESCE(uec.min_transfer_quantity, fr.min_transfer_quantity) AS min_transfer_quantity,
        uec.created_by AS created_by,
        uec.created_at AS created_at,
        uec.updated_by AS updated_by,
        uec.updated_at AS updated_at
    FROM final_result fr
    LEFT JOIN user_edited_combinations uec
    USING (product_code,source_dc,destination_dc)
    JOIN hierarchies_fetch hf USING (product_code)
   	on conflict (product_code,source_dc, destination_dc)
   	DO UPDATE SET 
   	"hierarchy"=excluded."hierarchy",
   	min_transfer_quantity = excluded.min_transfer_quantity,
   	created_by = excluded.created_by,
   	created_at = excluded.created_at,
   	updated_by = excluded.updated_by,
   	updated_at = excluded.updated_at
   ;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
   	end
$procedure$
;
