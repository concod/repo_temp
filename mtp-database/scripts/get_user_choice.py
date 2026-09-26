import os

class getUserChoice:

    def get_user_choice(self, available_list: list[str]) -> str:

        for choice in range(len(available_list)):
            print(f"{choice + 1}. {available_list[choice].split('/')[-1]}")

        user_input = int(input())

        return available_list[user_input - 1]

    def get_client_from_user(self, non_client_folders: set, path: str = os.getcwd()+'/database') -> str:
        client_list = []
        for filename in os.listdir(path):
            file_path = os.path.join(path, filename)
            if os.path.isdir(file_path) and filename.casefold() not in non_client_folders:
                client_list.append(file_path)

        print("Enter the number only: \n")

        client_list.append("skip")
        client_list.append("exit")

        return self.get_user_choice(client_list)
    
    def get_liquibase_properties_from_user(self, path = os.getcwd()) -> str:
        properties_files = []
        for file in os.listdir(path):
            if os.path.isfile(os.path.join(path, file)):
                if ".properties" in file and "liquibase" in file:
                    properties_files.append(os.path.join(path, file))

        print("Enter the number only: \n")

        properties_files.append("manually")

        return self.get_user_choice(properties_files)