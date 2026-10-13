try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass

# Bypass minimum MariaDB version check and disable RETURNING syntax for older MariaDB/XAMPP
from django.db.backends.base.base import BaseDatabaseWrapper
from django.db.backends.mysql.features import DatabaseFeatures

BaseDatabaseWrapper.check_database_version_supported = lambda self: None
DatabaseFeatures.can_return_columns_from_insert = property(lambda self: False)
