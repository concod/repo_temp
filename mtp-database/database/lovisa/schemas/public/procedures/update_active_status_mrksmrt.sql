--liquibase formatted sql
--changeset rohankumar.sinha@impactanalytics.co:update_active_status_mrksmrt() runOnChange:true stripComments:false splitStatements:false context:lovisa_inv_smart labels:update_active_status_mrksmrt()
--comment: Changeset for update_active_status_mrksmrt()
--rollback: SELECT 1

DROP PROCEDURE if exists public.update_active_status_mrksmrt();

CREATE OR REPLACE PROCEDURE public.update_active_status_mrksmrt()
LANGUAGE plpgsql
AS $procedure$
DECLARE
    _log_code  varchar := gen_random_uuid();
    _sp_name   varchar := 'public.update_active_status_mrksmrt';
    _log_step  varchar;
    _st        TIMESTAMP := clock_timestamp();
    _rcl_hash  text;
    _worker    text;
	_latest_version Int4;
BEGIN

    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN

        SELECT global.get_table_version('price_markdown.marksmart_product_master_version')
    	INTO _latest_version;
		
--		DROP TABLE IF EXISTS public.tmp_inactive_prd_id_final;
--
--		CREATE TABLE public.tmp_inactive_prd_id_final AS 
    --  Compute inactive products and update ALL rows of latest version
	    WITH inactive_prd_id AS (
	        WITH possible_currencies AS (
	            SELECT country_id, COUNT(DISTINCT currency_id) AS possible_cnt
	            FROM (
	                SELECT 
	                    country_id,
	                    UNNEST(ARRAY[currency_id, dominating_currency_id, default_currency_id]) AS currency_id
	                FROM global.tb_country_currency_mapping
	            ) t
	            GROUP BY 1
	        ),
	        capped_final AS (
	            SELECT product_id, country_id, stat_id,
	                   COUNT(DISTINCT currency_id) AS real_cnt
	            FROM price_markdown.tb_applicable_mkd_price_points
	            GROUP BY 1,2,3
	        ),
	        filter_comb AS (
	            SELECT ft.product_id, ft.country_id, ft.stat_id
	            FROM capped_final ft
	            LEFT JOIN possible_currencies tcm
	              ON tcm.country_id = ft.country_id
	            WHERE possible_cnt = real_cnt
	        ),
	        price_points_final AS (
	            SELECT ap.*
	            FROM price_markdown.tb_applicable_mkd_price_points ap
	            INNER JOIN filter_comb f
	              ON f.product_id = ap.product_id
	             AND f.country_id = ap.country_id
	             AND f.stat_id = ap.stat_id
	        )
	        
	        SELECT DISTINCT product_id
	        FROM (
	            -- Missing valid price point combinations
	            SELECT ap.product_id
	            FROM price_markdown.tb_applicable_mkd_price_points ap
	            LEFT JOIN price_points_final f
	              ON ap.product_id = f.product_id
	             AND ap.country_id = f.country_id
	            WHERE f.product_id IS NULL
	
	            UNION
	
	            -- Missing MSRP
	            SELECT product_id
	            FROM price_markdown.tb_product_store_price
	            WHERE msrp IS NULL
	
	            UNION
	
	            -- Invalid cost
	            SELECT product_id
	            FROM price_markdown.tb_product_store_price
	            WHERE cost = 0
	            
	            UNION
	            
	            -- missing products in tb_simulation_week_mkd
	            select distinct pm.product_id
				FROM price_markdown.product_master pm
				WHERE NOT EXISTS (
				    SELECT 1
				    FROM price_markdown_opt.tb_simulation_week_mkd sm
				    WHERE sm.product_id = pm.product_id
				    )
	        ) x
	    ),
		
		inactive_prd_id_final as 
		( Select *, false as active, 0 as is_active from inactive_prd_id)
		
		UPDATE price_markdown.marksmart_product_master_version a
        SET 
            active = CASE 
                        WHEN b.active is not null then b.active
                        ELSE a.active 
                     END,
            is_active = CASE 
                            WHEN b.is_active is not null then b.is_active
                            ELSE a.is_active 
                        END
		FROM inactive_prd_id_final b
	    WHERE a.product_id = b.product_id AND a.version_code = _latest_version;


        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'end',
            NULL,
            (clock_timestamp() - _st)::text,
            NULL
        );

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                _log_step,
                SQLERRM,
                (clock_timestamp() - _st)::text,
                NULL
            );
            RAISE EXCEPTION
                'Error occurred in the procedure: %',
                SQLERRM;
    END;

END;
$procedure$
;

