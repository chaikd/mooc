import os

def get_root_path():
    abs_file_path = os.path.abspath(__file__)
    dir_path = os.path.dirname(abs_file_path)
    project_root = os.path.dirname(dir_path)
    return project_root

def get_abs_path(file_path: str) -> str:
    return os.path.join(get_root_path(), file_path)

if __name__ == '__main__':
    print(get_abs_path('test.txt'))
