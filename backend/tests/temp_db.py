"""テストで一時的な SQLite ファイルを使うための補助"""

import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock


def use_temp_database(test: unittest.TestCase) -> Path:
    """テストのあいだだけ DATABASE_PATH を一時ファイルに向け、そのパスを返す"""
    tmp = tempfile.TemporaryDirectory()
    test.addCleanup(tmp.cleanup)
    path = Path(tmp.name) / "test.db"
    patcher = mock.patch.dict(os.environ, {"DATABASE_PATH": str(path)})
    patcher.start()
    test.addCleanup(patcher.stop)
    return path
