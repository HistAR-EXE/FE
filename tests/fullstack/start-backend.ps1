$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$fixturePath = Join-Path $PSScriptRoot 'fixtures.sql'

Push-Location $repoRoot
try {
    if ($env:HISTAR_FULLSTACK_EXTERNAL_DB -ne '1') {
        & docker compose up -d --wait postgres
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL/pgvector did not become healthy.' }

        # Run Flyway without replaying the one-time bootstrap seed container. The
        # Playwright fixture below owns all domain rows needed by these gates.
        & docker compose run --rm --no-deps postgres-migrate
        if ($LASTEXITCODE -ne 0) { throw 'The existing Flyway migration stage failed.' }
    }

    if ($env:HISTAR_FULLSTACK_EXTERNAL_DB -eq '1') {
        $postgresContainer = if ($env:HISTAR_POSTGRES_CONTAINER) { $env:HISTAR_POSTGRES_CONTAINER } else { 'histar-postgres' }
        Get-Content -Raw -LiteralPath $fixturePath |
            & docker exec -i $postgresContainer psql -U timelens -d timelens -v ON_ERROR_STOP=1
    }
    else {
        Get-Content -Raw -LiteralPath $fixturePath |
            & docker compose exec -T postgres psql -U timelens -d timelens -v ON_ERROR_STOP=1
    }
    if ($LASTEXITCODE -ne 0) { throw 'The Playwright SQL fixture failed.' }
}
finally {
    Pop-Location
}

$env:MAIL_ENABLED = 'false'
$env:HISTORY_AI_ENABLED = 'false'
$env:SPRING_JPA_SHOW_SQL = 'false'
$env:FRONTEND_URL = 'http://127.0.0.1:5174'

Push-Location (Join-Path $repoRoot 'BE')
try {
    if ($env:OS -eq 'Windows_NT') {
        & .\mvnw.cmd spring-boot:run
    }
    else {
        & ./mvnw spring-boot:run
    }
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
