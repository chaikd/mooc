from langgraph.checkpoint.postgres import PostgresSaver
class Checkpoint:
  saver = None
  def __init__(self):
    super().__init__()
  def initialize(self, database):
    saver = PostgresSaver(database)
    saver.setup()
    self.saver = saver

chat_checkpoint = Checkpoint()