import os

class pathModifier:
    def get_absolute_path(path_input: str) -> str:
        path_input_list = path_input.split('/')
        path_so_far_list = os.getcwd().split('/')

        if path_input_list[0] in path_so_far_list:
            for ind in range(len(path_so_far_list)-1, -1, -1):
                if path_input_list[0] == path_so_far_list[ind]:
                    index = ind
                    break
            path_output_list = path_so_far_list[:index] + (path_input_list)
            
        else:
            path_output_list = path_so_far_list + path_input_list

        return '/'.join(path_output_list)
