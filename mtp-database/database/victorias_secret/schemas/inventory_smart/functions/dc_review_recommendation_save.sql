--liquibase formatted sql
--changeset liquibase:common_dc_review_recommendation_save runOnChange:true stripComments:false splitStatements:false context:MTP-94769 labels:MTP-94769
--comment: DC Review Recommendation save SP updated to handle attributes fields.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_review_recommendation_save(refcursor, jsonb, jsonb, text, uuid, integer);

CREATE OR REPLACE FUNCTION inventory_smart.dc_review_recommendation_save(reviewed_articles jsonb, _dc_transfer_code uuid, user_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    article_record jsonb;
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    v_transfer_number text;
    v_config JSONB;
    v_default_ticket_type TEXT;
BEGIN

    /*
    {
      [
            {
                "article": "123456",
                "product_code": "123456", 
                "source_dc": "1001",
                "destination_dc": "1002",
                "source_dc_code": 1001,
                "destination_dc_code": 1002,
                "transfer_units": 10,
                "source_dc_oh_initial": 100,
                "source_dc_wos_after": 10,
                "destination_dc_wos_after": 10,
				"ticket_type": "10_Regular Business",
                "l0_name": "PINK_PINK"
            }
        ],
        "status_code": 1,
        "_dc_transfer_code": "1234567890",
        "user_id": 1
    }
    */

-- Fetch default config for ticket_type
SELECT attribute_value
INTO v_config
FROM global.tenant_attribute_master
WHERE name = 'dc_review_recommendation_config' AND status = TRUE;
v_default_ticket_type := COALESCE(v_config->>'default_ticket_type', '10_Regular Business');

for article_record in select jsonb_array_elements(reviewed_articles)
    LOOP
        -- Create transfer number using the specified format, handle case where l0_name might be missing
        v_transfer_number := CASE 
            WHEN article_record->>'l0_name' IS NOT NULL THEN
                'DC_Transfer_6_' || user_id::text || '_' || 
                (article_record->>'l0_name') || '_' || 
                to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS')
            ELSE NULL
        END;

        INSERT INTO inventory_smart.dc_review_recommendation_updated (
            article,
            product_code,
            source_dc,
            destination_dc,
            transfer_units,
            created_by,
            dc_transfer_code,
            status_code,
            source_adj_wos,
            destination_adj_wos,
            transfer_number,
            source_cata_before_transfer,
			"attributes"
        ) VALUES (
            article_record->>'article',
            article_record->>'product_code',
            (article_record->>'source_dc_code')::integer,
            (article_record->>'destination_dc_code')::integer,
            (article_record->>'transfer_units')::integer,
            user_id,
            _dc_transfer_code,
            1, -- status_code = NOT_APPROVED
            (article_record->>'source_dc_wos_after')::integer,
            (article_record->>'destination_dc_wos_after')::integer,
            v_transfer_number,
            (article_record->>'source_dc_oh_initial')::integer,
            jsonb_build_object('ticket_type', COALESCE((article_record->'attributes'->>'ticket_type'), v_default_ticket_type)) 
        ) ON CONFLICT (dc_transfer_code, product_code, source_dc, destination_dc)
           DO UPDATE SET 
            transfer_units = EXCLUDED.transfer_units,
            source_adj_wos = EXCLUDED.source_adj_wos,
            destination_adj_wos = EXCLUDED.destination_adj_wos,
            transfer_number = EXCLUDED.transfer_number,
            source_cata_before_transfer = EXCLUDED.source_cata_before_transfer,
			"attributes" = EXCLUDED."attributes";
    END LOOP;

    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'inventory_smart.dc_review_recommendation_save',
        'Operation completed',
        NULL,
        jsonb_build_object(
            'reviewed_articles', reviewed_articles,
            'dc_transfer_code', _dc_transfer_code,
            'user_id', user_id)
    );

END
$function$
;
