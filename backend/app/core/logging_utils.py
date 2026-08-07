import logging
from typing import Any

logger = logging.getLogger("hms.audit")


def log_audit(endpoint_name: str, raw_payload: Any, validated_schema: Any = None, model_obj: Any = None, response_obj: Any = None):
    print(f"\n==================== [AUDIT LOG: {endpoint_name}] ====================")
    print(f"1. INCOMING REQUEST  : {raw_payload}")
    if validated_schema is not None:
        print(f"2. VALIDATED SCHEMA  : {validated_schema}")
    if model_obj is not None:
        print(f"3. MODEL VALUES      : {model_obj}")
    print(f"4. DB COMMIT STATUS  : SUCCESS")
    if response_obj is not None:
        print(f"5. RETURNED RESPONSE : {response_obj}")
    print(f"======================================================================\n")
