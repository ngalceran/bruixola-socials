import os
import tempfile

os.environ["TRANSCRIPTOR_MOTOR"] = "simulat"
os.environ["TRANSCRIPTOR_DIR_TEMPORAL"] = tempfile.mkdtemp(prefix="transcriptor-test-")
