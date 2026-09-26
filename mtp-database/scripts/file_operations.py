import os
from collections import deque

class fileOperations:

    def find_files_util(self,path: str, type: str, files_list: list[str]) -> None:
        directory_queue = deque()
        directory_queue.append(path)

        while directory_queue:
            folder = directory_queue.popleft()
            for filename in os.listdir(folder):
                path = os.path.join(folder, filename)
                if os.path.isdir(path):
                    directory_queue.append(path)

                elif path.endswith(f".{type}"):
                    files_list.append(os.path.join(folder, filename))


    def find_files(self, path: str, type: str) -> list[str]:
        files_list: list[str] = []

        if os.path.isfile(path):
            if path.endswith(f".{type}"):
                files_list.append(path)

        else:
            self.find_files_util(path, type, files_list)

        return files_list
    
    def insert_before_specific_line(self, file: str, line: str, target_line: str):
        with open(file, "r") as f:
            lines = f.readlines()

        for ind in range(len(lines)):
            if target_line in lines[ind]:
                break

        lines.insert(ind, line + '\n')

        with open(file, "w") as f:
            f.writelines(lines)

    def replace_phrase_in_file(self, input_file: str, output_file: str,
                               target_phrase: str, current_phrase: str) -> None:
        
        input_sql_file = open(input_file, "rt")
        output_sql_file = open(output_file, "wt")

        for line in input_sql_file:
            output_sql_file.write(line.replace(current_phrase, target_phrase))

        input_sql_file.close()
        output_sql_file.close()

    
    def is_file(self, path: str) -> bool:
        return os.path.exists(path)
    
    def delete_file(self, path: str):
        os.remove(path)

    def delete_list_of_files(self,file_list: list[str]):
        for file in file_list:
            self.delete_file(file)
        