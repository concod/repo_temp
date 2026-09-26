class ConsoleFormatter:
    """Handles console output formatting with colors."""
    
    @staticmethod
    def red(*args) -> str:
        return f"\033[91m{' '.join(str(arg) for arg in args)}\033[0m"

    @staticmethod
    def green(*args) -> str:
        return f"\033[92m{' '.join(str(arg) for arg in args)}\033[0m"

    @staticmethod
    def yellow(*args) -> str:
        return f"\033[93m{' '.join(str(arg) for arg in args)}\033[0m"

    @staticmethod
    def blue(*args) -> str:
        return f"\033[94m{' '.join(str(arg) for arg in args)}\033[0m"

    @staticmethod
    def print_red(*args) -> None:
        print(ConsoleFormatter.red(*args))

    @staticmethod
    def print_green(*args) -> None:
        print(ConsoleFormatter.green(*args))

    @staticmethod
    def print_yellow(*args) -> None:
        print(ConsoleFormatter.yellow(*args))

    @staticmethod
    def print_blue(*args) -> None:
        print(ConsoleFormatter.blue(*args))

    @staticmethod
    def print(*args) -> None:
        print(*args) 

    @staticmethod
    def print_warning(*args) -> None:
        ConsoleFormatter.print_yellow(*args)
