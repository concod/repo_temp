import os
import asyncio
import aiopg
import time

from urllib.parse import quote
import logging
logging.basicConfig(filename='sync_error.txt', level=logging.ERROR,
format='%(asctime)s:%(levelname)s:%(message)s')

async def async_connect(config):
    dsn = f"postgresql://{config['db_user']}:{quote(config['db_pass'])}@{config['db_host']}:{config['db_port']}/{config['db_name']}"
    pool  = await aiopg.create_pool(dsn)
    return pool

async def close_connect(pool):
    if pool:
        pool.terminate()
        await pool.wait_closed()
    

async def sync_sp_util( sp_file , pool):
    async with pool.acquire() as conn:
        async with conn.cursor() as curs:
            if not os.path.isfile(sp_file):
                print(f"'{sp_file}' is not a valid a path.")
                return
            delete_path_commands = []
            with open(sp_file, encoding='utf8') as f:
                lines = f.readlines()
                content = " ".join(lines)
                for line in lines:
                    if line.lower().startswith("create or replace"):
                        delete_command = line.lower().replace("create or replace", "DROP").strip(" ")
                        delete_path_commands.append({"path":sp_file , "command": delete_command})
                try:
                    if delete_path_commands:
                        for obj in delete_path_commands:
                            await curs.execute(obj["command"])
                            print(f'Deleted the sp: {obj["path"]} with command : {obj["command"]} in db')
            
                except Exception as e:
                    error_msg = str(e).strip()
                    excluded_errors = ["does not exist","default", "duplicate key value violates unique constraint"]
                    # Log all errors except those included in excluded_errors
                    if not any(err in error_msg for err in excluded_errors):
                        logging.error(error_msg)
                finally:
                    await curs.execute(content)
                    print(f" synced file : {sp_file}")

async def sync_sp(config, sp_list):
    pool = await async_connect(config)
    batch_size = 20
    sp_list_len = len(sp_list)
    print('Total SP Count -> ' , sp_list_len)
    start_time = time.time()
    for idx in range(0 , sp_list_len, batch_size ):
        sp_batch = sp_list[idx: idx + batch_size]
        coro_res = await asyncio.gather(*[sync_sp_util(sp_file,pool) for sp_file in sp_batch], return_exceptions=True)
        for res in coro_res:
            if isinstance(res, Exception):
                logging.error(str(res))
    await close_connect(pool)
    end_time = time.time()
    print("Time elapsed: ", end_time - start_time, "seconds")
  