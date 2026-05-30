# API Router Production Database

The local default still uses H2 plus `schema.sql` so existing development data keeps working.
For production, use Flyway migrations and disable Spring SQL init.

## MySQL Example

```properties
CIPHERTOOL_DB_URL=jdbc:mysql://127.0.0.1:3306/ciphertool?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
CIPHERTOOL_DB_DRIVER=com.mysql.cj.jdbc.Driver
CIPHERTOOL_DB_USERNAME=ciphertool
CIPHERTOOL_DB_PASSWORD=change-me
CIPHERTOOL_SQL_INIT_MODE=never
CIPHERTOOL_FLYWAY_ENABLED=true
```

## PostgreSQL Example

```properties
CIPHERTOOL_DB_URL=jdbc:postgresql://127.0.0.1:5432/ciphertool
CIPHERTOOL_DB_DRIVER=org.postgresql.Driver
CIPHERTOOL_DB_USERNAME=ciphertool
CIPHERTOOL_DB_PASSWORD=change-me
CIPHERTOOL_SQL_INIT_MODE=never
CIPHERTOOL_FLYWAY_ENABLED=true
```

## Existing H2/Internal Test Database

Leave these unset for local development:

```properties
CIPHERTOOL_SQL_INIT_MODE=always
CIPHERTOOL_FLYWAY_ENABLED=false
```

## Migration Notes

- New production databases should start with Flyway enabled from the first launch.
- Do not enable Flyway against a partially initialized production database without taking a backup.
- If an existing database was already initialized by `schema.sql`, migrate it manually or baseline it deliberately after confirming all columns exist.
- Keep future schema changes as new files under `backendcipher/src/main/resources/db/migration`.
