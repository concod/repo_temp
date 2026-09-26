--liquibase formatted sql
--changeset liquibase:verify_otp_complete runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added back function for verify otp flow
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.verify_otp_complete(p_user_id bigint, p_purpose character varying, p_otp_code character varying);
CREATE OR REPLACE FUNCTION global.verify_otp_complete(p_user_id bigint, p_purpose character varying, p_otp_code character varying)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_challenge_record RECORD;
    v_computed_hash BYTEA;
    v_is_valid BOOLEAN := false;
    v_remaining_attempts INTEGER;
    v_result JSON;
BEGIN
    -- Combined query: Get user and challenge details in single operation
    SELECT 
        oc.id, oc.otp_hash, oc.otp_salt, oc.attempts, oc.expires_at, oc.used_at,
        mp.max_attempts, um.user_code
    INTO v_challenge_record
    FROM global.user_master um
    JOIN global.otp_challenges oc ON oc.user_id = um.user_code
    JOIN global.mfa_policies mp ON oc.policy_id = mp.id
    WHERE um.user_code = p_user_id
    AND um.is_deleted = false
    AND mp.purpose = p_purpose
    AND oc.expires_at > NOW()
    AND oc.used_at IS NULL
    ORDER BY oc.created_at DESC
    LIMIT 1;
    
    -- Check if user exists and has active challenge
    IF v_challenge_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found or no active OTP challenge exists',
            'status_code', 404
        );
    END IF;
    
    -- Check if maximum attempts reached
    IF v_challenge_record.attempts >= v_challenge_record.max_attempts THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Maximum verification attempts reached',
            'status_code', 400
        );
    END IF;
    
    -- Step 3: Verify OTP using HMAC-SHA256 (requires pgcrypto extension)
    -- Compute HMAC of the provided OTP code using the stored salt
    v_computed_hash := hmac(p_otp_code::bytea, v_challenge_record.otp_salt, 'sha256');
    
    -- Compare with stored hash using constant-time comparison
    v_is_valid := (v_computed_hash = v_challenge_record.otp_hash);
    
    -- Step 4: Update challenge based on verification result
    IF v_is_valid THEN
        -- Mark OTP as successfully used
        UPDATE global.otp_challenges 
        SET used_at = NOW(), updated_at = NOW()
        WHERE id = v_challenge_record.id;
        
        v_result := json_build_object(
            'success', true,
            'message', 'OTP verified successfully',
            'status_code', 200
        );
    ELSE
        -- Increment attempt count
        UPDATE global.otp_challenges 
        SET attempts = v_challenge_record.attempts + 1, updated_at = NOW()
        WHERE id = v_challenge_record.id;
        
        v_remaining_attempts := v_challenge_record.max_attempts - (v_challenge_record.attempts + 1);
        
        v_result := json_build_object(
            'success', false,
            'message', 'Invalid OTP code',
            'remaining_attempts', v_remaining_attempts,
            'status_code', 400
        );
    END IF;
    
    RETURN v_result;
    
END;
$function$
;
