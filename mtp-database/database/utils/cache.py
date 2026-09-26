import requests
from utils.constants import client_tenant_name_map, env_url_map, API_PREFIX

table_patterns_map = {
    "global.tenant_attribute_master": "TAM",
    "global.table_configurations": "TABLE_CONFIGURATION",
    "global.filter_configurations": "FC",
    "global.user_master": "UM",
    "global.keyboard_shortcut_actions": "Keyboard_Shortcut",
    "global.role_action_module_mapping": "ROLE_ACTION",
    "global.table_configurations_mapping": "TABLE_FIELDS",
    "global.user_preference_table_config":"USER_TABLE_FIELDS",
    "global.table_configurations": "TABLE_CONFIG_TC_CODE",
    "global.default_user_table_view_mapping": "DEFAULT_USER_TABLE_CONFIG_VIEWS",
    "global.application_master": "APPLICATION_NAME"
}

def get_url_prefix(client, env):
    return 'https://' + client_tenant_name_map[client] + env_url_map[env] + '.' + 'impactsmartsuite.com' + API_PREFIX

def invoke_clear_cache_api(client, env, exception_map):
    url_prefix = get_url_prefix(client= client, env= env)
    target_url = url_prefix + '/core/db-sync-event'
    payload = {
        "config_sync": {
            "identifiers": []
        }
    }

    for table in table_patterns_map:
        if not exception_map.get(table, False):
            payload["config_sync"]["identifiers"].append(table_patterns_map[table])

    response = requests.post(url = target_url, json = payload)
    print(f"called api: {target_url} with payload: {payload} with response {response}")