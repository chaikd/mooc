from database.repository.target_repository import TargetRepository


class TargetService:
    def __init__(self):
        self.repository = TargetRepository()

    def update_title(self):
        pass