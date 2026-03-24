#!/usr/bin/env bash
# Wipe all session/card/concept data. Leaves profiles and auth intact.
# Usage: bash supabase/clear.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$SCRIPT_DIR/server/.env"

API="$SUPABASE_URL/rest/v1"
AUTH="apikey: $SUPABASE_SERVICE_ROLE_KEY"
ROLE="Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Delete in FK-safe order
tables=(dedup_log review_history concept_links cards concepts sessions)

for table in "${tables[@]}"; do
  # Pick a column that exists on every row to match all rows
  if [ "$table" = "concept_links" ]; then
    filter="concept_id_1=not.is.null"
  else
    filter="id=not.is.null"
  fi

  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X DELETE "$API/$table?$filter" \
    -H "$AUTH" \
    -H "$ROLE" \
    -H "Prefer: return=minimal")

  if [ "$status" = "204" ] || [ "$status" = "200" ]; then
    echo "cleared $table"
  else
    echo "FAILED to clear $table (HTTP $status)" >&2
    exit 1
  fi
done

echo "done"
